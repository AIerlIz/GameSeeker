import { fetchSteamDetails, fetchReview, getConfig } from '../lib/steam.js';

export async function fetchSteam(env) {
  const lang = await getConfig(env, 'STEAM_LANG', 'schinese');

  const gamesData = await env.KV.get('data:games', 'json');
  const existingData = await env.KV.get('data:games_detail', 'json');

  const existingDetails = {};
  let totalOwned = 0;
  if (existingData?.games) {
    for (const g of existingData.games) {
      existingDetails[g.appid] = g;
    }
    totalOwned = existingData.total_owned || 0;
  }

  if (!gamesData?.games?.length) {
    console.log('games.json 为空，没有新游戏需要获取详情');
    return;
  }

  const appidInfo = {};
  for (const item of gamesData.games) {
    if (typeof item === 'object' && item.appid) {
      if (!existingDetails[item.appid]) {
        appidInfo[item.appid] = { reason: item.reason || '', rrf_score: item.rrf_score || 0 };
      }
    }
  }

  console.log(`已有详情: ${Object.keys(existingDetails).length} 款, 需要获取: ${Object.keys(appidInfo).length} 款`);
  if (!Object.keys(appidInfo).length) return;

  const newDetails = {};
  const entries = Object.entries(appidInfo);
  for (let i = 0; i < entries.length; i++) {
    const [aid, info] = entries[i];
    try {
      const result = await fetchSteamDetails(parseInt(aid), lang);
      if (result) {
        if (info.reason) result.reason = info.reason;
        if (info.rrf_score) result.rrf_score = info.rrf_score;
        result.review = await fetchReview(parseInt(aid), lang);
        newDetails[result.appid] = result;
        console.log(`  [${i + 1}/${entries.length}] ✓ ${result.name}`);
      }
    } catch (e) {
      console.log(`  ✗ appid=${aid}: ${e}`);
    }
  }

  const allGames = [...Object.values(existingDetails), ...Object.values(newDetails)];
  await env.KV.put('data:games_detail', JSON.stringify({ games: allGames, total_owned: totalOwned }));
  console.log(`✓ games_detail 已更新 (${allGames.length} 款, 新增 ${Object.keys(newDetails).length} 款)`);
}
