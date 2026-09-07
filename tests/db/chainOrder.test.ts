import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { adminClient } from '../helpers/supabase'
import { createTestUser, deleteTestUsers, type TestUser } from '../helpers/testUser'

/**
 * Holt Katalog-Eintraege, die als Exemplar erlaubt sind. Verbrauchsmaterial
 * (Saiten, Plektren) lehnt der Trigger enforce_gear_item_rules() ab, und
 * ein blosses .limit(n) ohne Sortierung koennte genau darauf treffen - der
 * Test waere dann aus einem Grund rot, der nichts mit der Signalkette zu
 * tun hat.
 */
async function playableCatalogIds(limit: number): Promise<string[]> {
  const admin = adminClient()
  const { data: categories, error: categoryError } = await admin
    .from('categories')
    .select('id')
    .eq('is_consumable', false)
  if (categoryError) throw categoryError

  const { data, error } = await admin
    .from('catalog_items')
    .select('id')
    .in(
      'category_id',
      categories!.map((row) => row.id),
    )
    .order('id')
    .limit(limit)
  if (error) throw error
  expect(data).toHaveLength(limit)
  return data!.map((row) => row.id)
}

describe('chain_position und set_chain_order', () => {
  const admin = adminClient()
  let user: TestUser
  let gearIds: string[] = []

  beforeAll(async () => {
    await deleteTestUsers()
    user = await createTestUser('Kettenkarl')

    const catalogIds = await playableCatalogIds(3)

    const { data: created, error: insertError } = await admin
      .from('gear_items')
      .insert(catalogIds.map((catalogItemId) => ({ owner_id: user.id, catalog_item_id: catalogItemId })))
      .select('id')
    if (insertError) throw insertError
    gearIds = created!.map((row) => row.id)
    expect(gearIds).toHaveLength(3)
  })

  afterAll(async () => {
    await deleteTestUsers()
  })

  it('legt neue Geraete ohne Kettenposition an', async () => {
    const { data, error } = await admin
      .from('gear_items')
      .select('chain_position')
      .eq('owner_id', user.id)
    expect(error).toBeNull()
    // Ohne diese Laengenpruefung waere .every() auf einer leeren Liste
    // wahr - der Test koennte gar nicht mehr fehlschlagen.
    expect(data).toHaveLength(3)
    expect(data!.every((row) => row.chain_position === null)).toBe(true)
  })

  it('nummeriert die uebergebene Reihenfolge von 1 an durch', async () => {
    const { error } = await user.client.rpc('set_chain_order', { item_ids: gearIds })
    expect(error).toBeNull()

    const { data } = await admin
      .from('gear_items')
      .select('id, chain_position')
      .eq('owner_id', user.id)

    const positions = gearIds.map((id) => data!.find((row) => row.id === id)!.chain_position)
    expect(positions).toEqual([1, 2, 3])
  })

  it('nimmt Geraete aus der Kette, die im neuen Aufruf fehlen', async () => {
    const { error } = await user.client.rpc('set_chain_order', {
      item_ids: [gearIds[2], gearIds[0]],
    })
    expect(error).toBeNull()

    const { data } = await admin
      .from('gear_items')
      .select('id, chain_position')
      .eq('owner_id', user.id)
    const byId = Object.fromEntries(data!.map((row) => [row.id, row.chain_position]))

    expect(byId[gearIds[2]!]).toBe(1)
    expect(byId[gearIds[0]!]).toBe(2)
    expect(byId[gearIds[1]!]).toBeNull()
  })

  it('vertauscht zwei Positionen, ohne an einer Eindeutigkeit zu scheitern', async () => {
    await user.client.rpc('set_chain_order', { item_ids: [gearIds[0], gearIds[1]] })
    const { error } = await user.client.rpc('set_chain_order', {
      item_ids: [gearIds[1], gearIds[0]],
    })
    expect(error).toBeNull()

    const { data } = await admin
      .from('gear_items')
      .select('id, chain_position')
      .eq('owner_id', user.id)
    const byId = Object.fromEntries(data!.map((row) => [row.id, row.chain_position]))

    expect(byId[gearIds[1]!]).toBe(1)
    expect(byId[gearIds[0]!]).toBe(2)
  })

  it('lehnt fremde Geraete laut ab, statt sie still zu uebergehen', async () => {
    const other = await createTestUser('Fremdfritz')
    const [foreignCatalogId] = await playableCatalogIds(1)
    const { data: created, error: insertError } = await admin
      .from('gear_items')
      .insert({ owner_id: other.id, catalog_item_id: foreignCatalogId })
      .select('id')
    if (insertError) throw insertError

    const { error } = await user.client.rpc('set_chain_order', {
      item_ids: [gearIds[0], created![0]!.id],
    })

    expect(error).not.toBeNull()
    expect(error!.message).toMatch(/not owned by caller/)

    // Der laute Abbruch muss die bestehende Kette unangetastet lassen -
    // ein halb umsortiertes Rig waere schlimmer als gar keine Meldung.
    const { data: after } = await admin
      .from('gear_items')
      .select('id, chain_position')
      .eq('owner_id', user.id)
    const byId = Object.fromEntries(after!.map((row) => [row.id, row.chain_position]))
    expect(byId[gearIds[1]!]).toBe(1)
    expect(byId[gearIds[0]!]).toBe(2)
  })
})
