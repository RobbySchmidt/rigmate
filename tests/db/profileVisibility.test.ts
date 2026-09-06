import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { adminClient, anonClient } from '../helpers/supabase'
import { createTestUser, deleteTestUsers, type TestUser } from '../helpers/testUser'

const admin = adminClient()
const anon = anonClient()

let alice: TestUser
let bob: TestUser

beforeAll(async () => {
  alice = await createTestUser('Alice Ampeg')
  bob = await createTestUser('Bob Bassman')
  const { data: strat } = await admin.from('catalog_items').select('id').eq('name', 'Stratocaster').single()
  await alice.client.from('gear_items').insert({ owner_id: alice.id, catalog_item_id: strat!.id })
})

afterAll(async () => {
  await deleteTestUsers()
})

describe('Was die Profilseite laden darf', () => {
  it('lässt einen Angemeldeten Profil und Rig eines anderen lesen', async () => {
    const { data: profile } = await bob.client
      .from('profiles')
      .select('display_name, bio, bands, links')
      .eq('id', alice.id)
      .single()
    expect(profile!.display_name).toBe('Alice Ampeg')

    const { data: rig } = await bob.client
      .from('gear_items')
      .select('id, catalog_items ( name )')
      .eq('owner_id', alice.id)
    expect(rig!.length).toBeGreaterThan(0)
  })

  it('gibt einem Nicht-Angemeldeten weder Profil noch Rig', async () => {
    const { data: profile } = await anon.from('profiles').select('display_name').eq('id', alice.id)
    expect(profile).toEqual([])
    const { data: rig } = await anon.from('gear_items').select('id').eq('owner_id', alice.id)
    expect(rig).toEqual([])
  })

  it('speichert die optionalen Felder', async () => {
    const { error } = await alice.client
      .from('profiles')
      .update({
        real_name: 'Alice A.',
        bio: 'Spielt seit 1998.',
        bands: ['Die Reverbs', 'Solo'],
        links: [{ label: 'YouTube', url: 'https://example.com' }],
      })
      .eq('id', alice.id)
    expect(error).toBeNull()

    const { data } = await admin.from('profiles').select('bands, links').eq('id', alice.id).single()
    expect(data!.bands).toEqual(['Die Reverbs', 'Solo'])
    expect((data!.links as any[])[0].label).toBe('YouTube')
  })

  it('speichert keinen Ort — das Feld gibt es gar nicht', async () => {
    const { error } = await alice.client
      .from('profiles')
      .update({ location: 'Köln' } as any)
      .eq('id', alice.id)
    expect(error).not.toBeNull()
  })
})
