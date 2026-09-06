import { describe, it, expect } from 'vitest'
import { CATALOG, type SeedLine } from '../../scripts/data/catalog'
import { buildSearchable, matchCatalog, type CatalogEntry, type SearchableEntry } from '../../server/utils/catalogMatch'

// Die sechs Einträge im normalen catalogMatch.test.ts können strukturell nicht
// zeigen, was schiefgeht, wenn 241 echte Namen, Marken und Synonyme
// aufeinandertreffen: kurze Präfixe, die zufällig in langen Wörtern anderer
// Marken stecken, oder unscharfe Treffer, die sich in ein viel kürzeres,
// unverwandtes Wort hineinlöschen. Dieser Test lädt deshalb den echten Katalog.

function slugify(brand: string, name: string): string {
  return `${brand}-${name}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/** Wandelt die Seed-Struktur (Marke/Linie/Ausführung) in flache CatalogEntry-Objekte. */
function toEntries(catalog: SeedLine[]): CatalogEntry[] {
  const entries: CatalogEntry[] = []
  for (const line of catalog) {
    const lineId = slugify(line.brand, line.name)
    entries.push({
      id: lineId,
      name: line.name,
      slug: lineId,
      brandName: line.brand,
      categoryId: line.category,
      parentId: null,
      lineId,
      synonyms: line.synonyms ?? [],
      rarityBase: line.rarity,
      isVerified: true,
    })
    for (const variant of line.variants ?? []) {
      const variantId = slugify(line.brand, variant.name)
      entries.push({
        id: variantId,
        name: variant.name,
        slug: variantId,
        brandName: line.brand,
        categoryId: line.category,
        parentId: lineId,
        lineId,
        synonyms: variant.synonyms ?? [],
        rarityBase: variant.rarity,
        isVerified: true,
      })
    }
  }
  return entries
}

const REAL_CATALOG: SearchableEntry[] = buildSearchable(toEntries(CATALOG))

function top(query: string) {
  return matchCatalog(query, REAL_CATALOG)[0]?.entry
}

describe('matchCatalog gegen den echten Katalog', () => {
  // Jede Zeile ist eine Erwartung, die ein Gitarrist ohne Nachdenken teilen
  // würde: dieser Suchbegriff, dieses Ergebnis oben.
  const EXPECTED_TOP_HIT: Array<{ query: string; brand: string; name: string }> = [
    { query: 'strat', brand: 'Fender', name: 'Stratocaster' },
    { query: 'les paul', brand: 'Gibson', name: 'Les Paul' },
    { query: 'ac30', brand: 'Vox', name: 'AC30' },
    { query: 'AC 30', brand: 'Vox', name: 'AC30' },
    { query: 'Wer hat hier einen AC30?', brand: 'Vox', name: 'AC30' },
    { query: 'ds1', brand: 'Boss', name: 'DS-1 Distortion' },
    { query: 'tube screamer', brand: 'Ibanez', name: 'Tube Screamer' },
    { query: 'p bass', brand: 'Fender', name: 'Precision Bass' },
    { query: 'deluxe reverb', brand: 'Fender', name: 'Deluxe Reverb' },
    { query: 'telecaster', brand: 'Fender', name: 'Telecaster' },
    { query: 'jazzmaster', brand: 'Fender', name: 'Jazzmaster' },
    { query: 'es 335', brand: 'Gibson', name: 'ES-335' },
  ]

  it.each(EXPECTED_TOP_HIT)('"$query" landet oben bei $brand $name', ({ query, brand, name }) => {
    const hit = top(query)
    expect(hit?.brandName).toBe(brand)
    expect(hit?.name).toBe(name)
  })

  it('stellt bei einer generischen Suche die Modell-Linie voran, nicht die Ausführung', () => {
    expect(top('strat')?.level).toBe('line')
    expect(top('les paul')?.level).toBe('line')
  })

  it('regression: "p bass" zeigt in den Top 3 keinen Höfner-Treffer (Finding 1)', () => {
    // Das einzeilige Präfix "p" traf vorher zufällig auf "professional".
    const topThree = matchCatalog('p bass', REAL_CATALOG, { limit: 3 }).map((m) => m.entry.brandName)
    expect(topThree).not.toContain('Höfner')
  })

  it('regression: "strat" enthält keinerlei ProCo-Treffer (Finding 2)', () => {
    // "strat" durfte sich per Löschung nicht mehr in "rat" hineinfressen.
    const brands = matchCatalog('strat', REAL_CATALOG, { limit: 50 }).map((m) => m.entry.brandName)
    expect(brands).not.toContain('ProCo')
  })

  it('liefert bei Unsinn gar nichts', () => {
    expect(matchCatalog('gurkensalat quetschkommode', REAL_CATALOG)).toEqual([])
  })
})
