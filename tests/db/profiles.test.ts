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
})

afterAll(async () => {
  await deleteTestUsers()
})

describe('Profil-Anlage', () => {
  it('legt beim Registrieren automatisch ein Profil an', async () => {
    const { data } = await admin.from('profiles').select('display_name').eq('id', alice.id).single()
    expect(data!.display_name).toBe('Alice Ampeg')
  })

  it('vergibt einen Ersatznamen, wenn keiner mitgeliefert wurde', async () => {
    const { data: created } = await admin.auth.admin.createUser({
      email: `rigmate-test-${crypto.randomUUID()}@example.invalid`,
      password: 'rigmate-test-passwort-2026',
      email_confirm: true,
    })
    const { data } = await admin.from('profiles').select('display_name').eq('id', created.user!.id).single()
    expect(data!.display_name).toMatch(/^Rigmate /)
  })

  it('kappt einen überlangen Anzeigenamen statt die Registrierung abzubrechen', async () => {
    const { data: created } = await admin.auth.admin.createUser({
      email: `rigmate-test-${crypto.randomUUID()}@example.invalid`,
      password: 'rigmate-test-passwort-2026',
      email_confirm: true,
      user_metadata: { display_name: 'A'.repeat(10000) },
    })
    const { data } = await admin.from('profiles').select('display_name').eq('id', created.user!.id).single()
    expect(data!.display_name).toHaveLength(40)
  })

  it('vergibt den Ersatznamen bei einem Anzeigenamen aus nur Leerzeichen', async () => {
    const { data: created } = await admin.auth.admin.createUser({
      email: `rigmate-test-${crypto.randomUUID()}@example.invalid`,
      password: 'rigmate-test-passwort-2026',
      email_confirm: true,
      user_metadata: { display_name: '     ' },
    })
    const { data } = await admin.from('profiles').select('display_name').eq('id', created.user!.id).single()
    expect(data!.display_name).toMatch(/^Rigmate /)
  })

  it('kappt einen Anzeigenamen von genau 41 Zeichen auf 40', async () => {
    const { data: created } = await admin.auth.admin.createUser({
      email: `rigmate-test-${crypto.randomUUID()}@example.invalid`,
      password: 'rigmate-test-passwort-2026',
      email_confirm: true,
      user_metadata: { display_name: 'A'.repeat(41) },
    })
    const { data } = await admin.from('profiles').select('display_name').eq('id', created.user!.id).single()
    expect(data!.display_name).toHaveLength(40)
  })

  it('vergibt den Ersatznamen bei einem Anzeigenamen von genau 1 Zeichen', async () => {
    const { data: created } = await admin.auth.admin.createUser({
      email: `rigmate-test-${crypto.randomUUID()}@example.invalid`,
      password: 'rigmate-test-passwort-2026',
      email_confirm: true,
      user_metadata: { display_name: 'A' },
    })
    const { data } = await admin.from('profiles').select('display_name').eq('id', created.user!.id).single()
    expect(data!.display_name).toMatch(/^Rigmate /)
  })

  it('vergibt den Ersatznamen bei einem leeren Anzeigenamen', async () => {
    const { data: created } = await admin.auth.admin.createUser({
      email: `rigmate-test-${crypto.randomUUID()}@example.invalid`,
      password: 'rigmate-test-passwort-2026',
      email_confirm: true,
      user_metadata: { display_name: '' },
    })
    const { data } = await admin.from('profiles').select('display_name').eq('id', created.user!.id).single()
    expect(data!.display_name).toMatch(/^Rigmate /)
  })

  it('löscht das Profil mit dem Nutzer', async () => {
    const doomed = await createTestUser('Kurzlebig')
    await admin.auth.admin.deleteUser(doomed.id)
    const { data } = await admin.from('profiles').select('id').eq('id', doomed.id)
    expect(data).toEqual([])
  })
})

describe('Profil-Regeln', () => {
  it('lehnt einen zu kurzen Anzeigenamen ab', async () => {
    const { error } = await alice.client.from('profiles').update({ display_name: 'A' }).eq('id', alice.id)
    expect(error).not.toBeNull()
  })

  it('erlaubt leere optionale Felder — nur der Anzeigename ist Pflicht', async () => {
    const { error } = await alice.client
      .from('profiles')
      .update({ real_name: null, bio: null, bands: [], links: [] })
      .eq('id', alice.id)
    expect(error).toBeNull()
  })
})

describe('Profil-RLS', () => {
  it('bleibt ohne Login unsichtbar', async () => {
    // Abschnitt 10: Profile nur mit Login.
    const { data } = await anon.from('profiles').select('id').eq('id', alice.id)
    expect(data).toEqual([])
  })

  it('ist für andere Angemeldete lesbar', async () => {
    const { data } = await bob.client.from('profiles').select('display_name').eq('id', alice.id)
    expect(data).toHaveLength(1)
  })

  it('lässt nur das eigene Profil bearbeiten', async () => {
    await bob.client.from('profiles').update({ display_name: 'Gekapert' }).eq('id', alice.id)
    const { data } = await admin.from('profiles').select('display_name').eq('id', alice.id).single()
    expect(data!.display_name).not.toBe('Gekapert')
  })

  it('lässt das eigene Profil bearbeiten', async () => {
    const { error } = await alice.client
      .from('profiles')
      .update({ bio: 'Spielt zu laut.' })
      .eq('id', alice.id)
    expect(error).toBeNull()
  })
})
