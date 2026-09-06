import { describe, it, expect, beforeAll } from 'vitest'
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
  // Diese drei Tests legen ihre Daten bewusst NICHT selbst an, anders als jeder
  // andere Datenbank-Test im Projekt. Die Demo-Nutzer sind kein Fixture, sondern
  // das Ergebnis dieser Aufgabe, und sie liegen auf der geteilten, gehosteten
  // Instanz - ein lokales Supabase ueber Docker ist laut Abschnitt 12 der Spec
  // bewusst ausgeschlossen. Wuerde der Test sie selbst anlegen und wieder
  // loeschen, pruefte er seine eigene Einbildung statt den Bestand, den die
  // Anwendung tatsaechlich vorfuehrt.
  //
  // Der Preis dafuer: wer das Repository frisch klont und `yarn test` laufen
  // laesst, sieht sie fehlschlagen. Ein nacktes "expected 20 to be 0" schickt
  // denjenigen auf die Suche nach einer Regression, die es nicht gibt - deshalb
  // die Vorabpruefung unten, die stattdessen den fehlenden Schritt benennt.
  // Bewusst kein `skip`: ein stillschweigend uebersprungener Test ist schlimmer
  // als ein fehlschlagender, weil er auch dann schweigt, wenn wirklich etwas
  // kaputt ist.
  let seededDisplayNames: string[] = []
  let probeError: string | null = null

  beforeAll(async () => {
    const { data, error } = await admin
      .from('profiles')
      .select('display_name')
      .in('display_name', DEMO_USERS.map((u) => u.displayName))
    if (error) probeError = error.message
    seededDisplayNames = (data ?? []).map((row) => row.display_name as string)
  })

  function requireSeededDemoUsers(): void {
    // Ein Datenbankfehler darf nicht als "Seed fehlt" durchgehen - das waere
    // dieselbe irrefuehrende Diagnose in die andere Richtung.
    if (probeError !== null) {
      throw new Error(
        `Die Demo-Nutzer konnten nicht geprüft werden, die Datenbank hat den Zugriff ` +
          `abgelehnt: ${probeError}. Das ist kein fehlender Seed — erst SUPABASE_URL und ` +
          `SUPABASE_SERVICE_ROLE_KEY in .env prüfen.`,
      )
    }
    if (seededDisplayNames.length > 0) return
    throw new Error(
      'In der Datenbank steht kein einziger Demo-Nutzer. Das ist keine Regression, ' +
        'sondern ein fehlender Schritt: Die drei Tests in "Demo-Nutzer nach dem Seed" ' +
        'prüfen den Bestand, den `yarn seed:users` anlegt, und legen ihn bewusst nicht ' +
        'selbst an. Einmal `yarn seed:users` ausführen, danach laufen sie. ' +
        'Erwartet werden ' +
        `${DEMO_USERS.length} Profile aus scripts/data/demoUsers.ts, gefunden wurden 0.`,
    )
  }

  it('steht vollständig in der Datenbank', () => {
    requireSeededDemoUsers()
    // Die eigentliche Prüfung bleibt scharf: nicht "irgendwelche", sondern alle.
    expect(seededDisplayNames.length).toBe(DEMO_USERS.length)
  })

  it('hat bestätigte E-Mail-Adressen', async () => {
    requireSeededDemoUsers()
    // Die Mail-Bestaetigung bleibt projektweit Pflicht; Demo-Nutzer entstehen
    // deshalb ueber die Admin-API mit email_confirm.
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    expect(error).toBeNull()
    const demo = data.users.filter((u) => u.email?.startsWith('demo-'))
    expect(demo.length).toBeGreaterThanOrEqual(DEMO_USERS.length)
    expect(demo.every((u) => u.email_confirmed_at !== null)).toBe(true)
  })

  it('hat jedem Demo-Nutzer Equipment gegeben', async () => {
    // Ohne diese Vorabpruefung waere der Test der harmloseste der drei und
    // zugleich der gefaehrlichste: bei leerer Datenbank vergleicht er 0 mit 0
    // und geht gruen durch.
    requireSeededDemoUsers()
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
