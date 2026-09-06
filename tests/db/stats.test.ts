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

  it('liefert auch für Einträge ohne Besitzer eine Zeile', async () => {
    const { data: unused } = await admin
      .from('catalog_items')
      .select('id')
      .eq('name', 'White Falcon')
      .single()
    const { data } = await admin
      .from('catalog_item_stats')
      .select('owner_count')
      .eq('catalog_item_id', unused!.id)
      .single()
    expect(Number(data!.owner_count)).toBe(0)
  })
})
