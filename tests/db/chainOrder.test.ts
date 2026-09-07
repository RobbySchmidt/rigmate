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

  /**
   * Liest die Kette des Testnutzers als { Geraete-Id: Position }. Die
   * Laengenpruefung gehoert hierher: ein kaputter Read liefert sonst ein
   * leeres Objekt, und jede Erwartung darauf waere `undefined` statt eines
   * sprechenden Fehlschlags.
   */
  async function chainByGearId(): Promise<Record<string, number | null>> {
    const { data, error } = await admin
      .from('gear_items')
      .select('id, chain_position')
      .eq('owner_id', user.id)
    expect(error).toBeNull()
    expect(data).toHaveLength(3)
    return Object.fromEntries(data!.map((row) => [row.id, row.chain_position]))
  }

  /**
   * Setzt die Kette und besteht darauf, dass das geklappt hat. Nur fuers
   * Setup - wer einen Fehlschlag erwartet, ruft die RPC direkt auf. Ein
   * stillschweigend gescheitertes Setup waere sonst unsichtbar: die Kette
   * bliebe auf dem Stand des Vortests stehen, und der passt oft zufaellig.
   */
  async function setChain(ids: (string | null)[]): Promise<void> {
    const { error } = await user.client.rpc('set_chain_order', { item_ids: ids })
    expect(error).toBeNull()
  }

  beforeAll(async () => {
    await deleteTestUsers()
    user = await createTestUser('Kettenkarl')

    const catalogIds = await playableCatalogIds(3)

    const { data: created, error: insertError } = await admin
      .from('gear_items')
      .insert(
        catalogIds.map((catalogItemId) => ({ owner_id: user.id, catalog_item_id: catalogItemId })),
      )
      .select('id')
    if (insertError) throw insertError
    gearIds = created!.map((row) => row.id)
    expect(gearIds).toHaveLength(3)
  })

  afterAll(async () => {
    await deleteTestUsers()
  })

  // Muss als einziger Test zuerst laufen: er prueft den Zustand direkt nach
  // dem INSERT, also den Default der Spalte. Jeder Test darunter baut sich
  // seine Kette selbst.
  it('legt neue Geraete ohne Kettenposition an', async () => {
    const chain = await chainByGearId()
    expect(Object.values(chain).every((position) => position === null)).toBe(true)
  })

  it('nummeriert die uebergebene Reihenfolge von 1 an durch', async () => {
    await setChain(gearIds)

    const chain = await chainByGearId()
    expect(gearIds.map((id) => chain[id])).toEqual([1, 2, 3])
  })

  it('nimmt Geraete aus der Kette, die im neuen Aufruf fehlen', async () => {
    // Erst die volle Kette, sonst waere das erwartete null am Ende schon
    // vorher wahr und der Test koennte das Herausnehmen gar nicht zeigen.
    await setChain(gearIds)
    await setChain([gearIds[2]!, gearIds[0]!])

    const chain = await chainByGearId()
    expect(chain[gearIds[2]!]).toBe(1)
    expect(chain[gearIds[0]!]).toBe(2)
    expect(chain[gearIds[1]!]).toBeNull()
  })

  it('vertauscht zwei Positionen, ohne an einer Eindeutigkeit zu scheitern', async () => {
    await setChain([gearIds[0]!, gearIds[1]!])
    await setChain([gearIds[1]!, gearIds[0]!])

    const chain = await chainByGearId()
    expect(chain[gearIds[1]!]).toBe(1)
    expect(chain[gearIds[0]!]).toBe(2)
  })

  // Ab hier die Waechter. Jeder baut sich seine Kette selbst und prueft
  // danach, dass der laute Abbruch sie unangetastet gelassen hat - ein halb
  // umsortiertes Rig waere schlimmer als gar keine Meldung. Geprueft wird
  // auf den SQLSTATE, nicht auf den Meldungstext: die Codes sind die
  // Schnittstelle, die englischen Texte nicht.

  it('lehnt fremde Geraete ab und nennt die Id (RG005)', async () => {
    await setChain([gearIds[1]!, gearIds[0]!])

    const other = await createTestUser('Fremdfritz')
    const [foreignCatalogId] = await playableCatalogIds(1)
    const { data: created, error: insertError } = await admin
      .from('gear_items')
      .insert({ owner_id: other.id, catalog_item_id: foreignCatalogId })
      .select('id')
    if (insertError) throw insertError
    const foreignGearId = created![0]!.id

    const { error } = await user.client.rpc('set_chain_order', {
      item_ids: [gearIds[0], foreignGearId],
    })

    expect(error).not.toBeNull()
    expect(error!.code).toBe('RG005')
    // Die Meldung muss das konkrete Geraet nennen, sonst ist sie bei einer
    // Kette aus fuenfzehn Geraeten unbrauchbar.
    expect(error!.message).toContain(foreignGearId)

    const chain = await chainByGearId()
    expect(chain[gearIds[1]!]).toBe(1)
    expect(chain[gearIds[0]!]).toBe(2)
    expect(chain[gearIds[2]!]).toBeNull()
  })

  // Eine Id, die es gar nicht gibt, landete frueher ebenfalls in "not owned
  // by caller" - eine Meldung, die eine Ursache behauptet, die nicht stimmt.
  it('behandelt eine unbekannte Id wie ein fremdes Geraet (RG005)', async () => {
    await setChain([gearIds[1]!, gearIds[0]!])
    const unknownId = crypto.randomUUID()

    const { error } = await user.client.rpc('set_chain_order', {
      item_ids: [gearIds[0], unknownId],
    })

    expect(error).not.toBeNull()
    expect(error!.code).toBe('RG005')
    expect(error!.message).toContain(unknownId)
    expect(error!.message).toMatch(/unknown/)

    const chain = await chainByGearId()
    expect(chain[gearIds[1]!]).toBe(1)
    expect(chain[gearIds[0]!]).toBe(2)
  })

  it('lehnt null laut ab, statt still gar nichts zu tun (RG002)', async () => {
    await setChain([gearIds[1]!, gearIds[0]!])

    const { error } = await user.client.rpc('set_chain_order', { item_ids: null })

    expect(error).not.toBeNull()
    expect(error!.code).toBe('RG002')

    const chain = await chainByGearId()
    expect(chain[gearIds[1]!]).toBe(1)
    expect(chain[gearIds[0]!]).toBe(2)
  })

  // Frueher schlug hier der Dubletten-Waechter an: count(distinct) zaehlt
  // NULL nicht mit, also sah array[a, null] fuer ihn nach einer Dublette aus.
  // Laut war das zwar, aber mit falscher Begruendung.
  it('lehnt null als Element mit eigener Begruendung ab, nicht als Dublette (RG003)', async () => {
    await setChain([gearIds[1]!, gearIds[0]!])

    const { error } = await user.client.rpc('set_chain_order', {
      item_ids: [gearIds[0], null],
    })

    expect(error).not.toBeNull()
    expect(error!.code).toBe('RG003')
    // Der Kern dieses Tests: nicht der Dubletten-Code.
    expect(error!.code).not.toBe('RG004')

    const chain = await chainByGearId()
    expect(chain[gearIds[1]!]).toBe(1)
    expect(chain[gearIds[0]!]).toBe(2)
  })

  it('lehnt ein doppelt uebergebenes Geraet ab und nennt es (RG004)', async () => {
    await setChain([gearIds[1]!, gearIds[0]!])

    const { error } = await user.client.rpc('set_chain_order', {
      item_ids: [gearIds[0], gearIds[0], gearIds[1]],
    })

    expect(error).not.toBeNull()
    expect(error!.code).toBe('RG004')
    expect(error!.message).toContain(gearIds[0]!)

    const chain = await chainByGearId()
    expect(chain[gearIds[1]!]).toBe(1)
    expect(chain[gearIds[0]!]).toBe(2)
  })

  // Dieser Test haelt jemanden davon ab, das leere Array in denselben
  // Waechter wie null zu werfen: '{}' ist kein Fehler, sondern der
  // ausdrueckliche Wunsch, die Kette zu leeren. Steht bewusst nach den
  // Waechter-Tests, damit er neben ihnen gelesen wird.
  it('leert die Kette bei einem leeren Array, statt zu meckern', async () => {
    await setChain([gearIds[1]!, gearIds[0]!])

    const { error } = await user.client.rpc('set_chain_order', { item_ids: [] })
    expect(error).toBeNull()

    const chain = await chainByGearId()
    expect(Object.values(chain).every((position) => position === null)).toBe(true)
  })

  // "revoke all ... from public" liess anon den Grant aus Supabase' Default
  // Privileges stehen. Der Test muss den Unterschied zum Waechter im Rumpf
  // sehen koennen - vor dem Fix kam anon durch und bekam RG001, also waere
  // eine blosse "irgendein Fehler"-Pruefung schon damals gruen gewesen.
  it('laesst einen nicht angemeldeten Aufrufer gar nicht erst an die Funktion', async () => {
    const anon = anonClient()
    const { error } = await anon.rpc('set_chain_order', { item_ids: [] })

    expect(error).not.toBeNull()
    expect(error!.code).toBe('42501')
    expect(error!.message).toMatch(/permission denied/)
  })

  // Der Waechter im Rumpf war als einziger ungetestet. anon kommt seit der
  // wirksamen Rechtevergabe nicht mehr bis dorthin, service_role dagegen
  // darf ausfuehren und hat trotzdem keine auth.uid() - genau der Aufrufer,
  // fuer den der Waechter die zweite Verteidigungslinie ist.
  it('weist einen Aufrufer ohne auth.uid() ab, der ausfuehren darf (RG001)', async () => {
    const { error } = await admin.rpc('set_chain_order', { item_ids: [] })

    expect(error).not.toBeNull()
    expect(error!.code).toBe('RG001')
  })
})
