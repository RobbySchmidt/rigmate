import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { adminClient } from '../helpers/supabase'
import { createTestUser, deleteTestUsers, cookieHeaderFor, type TestUser } from '../helpers/testUser'

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3000'
const admin = adminClient()

let viewer: TestUser
let cookie = ''

/** Rüdiger teilt kein einziges Gerät — seine echte Antwort ist 0. */
let lonelyId = ''
let lonelyGearCount = 0
/** Jemand, der den Klon Centaur spielt — den teilen mehrere. */
let sharedId = ''
let sharedExpected = 0

/**
 * serverSupabaseUser() liest ausschliesslich den Session-Cookie. Ein
 * Bearer-Token würde hier still den anonymen Pfad prüfen, statt laut zu
 * scheitern — deshalb der Cookie-Helfer aus tests/helpers/testUser.ts.
 */
function signedInFetch(url: string): Promise<Response> {
  return fetch(url, { headers: { Cookie: cookie } })
}

/**
 * Rechnet die Kollegenzahl bewusst ANDERS aus als die Route: einmal alle
 * Rigs holen, je Besitzer eine Menge seiner Katalog-Einträge bauen, dann
 * zählen, wessen Menge die des Gesuchten schneidet. Die Route stellt
 * stattdessen zwei gefilterte Abfragen. Wäre hier dieselbe Abfrageform
 * nachgebaut, würde der Test denselben Denkfehler mitmachen statt ihn zu
 * finden.
 */
async function expectedMatesFor(ownerId: string): Promise<number> {
  const { data, error } = await admin.from('gear_items').select('owner_id, catalog_item_id')
  if (error) throw new Error(`Rigs laden: ${error.message}`)

  const byOwner = new Map<string, Set<string>>()
  for (const row of data!) {
    const set = byOwner.get(row.owner_id) ?? new Set<string>()
    set.add(row.catalog_item_id)
    byOwner.set(row.owner_id, set)
  }

  const mine = byOwner.get(ownerId) ?? new Set<string>()
  let count = 0
  for (const [otherId, theirs] of byOwner) {
    if (otherId === ownerId) continue
    for (const catalogItemId of theirs) {
      if (mine.has(catalogItemId)) {
        count += 1
        break
      }
    }
  }
  return count
}

beforeAll(async () => {
  // Ein beliebiger Angemeldeter — er hat selbst kein Rig und verschiebt die
  // gezählten Zahlen deshalb nicht.
  viewer = await createTestUser('Kollegenzaehler')
  cookie = await cookieHeaderFor(viewer.email)

  const { data: lonely, error: lonelyError } = await admin
    .from('profiles')
    .select('id')
    .like('display_name', 'R%hrenglut%')
    .maybeSingle()
  if (lonelyError) throw new Error(`Röhrenglut suchen: ${lonelyError.message}`)
  if (!lonely) throw new Error('Röhrenglut Rüdiger fehlt — lief `yarn seed:users`?')
  lonelyId = lonely.id

  const { data: lonelyGear, error: lonelyGearError } = await admin
    .from('gear_items')
    .select('catalog_item_id')
    .eq('owner_id', lonelyId)
  if (lonelyGearError) throw new Error(`Rüdigers Rig laden: ${lonelyGearError.message}`)
  lonelyGearCount = lonelyGear!.length

  const { data: klon, error: klonError } = await admin
    .from('catalog_items')
    .select('id')
    .eq('name', 'Centaur')
    .maybeSingle()
  if (klonError) throw new Error(`Centaur suchen: ${klonError.message}`)
  if (!klon) throw new Error('Centaur fehlt im Katalog — lief `yarn seed:catalog`?')

  const { data: owners, error: ownersError } = await admin
    .from('gear_items')
    .select('owner_id')
    .eq('catalog_item_id', klon.id)
  if (ownersError) throw new Error(`Centaur-Besitzer laden: ${ownersError.message}`)
  // Sortiert, damit der Test bei jedem Lauf denselben Menschen prüft —
  // PostgREST gibt ohne order by keine zugesicherte Reihenfolge zurück.
  const ids = [...new Set(owners!.map((row) => row.owner_id as string))].sort()
  if (ids.length === 0) throw new Error('Niemand spielt den Centaur — lief `yarn seed:users`?')
  sharedId = ids[0]!

  sharedExpected = await expectedMatesFor(sharedId)
})

afterAll(async () => {
  await deleteTestUsers()
})

describe('GET /api/profile/:id/mates', () => {
  it('prüft eine Erwartung, die überhaupt scheitern kann', () => {
    // Ohne diese beiden Wachposten wäre der Test unten aus dem falschen
    // Grund grün: 0 gegen 0 verglichen, und Rüdigers Null käme aus einem
    // leeren Rig statt aus fehlenden Überschneidungen.
    expect(sharedExpected).toBeGreaterThan(0)
    expect(lonelyGearCount).toBeGreaterThan(0)
  })

  it('weist Nicht-Angemeldete ab', async () => {
    const response = await fetch(`${BASE}/api/profile/${lonelyId}/mates`)
    expect(response.status).toBe(401)
  })

  it('liefert die echte Null für jemanden, der nichts teilt', async () => {
    const response = await signedInFetch(`${BASE}/api/profile/${lonelyId}/mates`)
    expect(response.status).toBe(200)
    expect((await response.json()).mateCount).toBe(0)
  })

  it('zählt genau die Personen, die Equipment teilen', async () => {
    const response = await signedInFetch(`${BASE}/api/profile/${sharedId}/mates`)
    expect(response.status).toBe(200)
    // Genauigkeit, kein toBeGreaterThanOrEqual: die erwartete Zahl steht
    // oben aus den echten Daten fest.
    expect((await response.json()).mateCount).toBe(sharedExpected)
  })

  it('unterscheidet ein unbekanntes Profil von einer echten Null', async () => {
    // Sonst beantwortet eine vertippte Id die Frage mit einer glaubwürdigen 0.
    const response = await signedInFetch(`${BASE}/api/profile/${crypto.randomUUID()}/mates`)
    expect(response.status).toBe(404)
  })
})
