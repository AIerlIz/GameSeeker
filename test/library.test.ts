import { describe, it, expect, vi } from 'vitest'

function mockD1Library(total: number, results: Array<Record<string, unknown>>): D1Database {
  return {
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue({ total }),
        all: vi.fn().mockResolvedValue({ results }),
      }),
    }),
    exec: vi.fn(),
    batch: vi.fn(),
    dump: vi.fn(),
  } as unknown as D1Database
}

describe('GET /api/library', () => {
  it('returns 401 without session cookie', async () => {
    const { handleLibrary } = await import('../worker/api/library.js')
    const env = { DB: mockD1Library(0, []) } as unknown as Env
    const resp = await handleLibrary(env, new Request('http://localhost/api/library'))
    expect(resp.status).toBe(401)
  })
})
