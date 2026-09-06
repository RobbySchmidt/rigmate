import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { adminClient } from '../helpers/supabase'
import { createTestUser, deleteTestUsers, cookieHeaderFor, type TestUser } from '../helpers/testUser'

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3000'
const admin = adminClient()

let alice: TestUser
let stratSlug: string
let variantSlug: string

beforeAll(async () => {
  alice = await createTestUser('Alice Ampeg')

  const { data: strat } = await admin
    .from('catalog_items')
    .select('id, slug')
    .eq('name', 'Stratocaster')
    .single()
  stratSlug = strat!.slug

  const { data: variant } = await admin
    .from('catalog_items')
    .select('slug')
    .eq('name', 'Player Stratocaster')
    .single()
  variantSlug = variant!.slug

  await alice.client
    .from('gear_items')
    .insert({ owner_id: alice.id, catalog_item_id: strat!.id, year: 2018, finish: 'Sonic Blue' })
})

afterAll(async () => {
  await deleteTestUsers()
})

describe('GET /api/gear/:slug ohne Login', () => {
  it('liefert den Eintrag öffentlich', async () => {
    // Abschnitt 10: Gear-Seiten sind oeffentlich lesbar und auffindbar.
    const response = await fetch(`${BASE}/api/gear/${stratSlug}`)
    expect(response.ok).toBe(true)
    const body = await response.json()
    expect(body.item.name).toBe('Stratocaster')
    expect(body.item.brandName).toBe('Fender')
  })

  it('nennt die Zahl der Spieler, aber nicht die Namen', async () => {
    const body = await (await fetch(`${BASE}/api/gear/${stratSlug}`)).json()
    expect(body.stats.ownerCount).toBeGreaterThanOrEqual(1)
    expect(body.players).toBeNull()
  })

  it('listet die Ausführungen der Modell-Linie', async () => {
    const body = await (await fetch(`${BASE}/api/gear/${stratSlug}`)).json()
    expect(body.variants.length).toBeGreaterThan(0)
    expect(body.variants.some((v: any) => v.name === 'Player Stratocaster')).toBe(true)
  })

  it('verweist von einer Ausführung auf ihre Modell-Linie', async () => {
    const body = await (await fetch(`${BASE}/api/gear/${variantSlug}`)).json()
    expect(body.line.name).toBe('Stratocaster')
    // Die Wrinkle aus dem Task-Brief: parent_id der Ausfuehrung zeigt auf
    // dieselbe line_id wie ihre Geschwister, die Abfrage traefe also auch
    // auf die Ausfuehrung selbst. Eine Seite, die sich selbst unter
    // "Ausfuehrungen" auflistet, sieht wie ein Bug aus - deshalb schliesst
    // die Route das eigene Item explizit aus (siehe server/api/gear/[slug].get.ts).
    expect(body.variants.some((v: any) => v.slug === variantSlug)).toBe(false)
  })

  it('antwortet auf einen unbekannten Slug mit 404', async () => {
    const response = await fetch(`${BASE}/api/gear/gibt-es-nicht`)
    expect(response.status).toBe(404)
  })
})

describe('GET /api/gear/:slug mit Login', () => {
  it('nennt die Spieler beim Namen', async () => {
    // serverSupabaseUser() liest ausschliesslich den Session-Cookie (siehe
    // server/utils/authUser.ts und tests/api/catalogItemsAuth.test.ts) -
    // ein Bearer-Token wuerde diesen Pfad nie ausueben und die Route saehe
    // hier immer "nicht angemeldet". Deshalb wie im Browser ueber
    // cookieHeaderFor() statt per Authorization-Header.
    const cookie = await cookieHeaderFor(alice.email)
    const response = await fetch(`${BASE}/api/gear/${stratSlug}`, {
      headers: { Cookie: cookie },
    })
    const body = await response.json()
    expect(body.players).not.toBeNull()
    const me = body.players.find((p: any) => p.userId === alice.id)
    expect(me.displayName).toBe('Alice Ampeg')
    expect(me.year).toBe(2018)
  })
})

describe('GET /sitemap.xml', () => {
  it('listet Gear-Seiten', async () => {
    const response = await fetch(`${BASE}/sitemap.xml`)
    expect(response.ok).toBe(true)
    expect(response.headers.get('content-type')).toContain('xml')
    const xml = await response.text()
    expect(xml).toContain(`/gear/${stratSlug}`)
  })

  it('listet keine Profile', async () => {
    const xml = await (await fetch(`${BASE}/sitemap.xml`)).text()
    expect(xml).not.toContain('/profile/')
  })
})
