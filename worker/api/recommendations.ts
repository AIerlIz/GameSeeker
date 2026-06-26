import { getSessionUser } from '../auth/session.js'

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json;charset=UTF-8' } })
}

export async function handleRecommendations(env: Env, request: Request): Promise<Response> {
  const user = await getSessionUser(env.DB, request)
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401)

  const rows = await env.DB.prepare(
    'SELECT * FROM recommendations WHERE user_id = ? ORDER BY score DESC LIMIT 30'
  ).bind(user.steamid).all<Record<string, unknown>>()

  const recs = (rows.results || []).map(r => ({
    appid: r.appid as number, name: r.name as string,
    reason: r.reason as string, score: r.score as number,
    tags: JSON.parse(r.tags as string || '[]'),
  }))
  return jsonResponse({ recommendations: recs })
}
