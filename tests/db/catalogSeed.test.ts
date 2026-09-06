import { describe, it, expect } from 'vitest'
import { CATALOG } from '../../scripts/data/catalog'
import { adminClient } from '../helpers/supabase'

const admin = adminClient()

describe('Katalog-Daten', () => {
  it('enthält mindestens 200 Einträge über alle Ebenen', () => {
    const total = CATALOG.reduce((sum, line) => sum + 1 + (line.variants?.length ?? 0), 0)
    expect(total).toBeGreaterThanOrEqual(200)
  })

  it('trägt kein Baujahr im Modellnamen', () => {
    // Regel aus Abschnitt 4.1: Baujahr gehört ins Exemplar, nie in den Katalog.
    const names = CATALOG.flatMap((line) => [line.name, ...(line.variants?.map((v) => v.name) ?? [])])
    const withYear = names.filter((name) => /\b(19|20)\d{2}\b|\b\d{2}er\b/.test(name))
    expect(withYear).toEqual([])
  })

  it('trägt die Marke nicht im Modellnamen', () => {
    const offenders = CATALOG.filter((line) =>
      line.name.toLowerCase().startsWith(line.brand.toLowerCase()),
    )
    expect(offenders.map((l) => `${l.brand} / ${l.name}`)).toEqual([])
  })

  it('benutzt nur bekannte Kategorien', async () => {
    const { data } = await admin.from('categories').select('id')
    const known = new Set(data!.map((c) => c.id))
    const used = new Set(CATALOG.map((l) => l.category))
    expect([...used].filter((c) => !known.has(c))).toEqual([])
  })

  it('hat je Marke eindeutige Namen', () => {
    const seen = new Set<string>()
    const duplicates: string[] = []
    for (const line of CATALOG) {
      for (const name of [line.name, ...(line.variants?.map((v) => v.name) ?? [])]) {
        const key = `${line.brand.toLowerCase()}::${name.toLowerCase()}`
        if (seen.has(key)) duplicates.push(key)
        seen.add(key)
      }
    }
    expect(duplicates).toEqual([])
  })

  it('deckt beide Verbrauchsmaterial-Kategorien ab', () => {
    const categories = new Set(CATALOG.map((l) => l.category))
    expect(categories.has('strings')).toBe(true)
    expect(categories.has('pick')).toBe(true)
  })
})

describe('Katalog nach dem Seed', () => {
  it('ist vollständig in der Datenbank', async () => {
    const expected = CATALOG.reduce((sum, line) => sum + 1 + (line.variants?.length ?? 0), 0)
    const { count } = await admin.from('catalog_items').select('id', { count: 'exact', head: true })
    expect(count).toBeGreaterThanOrEqual(expected)
  })

  it('markiert geseedete Einträge als geprüft', async () => {
    const { count } = await admin
      .from('catalog_items')
      .select('id', { count: 'exact', head: true })
      .eq('is_verified', false)
      .is('created_by', null)
    expect(count).toBe(0)
  })

  it('hat für jede Ausführung dieselbe Marke wie die Modell-Linie', async () => {
    const { data } = await admin
      .from('catalog_items')
      .select('id, brand_id, parent:parent_id (brand_id)')
      .not('parent_id', 'is', null)
    const mismatched = (data ?? []).filter(
      (row: any) => row.parent && row.parent.brand_id !== row.brand_id,
    )
    expect(mismatched).toEqual([])
  })
})
