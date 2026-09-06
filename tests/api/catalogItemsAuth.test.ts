import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { adminClient } from '../helpers/supabase'
import { createTestUser, deleteTestUsers, cookieHeaderFor, type TestUser } from '../helpers/testUser'

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3000'
const admin = adminClient()

let author: TestUser
const createdCatalogItemIds: string[] = []
const createdBrandIds: string[] = []

beforeAll(async () => {
  author = await createTestUser('Cookie Auth Autor')
})

afterAll(async () => {
  // Aufraeumen, damit ein Testlauf keine dauerhaften Katalog-Eintraege auf
  // der geteilten, gehosteten Instanz hinterlaesst (anders als Testnutzer
  // gibt es dafuer keinen eigenen Sweep wie deleteTestUsers()).
  if (createdCatalogItemIds.length > 0) {
    await admin.from('catalog_items').delete().in('id', createdCatalogItemIds)
  }
  if (createdBrandIds.length > 0) {
    await admin.from('brands').delete().in('id', createdBrandIds)
  }
  await deleteTestUsers()
})

describe('POST /api/catalog/items - Authentifizierung ueber echten Browser-Cookie', () => {
  // Regressionstest fuer Fix-Runde 1 von Task 14: @nuxtjs/supabase liefert
  // serverseitig das dekodierte JWT (claims.sub), kein User-Objekt
  // (claims.id) - server/utils/authUser.ts normalisiert das jetzt. Ein Test,
  // der stattdessen per Bearer-Token anfragt (wie
  // tests/api/recommendations.test.ts es fuer seine eigenen Gruende tut),
  // wuerde den Cookie-Pfad nie ausueben und genau diesen Fehler nicht
  // finden - deshalb hier bewusst ueber einen echten, wie im Browser
  // gesetzten Cookie (siehe cookieHeaderFor() in tests/helpers/testUser.ts).
  it('schreibt created_by als die echte Nutzer-Id statt eines undefined/null-Werts', async () => {
    const cookie = await cookieHeaderFor(author.email)
    const suffix = crypto.randomUUID().slice(0, 8)

    const response = await fetch(`${BASE}/api/catalog/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        brand: `Regression-Marke-${suffix}`,
        name: `Regression-Modell-${suffix}`,
        categoryId: 'pedal',
      }),
    })
    expect(response.ok).toBe(true)
    const { id } = await response.json()
    createdCatalogItemIds.push(id)

    const { data, error } = await admin.from('catalog_items').select('created_by, brand_id').eq('id', id).single()
    expect(error).toBeNull()
    createdBrandIds.push(data!.brand_id)
    // Vor dem Fix waere das entweder null (das leere `created_by` liess sich
    // ohne NOT-NULL-Constraint klaglos einfuegen) oder der Insert waere
    // erst gar nicht durchgekommen - nie die echte Nutzer-Id.
    expect(data!.created_by).toBe(author.id)
  })

  it('verlangt eine Anmeldung', async () => {
    const response = await fetch(`${BASE}/api/catalog/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brand: 'Ohne Anmeldung', name: 'Sollte scheitern', categoryId: 'pedal' }),
    })
    expect(response.status).toBe(401)
  })
})
