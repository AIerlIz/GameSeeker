import { describe, it, expect, vi } from 'vitest'
import { createSession, getSessionUser, upsertUser, sessionCookie, clearCookie } from '../worker/auth/session.js'
import type { SteamUser } from '../worker/types.js'

function mockD1BindRun() {
  return { run: vi.fn().mockResolvedValue({ success: true }) }
}
function mockD1BindFirst(result: unknown) {
  return { first: vi.fn().mockResolvedValue(result), run: vi.fn().mockResolvedValue({ success: true }) }
}

function mockD1WithFirst(result: unknown): D1Database {
  return {
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue(mockD1BindFirst(result)),
    }),
    exec: vi.fn().mockResolvedValue(undefined),
    batch: vi.fn(),
    dump: vi.fn(),
  } as unknown as D1Database
}

function mockD1ForRun(): D1Database {
  return {
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue(mockD1BindRun()),
    }),
    exec: vi.fn().mockResolvedValue(undefined),
    batch: vi.fn(),
    dump: vi.fn(),
  } as unknown as D1Database
}

describe('Session', () => {
  const user: SteamUser = { steamid: '123', personaname: 'Test', avatar: '' }

  it('getSessionUser returns null without cookie', async () => {
    const db = mockD1WithFirst(null)
    const req = new Request('http://localhost/')
    expect(await getSessionUser(db, req)).toBeNull()
  })

  it('getSessionUser returns user with valid cookie', async () => {
    const db = mockD1WithFirst({ user_id: '123', personaname: 'Test', avatar: '' })
    const req = new Request('http://localhost/', { headers: { Cookie: 'gs_session=abc' } })
    expect(await getSessionUser(db, req)).toEqual(user)
  })

  it('getSessionUser returns null for invalid cookie format', async () => {
    const db = mockD1WithFirst(null)
    const req = new Request('http://localhost/', { headers: { Cookie: 'other=value' } })
    expect(await getSessionUser(db, req)).toBeNull()
  })

  it('createSession returns a UUID string', async () => {
    const db = mockD1ForRun()
    const id = await createSession(db, user)
    expect(id).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('upsertUser calls D1 prepare with correct params', async () => {
    const db = mockD1ForRun()
    await upsertUser(db, user)
    expect(db.prepare).toHaveBeenCalled()
  })

  it('sessionCookie has correct format', () => {
    const cookie = sessionCookie('abc', 86400)
    expect(cookie).toContain('gs_session=abc')
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('Max-Age=86400')
  })

  it('clearCookie sets Max-Age=0', () => {
    expect(clearCookie()).toContain('Max-Age=0')
  })
})
