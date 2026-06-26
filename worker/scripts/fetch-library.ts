import { KV_KEYS, getSteamId, getOwnedGames, fetchSteamDetails, fetchReview, batchFetch, filterLibraryGames, buildGamesOutput, getConfig } from '../lib/steam.js'

export async function fetchLibrary(env: Env): Promise<void> {
  const steamApiKey = await getConfig(env, 'STEAM_API_KEY')
  const steamUserId = await getConfig(env, 'STEAM_USER_ID')
  const lang = await getConfig(env, 'STEAM_LANG', 'schinese')

  console.log('获取 Steam ID...')
  const steamId = await getSteamId(steamApiKey, steamUserId)
  if (!steamId) throw new Error('获取 Steam ID 失败')

  console.log('获取游戏库...')
  const { games: owned, count: totalCount } = await getOwnedGames(steamApiKey, steamId)
  if (!owned.length) throw new Error('游戏库为空')
  console.log(`共 ${totalCount} 款游戏`)

  console.log(`获取游戏详情 (${owned.length} 款)...`)
  const appids = owned.map(g => g.appid)
  const playtimeMap: Record<number, number> = {}
  for (const g of owned) playtimeMap[g.appid] = g.playtime_hours

  const detailMapRaw = await batchFetch(appids, aid => fetchSteamDetails(aid, lang), { maxWorkers: 20, delay: 0.2 })
  const detailMap = detailMapRaw as Record<number, Record<string, unknown>>

  console.log(`获取评测数据 (${Object.keys(detailMap).length} 款)...`)
  const reviewAppids = Object.keys(detailMap).map(Number)
    .sort((a, b) => (playtimeMap[b] || 0) - (playtimeMap[a] || 0))
    .slice(0, 50)
  const reviewMap = await batchFetch(reviewAppids, aid => fetchReview(aid, lang), { maxWorkers: 10, delay: 0.2 })

  console.log('合并数据...')
  const libraryGames = owned.map(g => ({
    appid: g.appid,
    name: (detailMap[g.appid]?.name as string) || g.name,
    playtime_hours: g.playtime_hours,
    header_image: (detailMap[g.appid]?.header_image as string) || '',
    short_description: (detailMap[g.appid]?.short_description as string) || '',
    genres: (detailMap[g.appid]?.genres as string[]) || [],
    screenshots: (detailMap[g.appid]?.screenshots as string[]) || [],
    review: (reviewMap[g.appid] as Record<string, unknown>) || null,
  }))

  const detailTypeMap: Record<number, { type?: string }> = {}
  for (const aid of Object.keys(detailMap).map(Number)) {
    detailTypeMap[aid] = { type: detailMap[aid]?.type as string | undefined }
  }

  const { games: filteredGames, softwareCount, filteredCount } = filterLibraryGames(libraryGames, detailTypeMap)
  if (softwareCount > 0) console.log(`过滤掉 ${softwareCount} 款非游戏`)
  if (filteredCount > 0) console.log(`过滤掉 ${filteredCount} 款低时长游戏`)

  const output = buildGamesOutput(filteredGames)
  await env.KV.put(KV_KEYS.DATA_LIBRARY, JSON.stringify(output))
  const totalPlaytime = filteredGames.reduce((s, g) => s + (g.playtime_hours || 0), 0)
  console.log(`✓ library.json 已生成 (${filteredGames.length} 款游戏, ${totalPlaytime.toFixed(1)} 小时)`)
}

export async function syncAllUsers(env: Env): Promise<{ userId: string; gameCount: number; error?: string }[]> {
  const configRow = await env.DB.prepare('SELECT value FROM config WHERE key = ?').bind('STEAM_API_KEY').first<{ value: string }>()
  if (!configRow?.value) { console.error('STEAM_API_KEY not configured'); return [] }
  const apiKey = configRow.value
  const users = await env.DB.prepare('SELECT id FROM users').all<{ id: string }>()
  const results: { userId: string; gameCount: number; error?: string }[] = []
  for (const u of (users.results || [])) {
    try {
      const { games } = await getOwnedGames(apiKey, u.id)
      if (!games.length) { results.push({ userId: u.id, gameCount: 0 }); continue }
      const appids = games.map(g => g.appid)
      const detailMap = await batchFetch(appids, aid => fetchSteamDetails(aid, 'schinese'), { maxWorkers: 20, delay: 0.2 })
      const top50 = games.sort((a, b) => (b.playtime_forever || 0) - (a.playtime_forever || 0)).slice(0, 50)
      const reviewMap = await batchFetch(top50.map(g => g.appid), aid => fetchReview(aid, 'schinese'), { maxWorkers: 10, delay: 0.2 })
      const stmts = games.map(g => {
        const d = detailMap[g.appid] as Record<string, unknown> | undefined
        const r = reviewMap[g.appid] as Record<string, unknown> | undefined
        return env.DB.prepare(`INSERT INTO library (user_id,appid,name,playtime_hours,playtime_forever,header_image,genres,release_date,review_score,updated_at)
          VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id,appid) DO UPDATE SET name=excluded.name,playtime_hours=excluded.playtime_hours,playtime_forever=excluded.playtime_forever,header_image=excluded.header_image,genres=excluded.genres,release_date=excluded.release_date,review_score=excluded.review_score,updated_at=excluded.updated_at`)
          .bind(u.id, g.appid, (d?.name as string) || g.name, ((g.playtime_forever || 0) / 60), g.playtime_forever || 0, (d?.header_image as string) || '', JSON.stringify(d?.genres || []), (d?.release_date as string) || '', (r?.score as number) || 0, Math.floor(Date.now() / 1000))
      })
      if (stmts.length) await env.DB.batch(stmts)
      results.push({ userId: u.id, gameCount: games.length })
    } catch (e) { results.push({ userId: u.id, gameCount: 0, error: String(e) }) }
  }
  return results
}
