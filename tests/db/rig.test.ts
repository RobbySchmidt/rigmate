import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { adminClient, anonClient } from '../helpers/supabase'
import { createTestUser, deleteTestUsers, type TestUser } from '../helpers/testUser'

const admin = adminClient()
const anon = anonClient()

let alice: TestUser
let bob: TestUser
let stratId: string
let pickupId: string
let slinkyId: string
let ac30Id: string

async function catalogId(name: string): Promise<string> {
  const { data } = await admin.from('catalog_items').select('id').eq('name', name).single()
  return data!.id
}

beforeAll(async () => {
  alice = await createTestUser('Alice Ampeg')
  bob = await createTestUser('Bob Bassman')
  stratId = await catalogId('Stratocaster')
  pickupId = await catalogId('JB')
  slinkyId = await catalogId('Regular Slinky')
  ac30Id = await catalogId('AC30')
})

afterAll(async () => {
  await deleteTestUsers()
})

describe('gear_items', () => {
  it('nimmt ein Exemplar mit nur einem Katalog-Verweis an', async () => {
    // Abschnitt 6: "Fender Stratocaster" allein ist ein vollständiger Eintrag.
    const { error } = await alice.client
      .from('gear_items')
      .insert({ owner_id: alice.id, catalog_item_id: stratId })
    expect(error).toBeNull()
  })

  it('nimmt die optionale Tiefe an', async () => {
    const { error } = await alice.client.from('gear_items').insert({
      owner_id: alice.id,
      catalog_item_id: ac30Id,
      year: 2019,
      finish: 'Sunburst',
      modifications: 'Speaker getauscht',
      notes: 'Klingt erst ab halb sechs.',
    })
    expect(error).toBeNull()
  })

  it('lehnt ein unmögliches Baujahr ab', async () => {
    const { error } = await alice.client
      .from('gear_items')
      .insert({ owner_id: alice.id, catalog_item_id: stratId, year: 1234 })
    expect(error).not.toBeNull()
  })

  it('lehnt Verbrauchsmaterial als Exemplar ab', async () => {
    // Saiten besitzt man nicht als Einzelstück, man bevorzugt sie.
    const { error } = await alice.client
      .from('gear_items')
      .insert({ owner_id: alice.id, catalog_item_id: slinkyId })
    expect(error).not.toBeNull()
    expect(error!.message).toMatch(/consumable/i)
  })

  it('lehnt ein Exemplar auf fremden Namen ab', async () => {
    const { error } = await bob.client
      .from('gear_items')
      .insert({ owner_id: alice.id, catalog_item_id: stratId })
    expect(error).not.toBeNull()
  })
})

describe('installed_in', () => {
  it('verbaut ein Exemplar in einem anderen desselben Nutzers', async () => {
    const { data: guitar } = await alice.client
      .from('gear_items')
      .insert({ owner_id: alice.id, catalog_item_id: stratId, finish: 'Olympic White' })
      .select('id')
      .single()

    const { error } = await alice.client
      .from('gear_items')
      .insert({ owner_id: alice.id, catalog_item_id: pickupId, installed_in_id: guitar!.id })
    expect(error).toBeNull()
  })

  it('lehnt das Verbauen in fremdem Equipment ab', async () => {
    const { data: aliceGuitar } = await admin
      .from('gear_items')
      .select('id')
      .eq('owner_id', alice.id)
      .limit(1)
      .single()

    const { error } = await bob.client
      .from('gear_items')
      .insert({ owner_id: bob.id, catalog_item_id: pickupId, installed_in_id: aliceGuitar!.id })
    expect(error).not.toBeNull()
    expect(error!.message).toMatch(/same owner/i)
  })

  it('lehnt eine zweite Verschachtelungsebene ab', async () => {
    const { data: guitar } = await alice.client
      .from('gear_items')
      .insert({ owner_id: alice.id, catalog_item_id: stratId, finish: 'Fiesta Red' })
      .select('id')
      .single()
    const { data: pickup } = await alice.client
      .from('gear_items')
      .insert({ owner_id: alice.id, catalog_item_id: pickupId, installed_in_id: guitar!.id })
      .select('id')
      .single()

    const { error } = await alice.client
      .from('gear_items')
      .insert({ owner_id: alice.id, catalog_item_id: pickupId, installed_in_id: pickup!.id })
    expect(error).not.toBeNull()
    expect(error!.message).toMatch(/one level/i)
  })
})

describe('preferences', () => {
  it('nimmt Verbrauchsmaterial an', async () => {
    const { error } = await alice.client
      .from('preferences')
      .insert({ user_id: alice.id, catalog_item_id: slinkyId })
    expect(error).toBeNull()
  })

  it('lehnt eine Gitarre als Präferenz ab', async () => {
    const { error } = await alice.client
      .from('preferences')
      .insert({ user_id: alice.id, catalog_item_id: stratId })
    expect(error).not.toBeNull()
    expect(error!.message).toMatch(/consumable/i)
  })

  it('lehnt dieselbe Präferenz zweimal ab', async () => {
    const { error } = await alice.client
      .from('preferences')
      .insert({ user_id: alice.id, catalog_item_id: slinkyId })
    expect(error!.code).toBe('23505')
  })
})

describe('wishlist_items', () => {
  it('nimmt einen Wunsch an', async () => {
    const { error } = await bob.client
      .from('wishlist_items')
      .insert({ user_id: bob.id, catalog_item_id: stratId, note: 'Am liebsten in Sonic Blue.' })
    expect(error).toBeNull()
  })

  it('lehnt denselben Wunsch zweimal ab', async () => {
    const { error } = await bob.client
      .from('wishlist_items')
      .insert({ user_id: bob.id, catalog_item_id: stratId })
    expect(error!.code).toBe('23505')
  })
})

describe('Rig-RLS', () => {
  it('zeigt das Rig allen Angemeldeten', async () => {
    // Abschnitt 7: Läge die Liste hinter Freundschaft, stünde der Motor.
    const { data } = await bob.client.from('gear_items').select('id').eq('owner_id', alice.id)
    expect(data!.length).toBeGreaterThan(0)
  })

  it('verbirgt das Rig vor Nicht-Angemeldeten', async () => {
    const { data } = await anon.from('gear_items').select('id').eq('owner_id', alice.id)
    expect(data).toEqual([])
  })

  it('lässt fremdes Equipment nicht ändern', async () => {
    const { data: item } = await admin
      .from('gear_items')
      .select('id')
      .eq('owner_id', alice.id)
      .limit(1)
      .single()
    await bob.client.from('gear_items').update({ notes: 'gekapert' }).eq('id', item!.id)
    const { data } = await admin.from('gear_items').select('notes').eq('id', item!.id).single()
    expect(data!.notes).not.toBe('gekapert')
  })

  it('lässt fremdes Equipment nicht löschen', async () => {
    const { count: before } = await admin
      .from('gear_items')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', alice.id)
    await bob.client.from('gear_items').delete().eq('owner_id', alice.id)
    const { count: after } = await admin
      .from('gear_items')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', alice.id)
    expect(after).toBe(before)
  })

  it('lässt eigenes Equipment löschen', async () => {
    const { data: item } = await alice.client
      .from('gear_items')
      .insert({ owner_id: alice.id, catalog_item_id: stratId, finish: 'Wegwerf' })
      .select('id')
      .single()
    const { error } = await alice.client.from('gear_items').delete().eq('id', item!.id)
    expect(error).toBeNull()
  })
})
