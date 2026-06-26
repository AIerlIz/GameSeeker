import type { SteamUser } from '../types.js'

const SESSION_TTL = 7 * 24 * 60 * 60

export async function createSession(db: D1Database, user: SteamUser): Promise<string> {
  const sessionId = crypto.randomUUID()
  const now = Math.floor(Date.now() / 1000)
  await db.prepare(
    'INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET user_id=excluded.user_id, expires_at=excluded.expires_at'
  ).bind(sessionId, user.steamid, now, now + SESSION_TTL).run()
  return sessionId
}

export async function getSessionUser(db: D1Database, request: Request): Promise<SteamUser | null> {
  const cookie = request.headers.get('Cookie') || ''
  const match = cookie.match(/gs_session=([^;]+)/)
  if (!match) return null
  const sessionId = match[1]
  const row = await db.prepare(
    'SELECT s.user_id, u.personaname, u.avatar FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.id = ? AND s.expires_at > ?'
  ).bind(sessionId, Math.floor(Date.now() / 1000)).first<{ user_id: string; personaname: string; avatar: string }>()
  return row ? { steamid: row.user_id, personaname: row.personaname, avatar: row.avatar } : null
}

export async function upsertUser(db: D1Database, user: SteamUser): Promise<void> {
  const now = Math.floor(Date.now() / 1000)
  await db.prepare(
    'INSERT INTO users (id, personaname, avatar, created_at, last_login) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET personaname=excluded.personaname, avatar=excluded.avatar, last_login=excluded.last_login'
  ).bind(user.steamid, user.personaname, user.avatar, now, now).run()
}

export function sessionCookie(sessionId: string, maxAge?: number): string {
  return `gs_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge ?? SESSION_TTL}`
}

export function clearCookie(): string {
  return 'gs_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
}
