import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestUser, deleteTestUsers, cookieHeaderFor, type TestUser } from '../helpers/testUser'

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3000'

let zappa: TestUser

beforeAll(async () => {
  zappa = await createTestUser('Zappa Zweitname')
})

afterAll(async () => {
  await deleteTestUsers()
})

// serverSupabaseUser() liest ausschliesslich den Session-Cookie (siehe
// server/utils/authUser.ts, tests/api/catalogItemsAuth.test.ts und
// tests/api/gear.test.ts) - ein Bearer-Token (wie im Task-Brief vorgeschlagen)
// wuerde hier still den anonymen Pfad ausueben statt echt zu scheitern oder
// zu bestehen. Deshalb ueber einen echten, wie im Browser gesetzten Cookie
// (cookieHeaderFor()) statt per Authorization-Header.
async function search(query: string, user?: TestUser): Promise<any> {
  const headers: Record<string, string> = {}
  if (user) {
    headers.Cookie = await cookieHeaderFor(user.email)
  }
  const response = await fetch(`${BASE}/api/search?q=${encodeURIComponent(query)}`, { headers })
  expect(response.ok).toBe(true)
  return response.json()
}

describe('GET /api/search', () => {
  it('findet Equipment ohne Login', async () => {
    const body = await search('ac30')
    expect(body.catalog[0].name).toBe('AC30')
  })

  it('verarbeitet eine ganze Frage', async () => {
    // "AC30" und "Wer hat hier einen AC30?" sind dasselbe Problem.
    const body = await search('Wer hat hier einen AC30?')
    expect(body.catalog[0].name).toBe('AC30')
  })

  it('liefert ohne Login keine Personen', async () => {
    const body = await search('Zappa')
    expect(body.people).toEqual([])
  })

  it('findet Personen mit Login', async () => {
    const body = await search('Zappa', zappa)
    expect(body.people.some((p: any) => p.userId === zappa.id)).toBe(true)
  })

  it('liefert bei leerer Eingabe leere Listen', async () => {
    const body = await search('')
    expect(body.catalog).toEqual([])
    expect(body.people).toEqual([])
  })
})
