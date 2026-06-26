import { initDB } from '../../db/index.js'

const TTL = 1800 // 30 minutes

export interface SearchResultItem { appid: number; name: string }
export interface SessionState { search?: { results: SearchResultItem[]; query: string; currentPage: number; totalPages: number; isSteamSearch: boolean } }

export async function getSession(db: D1Database, chatId: number): Promise<SessionState> {
  await initDB(db)
  const now = Math.floor(Date.now() / 1000)
  const row = await db.prepare('SELECT state FROM bot_sessions WHERE chat_id=? AND expires_at > ?')
    .bind(String(chatId), now).first<{ state: string }>()
  if (!row) return {}
  try { return JSON.parse(row.state) } catch { return {} }
}

export async function saveSession(db: D1Database, chatId: number, state: SessionState): Promise<void> {
  await initDB(db)
  const now = Math.floor(Date.now() / 1000)
  await db.prepare('INSERT OR REPLACE INTO bot_sessions (chat_id, state, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .bind(String(chatId), JSON.stringify(state), now, now + TTL).run()
}

export async function clearSession(db: D1Database, chatId: number): Promise<void> {
  await db.prepare('DELETE FROM bot_sessions WHERE chat_id=?').bind(String(chatId)).run()
}
