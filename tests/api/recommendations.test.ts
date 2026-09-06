import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { adminClient } from '../helpers/supabase'
import { createTestUser, deleteTestUsers, type TestUser } from '../helpers/testUser'

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3000'
const admin = adminClient()

let alice: TestUser
let bob: TestUser
let carol: TestUser

async function catalogId(name: string): Promise<string> {
  const { data } = await admin.from('catalog_items').select('id').eq('name', name).single()
  return data!.id
}

async function recommendationsFor(user: TestUser): Promise<any> {
  const { data } = await user.client.auth.getSession()
  const response = await fetch(`${BASE}/api/recommendations`, {
    headers: { Authorization: `Bearer ${data.session!.access_token}` },
  })
  expect(response.ok).toBe(true)
  return response.json()
}

beforeAll(async () => {
  alice = await createTestUser('Alice Ampeg')
  bob = await createTestUser('Bob Bassman')
  carol = await createTestUser('Carol Cabinet')

  const klon = await catalogId('Centaur')
  const ds1 = await catalogId('DS-1 Distortion')
  const ac30 = await catalogId('AC30')

  // Alice und Bob teilen ein rares Pedal, Alice und Carol nur Massenware.
  await alice.client.from('gear_items').insert([
    { owner_id: alice.id, catalog_item_id: klon },
    { owner_id: alice.id, catalog_item_id: ds1 },
    { owner_id: alice.id, catalog_item_id: ac30 },
  ])
  await bob.client.from('gear_items').insert([
    { owner_id: bob.id, catalog_item_id: klon },
    { owner_id: bob.id, catalog_item_id: ac30 },
  ])
  await carol.client.from('gear_items').insert({ owner_id: carol.id, catalog_item_id: ds1 })
})

afterAll(async () => {
  await deleteTestUsers()
})

describe('GET /api/recommendations', () => {
  it('verlangt eine Anmeldung', async () => {
    const response = await fetch(`${BASE}/api/recommendations`)
    expect(response.status).toBe(401)
  })

  it('stellt den stärkeren Treffer nach vorne', async () => {
    // Bob teilt ein rares Pedal plus einen Amp, Carol nur Massenware.
    const body = await recommendationsFor(alice)
    const ids = body.suggestions.map((s: any) => s.userId)
    expect(ids.indexOf(bob.id)).toBeLessThan(ids.indexOf(carol.id))
  })

  it('nennt zu jedem Vorschlag einen Grund', async () => {
    const body = await recommendationsFor(alice)
    for (const suggestion of body.suggestions) {
      expect(suggestion.reason).not.toBeNull()
      expect(suggestion.reason.name).toBeTruthy()
      expect(suggestion.reason.brandName).toBeTruthy()
    }
  })

  it('schlägt einen nicht selbst vor', async () => {
    const body = await recommendationsFor(alice)
    expect(body.suggestions.map((s: any) => s.userId)).not.toContain(alice.id)
  })

  it('meldet keinen Ersatzmodus, wenn es echte Treffer gibt', async () => {
    const body = await recommendationsFor(alice)
    expect(body.fallback).toBe(false)
  })

  it('fällt bei leerem Rig auf Zufall zurück und sagt das', async () => {
    // Der haeufigste Tod eines sozialen Prototyps ist der leere Bildschirm.
    const newbie = await createTestUser('Neuling')
    const body = await recommendationsFor(newbie)
    expect(body.fallback).toBe(true)
    expect(body.suggestions.length).toBeGreaterThan(0)
    expect(body.suggestions[0].reason).toBeNull()
  })
})
