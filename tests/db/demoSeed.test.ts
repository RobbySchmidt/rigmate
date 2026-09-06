import { describe, it, expect } from 'vitest'
import { CATALOG } from '../../scripts/data/catalog'
import { DEMO_USERS } from '../../scripts/data/demoUsers'
import { adminClient } from '../helpers/supabase'

const admin = adminClient()

const CATALOG_NAMES = new Set(
  CATALOG.flatMap((line) => [line.name, ...(line.variants?.map((v) => v.name) ?? [])]),
)

describe('Demo-Daten', () => {
  it('umfasst mindestens 20 Nutzer', () => {
    expect(DEMO_USERS.length).toBeGreaterThanOrEqual(20)
  })

  it('verweist nur auf existierende Katalog-Einträge', () => {
    const referenced = DEMO_USERS.flatMap((u) => [
      ...u.gear.map((g) => g.item),
      ...u.preferences,
      ...u.wishlist,
    ])
    expect(referenced.filter((name) => !CATALOG_NAMES.has(name))).toEqual([])
  })

  it('hat eindeutige Anzeigenamen', () => {
    const names = DEMO_USERS.map((u) => u.displayName)
    expect(new Set(names).size).toBe(names.length)
  })

  it('lässt seltene Geräte selten sein', () => {
    // Ohne Streuung ist die Empfehlung nicht vorfuehrbar: haetten alle
    // denselben Klon, waere er statistisch Massenware.
    const counts = new Map<string, number>()
    for (const user of DEMO_USERS) {
      for (const gear of user.gear) counts.set(gear.item, (counts.get(gear.item) ?? 0) + 1)
    }
    const klon = counts.get('Centaur') ?? 0
    expect(klon).toBeGreaterThanOrEqual(2)
    expect(klon).toBeLessThanOrEqual(4)
  })

  it('gibt mindestens der Hälfte eine Wunschliste', () => {
    const withWishes = DEMO_USERS.filter((u) => u.wishlist.length > 0)
    expect(withWishes.length).toBeGreaterThanOrEqual(DEMO_USERS.length / 2)
  })
})

describe('Demo-Nutzer nach dem Seed', () => {
  it('steht vollständig in der Datenbank', async () => {
    const { data, error } = await admin
      .from('profiles')
      .select('display_name')
      .in('display_name', DEMO_USERS.map((u) => u.displayName))
    // Ein verschlucktes { error } saehe hier wie "keine Demo-Nutzer" aus -
    // der haeufigste Fehler in diesem Projekt.
    expect(error).toBeNull()
    expect(data!.length).toBe(DEMO_USERS.length)
  })

  it('hat bestätigte E-Mail-Adressen', async () => {
    // Die Mail-Bestaetigung bleibt projektweit Pflicht; Demo-Nutzer entstehen
    // deshalb ueber die Admin-API mit email_confirm.
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    expect(error).toBeNull()
    const demo = data.users.filter((u) => u.email?.startsWith('demo-'))
    expect(demo.length).toBeGreaterThanOrEqual(DEMO_USERS.length)
    expect(demo.every((u) => u.email_confirmed_at !== null)).toBe(true)
  })

  it('hat jedem Demo-Nutzer Equipment gegeben', async () => {
    const { data: profiles, error: profilesError } = await admin
      .from('profiles')
      .select('id')
      .in('display_name', DEMO_USERS.map((u) => u.displayName))
    expect(profilesError).toBeNull()
    const { data: gear, error: gearError } = await admin
      .from('gear_items')
      .select('owner_id')
      .in('owner_id', profiles!.map((p) => p.id))
    expect(gearError).toBeNull()
    const owners = new Set(gear!.map((g) => g.owner_id))
    expect(owners.size).toBe(profiles!.length)
  })
})
