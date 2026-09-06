import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { adminClient } from '../helpers/supabase'
import { createTestUser, deleteTestUsers, type TestUser } from '../helpers/testUser'

const admin = adminClient()

let alice: TestUser
let bob: TestUser
let stratId: string
let klonId: string
let slinkyId: string

async function catalogId(name: string): Promise<string> {
  const { data } = await admin.from('catalog_items').select('id').eq('name', name).single()
  return data!.id
}

beforeAll(async () => {
  alice = await createTestUser('Alice Ampeg')
  bob = await createTestUser('Bob Bassman')
  stratId = await catalogId('Stratocaster')
  klonId = await catalogId('Centaur')
  slinkyId = await catalogId('Regular Slinky')

  await alice.client.from('gear_items').insert([
    { owner_id: alice.id, catalog_item_id: stratId },
    { owner_id: alice.id, catalog_item_id: klonId },
  ])
  await bob.client.from('gear_items').insert({ owner_id: bob.id, catalog_item_id: stratId })
  await alice.client.from('preferences').insert({ user_id: alice.id, catalog_item_id: slinkyId })
  await bob.client.from('wishlist_items').insert({ user_id: bob.id, catalog_item_id: klonId })
})

afterAll(async () => {
  await deleteTestUsers()
})

describe('user_catalog_entries', () => {
  it('fasst alle drei Arten zusammen', async () => {
    const { data } = await admin
      .from('user_catalog_entries')
      .select('kind')
      .in('user_id', [alice.id, bob.id])
    const kinds = new Set(data!.map((row: any) => row.kind))
    expect(kinds).toEqual(new Set(['gear', 'consumable', 'wish']))
  })
})

describe('catalog_item_stats', () => {
  it('zählt Besitzer über beide Nutzer', async () => {
    const { data } = await admin
      .from('catalog_item_stats')
      .select('owner_count')
      .eq('catalog_item_id', stratId)
      .single()
    expect(Number(data!.owner_count)).toBeGreaterThanOrEqual(2)
  })

  it('zählt Wünsche getrennt von Besitz', async () => {
    const { data } = await admin
      .from('catalog_item_stats')
      .select('owner_count, wish_count')
      .eq('catalog_item_id', klonId)
      .single()
    expect(Number(data!.owner_count)).toBeGreaterThanOrEqual(1)
    expect(Number(data!.wish_count)).toBeGreaterThanOrEqual(1)
  })

  it('stimmt für einen Eintrag mit dem überein, was die Rohtabellen wirklich enthalten', async () => {
    // Fix Runde 1: der alte Test hat "White Falcon" fest auf owner_count === 0
    // verdrahtet - das bricht lautlos, sobald die naechste Aufgabe 20
    // Demo-Nutzer mit echten Rigs seedet und zufaellig jemand eine White
    // Falcon besitzt. Stattdessen rechnet dieser Test die Wahrheit live aus
    // den drei Rohtabellen nach und vergleicht sie mit der View - eine
    // Eigenschaft, die bei jedem Fuellstand der Datenbank gilt, nicht nur
    // heute. Das deckt nebenbei weiterhin den eigentlichen Zweck des LEFT
    // JOIN in der Migration ab: gaebe es fuer einen unbesessenen Eintrag gar
    // keine Zeile (INNER statt LEFT JOIN), wuerde .single() unten mit einem
    // "no rows"-Fehler fehlschlagen statt mit 0 zu vergleichen.
    const { data: item } = await admin
      .from('catalog_items')
      .select('id')
      .eq('name', 'White Falcon')
      .single()
    const catalogItemId = item!.id

    const [gear, prefs, wishes] = await Promise.all([
      admin.from('gear_items').select('owner_id').eq('catalog_item_id', catalogItemId),
      admin.from('preferences').select('user_id').eq('catalog_item_id', catalogItemId),
      admin.from('wishlist_items').select('user_id').eq('catalog_item_id', catalogItemId),
    ])

    // Distinct ueber Nutzer, nicht Zeilenzahl - deckt sich so auch, falls ein
    // Nutzer mehrfach dasselbe Katalog-Item besitzt oder darauf wartet.
    const expectedOwners = new Set([
      ...(gear.data ?? []).map((row: any) => row.owner_id),
      ...(prefs.data ?? []).map((row: any) => row.user_id),
    ])
    const expectedWishes = new Set((wishes.data ?? []).map((row: any) => row.user_id))

    const { data: stats } = await admin
      .from('catalog_item_stats')
      .select('owner_count, wish_count')
      .eq('catalog_item_id', catalogItemId)
      .single()

    expect(Number(stats!.owner_count)).toBe(expectedOwners.size)
    expect(Number(stats!.wish_count)).toBe(expectedWishes.size)
  })
})
