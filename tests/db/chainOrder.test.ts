import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { adminClient, anonClient } from '../helpers/supabase'
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

    const { data, error: readError } = await admin
      .from('gear_items')
      .select('id, chain_position')
      .eq('owner_id', user.id)
    expect(readError).toBeNull()

    const positions = gearIds.map((id) => data!.find((row) => row.id === id)!.chain_position)
    expect(positions).toEqual([1, 2, 3])
  })

  it('nimmt Geraete aus der Kette, die im neuen Aufruf fehlen', async () => {
    const { error } = await user.client.rpc('set_chain_order', {
      item_ids: [gearIds[2], gearIds[0]],
    })
    expect(error).toBeNull()

    const { data, error: readError } = await admin
      .from('gear_items')
      .select('id, chain_position')
      .eq('owner_id', user.id)
    expect(readError).toBeNull()
    const byId = Object.fromEntries(data!.map((row) => [row.id, row.chain_position]))

    expect(byId[gearIds[2]!]).toBe(1)
    expect(byId[gearIds[0]!]).toBe(2)
    expect(byId[gearIds[1]!]).toBeNull()
  })

  it('vertauscht zwei Positionen, ohne an einer Eindeutigkeit zu scheitern', async () => {
    // Ohne diese Pruefung waere ein gescheiterter Setup-Aufruf unsichtbar:
    // die Kette bliebe auf dem Stand des Vortests stehen, und der stimmt
    // zufaellig mit dem ueberein, was dieser Test unten erwartet.
    const { error: setupError } = await user.client.rpc('set_chain_order', {
      item_ids: [gearIds[0], gearIds[1]],
    })
    expect(setupError).toBeNull()
    const { error } = await user.client.rpc('set_chain_order', {
      item_ids: [gearIds[1], gearIds[0]],
    })
    expect(error).toBeNull()

    const { data, error: readError } = await admin
      .from('gear_items')
      .select('id, chain_position')
      .eq('owner_id', user.id)
    expect(readError).toBeNull()
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
    const { data: after, error: readError } = await admin
      .from('gear_items')
      .select('id, chain_position')
      .eq('owner_id', user.id)
    expect(readError).toBeNull()
    const byId = Object.fromEntries(after!.map((row) => [row.id, row.chain_position]))
    expect(byId[gearIds[1]!]).toBe(1)
    expect(byId[gearIds[0]!]).toBe(2)
  })

  // Ab hier die beiden Waechter aus chain_order_guards. Die Kette steht zu
  // Beginn auf gearIds[1] = 1, gearIds[0] = 2, gearIds[2] = null - beide
  // abgelehnten Aufrufe muessen sie genau so stehen lassen.
  it('lehnt null laut ab, statt still gar nichts zu tun', async () => {
    const { error } = await user.client.rpc('set_chain_order', { item_ids: null })

    expect(error).not.toBeNull()
    expect(error!.message).toMatch(/must not be null/)

    const { data: after, error: readError } = await admin
      .from('gear_items')
      .select('id, chain_position')
      .eq('owner_id', user.id)
    expect(readError).toBeNull()
    const byId = Object.fromEntries(after!.map((row) => [row.id, row.chain_position]))
    expect(byId[gearIds[1]!]).toBe(1)
    expect(byId[gearIds[0]!]).toBe(2)
  })

  it('lehnt ein doppelt uebergebenes Geraet ab, statt still eine Luecke zu lassen', async () => {
    const { error } = await user.client.rpc('set_chain_order', {
      item_ids: [gearIds[0], gearIds[0], gearIds[1]],
    })

    expect(error).not.toBeNull()
    expect(error!.message).toMatch(/duplicate/)

    const { data: after, error: readError } = await admin
      .from('gear_items')
      .select('id, chain_position')
      .eq('owner_id', user.id)
    expect(readError).toBeNull()
    const byId = Object.fromEntries(after!.map((row) => [row.id, row.chain_position]))
    expect(byId[gearIds[1]!]).toBe(1)
    expect(byId[gearIds[0]!]).toBe(2)
  })

  // Frueher schlug hier der Dubletten-Waechter an: count(distinct) zaehlt
  // NULL nicht mit, also sah array[a, null] fuer ihn nach einer Dublette aus.
  // Laut war das zwar, aber mit falscher Begruendung.
  it('lehnt null als Element mit eigener Begruendung ab, nicht als Dublette', async () => {
    const { error } = await user.client.rpc('set_chain_order', {
      item_ids: [gearIds[0], null],
    })

    expect(error).not.toBeNull()
    expect(error!.message).toMatch(/must not contain null/)
    // Der Kern dieses Tests: die Meldung muss die richtige Ursache nennen.
    expect(error!.message).not.toMatch(/duplicate/)

    const { data: after, error: readError } = await admin
      .from('gear_items')
      .select('id, chain_position')
      .eq('owner_id', user.id)
    expect(readError).toBeNull()
    const byId = Object.fromEntries(after!.map((row) => [row.id, row.chain_position]))
    expect(byId[gearIds[1]!]).toBe(1)
    expect(byId[gearIds[0]!]).toBe(2)
  })

  // Dieser Test haelt jemanden davon ab, das leere Array in denselben
  // Waechter wie null zu werfen: '{}' ist kein Fehler, sondern der
  // ausdrueckliche Wunsch, die Kette zu leeren. Steht bewusst zuletzt -
  // er raeumt die Kette ab, auf der die Tests davor bestehen.
  it('leert die Kette bei einem leeren Array, statt zu meckern', async () => {
    const { error } = await user.client.rpc('set_chain_order', { item_ids: [] })
    expect(error).toBeNull()

    const { data, error: readError } = await admin
      .from('gear_items')
      .select('id, chain_position')
      .eq('owner_id', user.id)
    expect(readError).toBeNull()
    expect(data).toHaveLength(3)
    expect(data!.every((row) => row.chain_position === null)).toBe(true)
  })

  // Fix 1: "revoke all ... from public" liess anon den Grant aus Supabase'
  // Default Privileges. Der Test muss den Unterschied zum Waechter im Rumpf
  // sehen koennen - vor dem Fix kam anon durch und bekam "not authenticated",
  // also waere eine blosse "irgendein Fehler"-Pruefung schon damals gruen
  // gewesen.
  it('laesst einen nicht angemeldeten Aufrufer gar nicht erst an die Funktion', async () => {
    const anon = anonClient()
    const { error } = await anon.rpc('set_chain_order', { item_ids: [] })

    expect(error).not.toBeNull()
    expect(error!.code).toBe('42501')
    expect(error!.message).toMatch(/permission denied/)
    expect(error!.message).not.toMatch(/not authenticated/)
  })

  // Fix 4: der Waechter im Rumpf war als einziger ungetestet. anon kommt
  // seit Fix 1 nicht mehr bis dorthin, service_role dagegen darf ausfuehren
  // und hat trotzdem keine auth.uid() - genau der Aufrufer, fuer den der
  // Waechter die zweite Verteidigungslinie ist.
  it('weist einen Aufrufer ohne auth.uid() ab, der ausfuehren darf', async () => {
    const { error } = await admin.rpc('set_chain_order', { item_ids: [] })

    expect(error).not.toBeNull()
    expect(error!.message).toMatch(/not authenticated/)
  })
})
