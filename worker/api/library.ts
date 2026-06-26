import { getSessionUser } from '../auth/session.js'

interface LibraryGame {
  appid: number
  name: string
  playtime_hours: number
  header_image: string
  genres: string[]
  release_date: string
  review_score: number
}

export async function handleLibrary(env: Env, request: Request): Promise<Response> {
  const user = await getSessionUser(env.DB, request)
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401)

  const url = new URL(request.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1)
  const sort = url.searchParams.get('sort') || 'playtime'
  const q = url.searchParams.get('q') || ''
  const limit = 50
  const offset = (page - 1) * limit

  let orderBy = 'playtime_hours DESC'
  if (sort === 'name') orderBy = 'name ASC'
  if (sort === 'recent') orderBy = 'updated_at DESC'

  let where = 'user_id = ?'
  const params: unknown[] = [user.steamid]
  if (q) { where += ' AND name LIKE ?'; params.push(`%${q.replace(/[%_]/g, '\\$&')}%`) }

  const countRow = await env.DB.prepare(`SELECT COUNT(*) as total FROM library WHERE ${where}`)
    .bind(...params).first<{ total: number }>()
  const total = countRow?.total || 0

  const rows = await env.DB.prepare(`SELECT * FROM library WHERE ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`)
    .bind(...params, limit, offset).all<Record<string, unknown>>()

  const games: LibraryGame[] = (rows.results || []).map(r => ({
    appid: r.appid as number, name: r.name as string,
    playtime_hours: r.playtime_hours as number, header_image: r.header_image as string,
    genres: JSON.parse(r.genres as string || '[]'), release_date: r.release_date as string,
    review_score: r.review_score as number,
  }))

  return jsonResponse({ games, total, page })
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json;charset=UTF-8' } })
}
