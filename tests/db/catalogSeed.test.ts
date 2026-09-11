import { describe, it, expect } from 'vitest'
import { CATALOG, type RarityBase } from '../../scripts/data/catalog'
import {
  findPruneBlockers,
  orderForDeletion,
  selectOrphans,
  type SeededRow,
} from '../../scripts/prune-plan'
import { nameContainsYear } from '../../shared/utils/modelYearRule'
import { adminClient } from '../helpers/supabase'

const admin = adminClient()

const RARITIES: RarityBase[] = ['mass', 'common', 'special', 'rare']

// Namen, die spätere Tasks (Demo-Daten, Checker) namentlich nachschlagen.
// Umbenennen bricht Tests, die von hier aus nicht sichtbar sind.
const PROTECTED_NAMES = [
  'Stratocaster',
  'Player Stratocaster',
  'AC30',
  'AC30C2',
  'Centaur',
  'DS-1 Distortion',
  'JB',
  'Regular Slinky',
  'White Falcon',
  'TS9 Tube Screamer',
  'TS808 Handwired',
  'Deluxe Reverb Reissue',
  'Les Paul Standard',
  'JCM800',
  '1960A',
  'Precision Bass',
  'Jazz Bass',
  'Big Muff Pi',
  'Timeline',
  'RAT',
  '4003',
  'Jazz Swing',
  'Tortex',
  'Jazz III',
  'EXL110 (10-46)',
  'Super Slinky',
]

function namesOf(line: (typeof CATALOG)[number]): string[] {
  return [line.name, ...(line.variants?.map((v) => v.name) ?? [])]
}

const ALL_NAMES = CATALOG.flatMap(namesOf)
const EXPECTED_COUNT = CATALOG.reduce((sum, line) => sum + 1 + (line.variants?.length ?? 0), 0)

function escapeForRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

describe('Katalog-Daten', () => {
  it('enthält mindestens 200 Einträge über alle Ebenen', () => {
    expect(EXPECTED_COUNT).toBeGreaterThanOrEqual(200)
  })

  it('trägt kein Baujahr im Modellnamen', () => {
    // Regel aus Abschnitt 4.1: Baujahr gehört ins Exemplar, nie in den
    // Katalog. Einzige Quelle fuer die Regel ist shared/utils/modelYearRule.ts
    // (siehe dortiger Kommentar) - eine eigene Kopie hier haette die kurze
    // Anfuehrungsform ("'63") verpasst, die die gemeinsame Regel abdeckt.
    const withYear = ALL_NAMES.filter((name) => nameContainsYear(name))
    expect(withYear).toEqual([])
  })

  it('trägt die Marke nirgends im Modellnamen', () => {
    // Prüft Linien UND Ausführungen, und sucht die Marke an jeder Stelle des
    // Namens, nicht nur am Anfang: "Fender Custom Shop Stratocaster" als
    // Ausführung wäre sonst durchgerutscht.
    const offenders: string[] = []
    for (const line of CATALOG) {
      const brand = new RegExp(`\\b${escapeForRegex(line.brand)}\\b`, 'i')
      for (const name of namesOf(line)) {
        if (brand.test(name)) offenders.push(`${line.brand} / ${name}`)
      }
    }
    expect(offenders).toEqual([])
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
      for (const name of namesOf(line)) {
        const key = `${line.brand.toLowerCase()}::${name.toLowerCase()}`
        if (seen.has(key)) duplicates.push(key)
        seen.add(key)
      }
    }
    expect(duplicates).toEqual([])
  })

  it('hat über den ganzen Katalog eindeutige Namen', () => {
    // Schärfer als "je Marke eindeutig", was die Datenbank per unique
    // (brand_id, name) ohnehin erzwingt: die Nachschlagetabelle auf der
    // Verbraucherseite ist nach dem Namen allein aufgebaut. Zwei Einträge
    // "Les Paul Standard" lösen dort stillschweigend auf die zuletzt
    // gelesene Zeile auf, ohne dass irgendetwas rot wird.
    const seen = new Set<string>()
    const duplicates: string[] = []
    for (const name of ALL_NAMES) {
      const key = name.toLowerCase()
      if (seen.has(key)) duplicates.push(name)
      seen.add(key)
    }
    expect(duplicates).toEqual([])
  })

  it('benutzt nur die vier erlaubten Seltenheitsstufen', () => {
    // Vitest wirft die Typen weg, ohne sie zu prüfen: rarity: 'masss' käme
    // sonst bis in die Datenbank und würde erst dort am Enum scheitern.
    const offenders: string[] = []
    for (const line of CATALOG) {
      if (!RARITIES.includes(line.rarity)) offenders.push(`${line.name}: ${line.rarity}`)
      for (const variant of line.variants ?? []) {
        if (!RARITIES.includes(variant.rarity)) offenders.push(`${variant.name}: ${variant.rarity}`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('deckt beide Verbrauchsmaterial-Kategorien ab', () => {
    const categories = new Set(CATALOG.map((l) => l.category))
    expect(categories.has('strings')).toBe(true)
    expect(categories.has('pick')).toBe(true)
  })

  it('enthält jeden Namen, den spätere Tasks nachschlagen', () => {
    const all = new Set(ALL_NAMES)
    expect(PROTECTED_NAMES.filter((name) => !all.has(name))).toEqual([])
  })
})

describe('Aufräum-Logik des Seeds', () => {
  // Beide Rechner arbeiten gegen dieselbe Instanz, deshalb ist eine
  // unbekannte Zeile nicht automatisch Müll -- sie kann neuer sein als
  // dieser Checkout.
  const row = (over: Partial<SeededRow>): SeededRow => ({
    id: 'id',
    name: 'Name',
    parentId: null,
    brand: 'Dunlop',
    ...over,
  })

  it('hält nur Zeilen für verwaist, die der Katalog nicht mehr nennt', () => {
    const rows = [
      row({ id: 'l1', name: 'Fuzz Face' }),
      row({ id: 'v1', name: 'Fuzz Face Mini', parentId: 'l1' }),
      row({ id: 'x1', name: 'Vom anderen Rechner', brand: 'Fender' }),
    ]
    expect(selectOrphans(rows, CATALOG).map((r) => r.name)).toEqual(['Vom anderen Rechner'])
  })

  it('unterscheidet nach Marke, nicht nur nach Name', () => {
    // "Fuzz Face" gibt es bei Dunlop, aber nicht bei Boss.
    const rows = [row({ id: 'x2', name: 'Fuzz Face', brand: 'Boss' })]
    expect(selectOrphans(rows, CATALOG)).toHaveLength(1)
  })

  it('löscht Ausführungen vor ihren Modell-Linien', () => {
    const line = row({ id: 'l9', name: 'Weg' })
    const variant = row({ id: 'v9', name: 'Weg Deluxe', parentId: 'l9' })
    expect(orderForDeletion([line, variant]).map((r) => r.name)).toEqual(['Weg Deluxe', 'Weg'])
  })

  it('verweigert das Aufräumen, wenn eine verwaiste Linie noch gültige Ausführungen trägt', () => {
    // parent_id steht auf "on delete restrict": das Löschen bräche mittendrin
    // ab und hinterliesse einen halb aufgeräumten Katalog.
    const staleLine = row({ id: 'l8', name: 'Nicht mehr im Katalog' })
    const survivor = row({ id: 'v8', name: 'Fuzz Face Mini', parentId: 'l8' })
    const rows = [staleLine, survivor]
    const blockers = findPruneBlockers(rows, selectOrphans(rows, CATALOG))
    expect(blockers).toHaveLength(1)
    expect(blockers[0].line.name).toBe('Nicht mehr im Katalog')
    expect(blockers[0].survivors.map((r) => r.name)).toEqual(['Fuzz Face Mini'])
  })

  it('blockiert nicht, wenn Linie und Ausführung beide verwaist sind', () => {
    const staleLine = row({ id: 'l7', name: 'Weg' })
    const staleVariant = row({ id: 'v7', name: 'Weg Deluxe', parentId: 'l7' })
    const rows = [staleLine, staleVariant]
    expect(findPruneBlockers(rows, selectOrphans(rows, CATALOG))).toEqual([])
  })
})

describe('Katalog nach dem Seed', () => {
  it('ist vollständig und ohne Dubletten in der Datenbank', async () => {
    // Exakt, nicht "mindestens": ein Seed, der bei jedem Lauf alles noch
    // einmal anlegt, muss hier auffallen. Gezählt werden nur geseedete
    // Zeilen, damit spätere von Nutzern angelegte Einträge den Test nicht
    // fälschlich rot machen.
    const { count } = await admin
      .from('catalog_items')
      .select('id', { count: 'exact', head: true })
      .is('created_by', null)
    expect(count).toBe(EXPECTED_COUNT)
  })

  it('hat jeden Katalognamen in der Datenbank', async () => {
    const { data, error } = await admin
      .from('catalog_items')
      .select('name')
      .is('created_by', null)
    expect(error).toBeNull()

    const inDatabase = new Set((data ?? []).map((row) => row.name))
    expect(ALL_NAMES.filter((name) => !inDatabase.has(name))).toEqual([])
    expect(PROTECTED_NAMES.filter((name) => !inDatabase.has(name))).toEqual([])
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

describe('Bereinigte preamp-Kategorie', () => {
  // Einzeln geprueft statt ueber ein "preamp enthaelt nichts Digitales
  // mehr" - eine solche Bedingung bestuende auch auf leerer Tabelle.
  const UMZUEGE: Array<[string, string]> = [
    ['Profiler', 'modeller'],
    ['Quad Cortex', 'modeller'],
    ['Axe-Fx III', 'modeller'],
    ['Helix', 'modeller'],
    ['Torpedo Captor X', 'loadbox'],
  ]

  it.each(UMZUEGE)('fuehrt "%s" in der Kategorie %s', (name, kategorie) => {
    const line = CATALOG.find((entry) => entry.name === name)
    expect(line, `"${name}" fehlt im Katalog`).toBeDefined()
    expect(line!.category).toBe(kategorie)
  })

  it('laesst keinen Modeller und keine Loadbox mehr unter preamp stehen', () => {
    const preamps = CATALOG.filter((entry) => entry.category === 'preamp').map((e) => e.name)
    for (const [name] of UMZUEGE) {
      expect(preamps).not.toContain(name)
    }
    // Die Kategorie bleibt bewohnt - sonst haette ein versehentliches
    // Leerraeumen denselben gruenen Test.
    expect(preamps.length).toBeGreaterThan(0)
  })

  it('steht mit der umgezogenen Kategorie auch wirklich in der Datenbank, nicht nur in CATALOG', async () => {
    const { data, error } = await admin
      .from('catalog_items')
      .select('name, category_id')
      .in(
        'name',
        UMZUEGE.map(([name]) => name),
      )
    expect(error).toBeNull()

    const kategorieInDb = new Map((data ?? []).map((row) => [row.name, row.category_id]))
    for (const [name, kategorie] of UMZUEGE) {
      expect(kategorieInDb.get(name), `"${name}" fehlt in der Datenbank`).toBe(kategorie)
    }
  })
})

describe('Saitenstaerken im Namen', () => {
  const UMBENANNT = ['EXL110 (10-46)', 'EXL120 (9-42)', 'NYXL1046 (10-46)']
  const ALT = ['EXL110', 'EXL120', 'NYXL1046']

  it.each(UMBENANNT)('fuehrt "%s" genau einmal', async (name) => {
    const { data, error } = await admin.from('catalog_items').select('id').eq('name', name)

    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  // Der eigentliche Punkt: die Umbenennung darf keine Dublette erzeugt
  // haben. Genau das passiert, wenn jemand sie ueber den Seed loest.
  it.each(ALT)('hat "%s" nicht als zweiten Eintrag stehen lassen', async (name) => {
    const { data, error } = await admin.from('catalog_items').select('id').eq('name', name)

    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('haelt die bestehenden Praeferenzen an den umbenannten Eintraegen', async () => {
    const { data: items, error: itemsError } = await admin
      .from('catalog_items')
      .select('id')
      .in('name', UMBENANNT)
    expect(itemsError).toBeNull()
    expect(items).toHaveLength(3)

    const { count, error } = await admin
      .from('preferences')
      .select('id', { count: 'exact', head: true })
      .in('catalog_item_id', items!.map((row) => row.id))

    expect(error).toBeNull()
    // Fuenf Demo-Nutzer bevorzugen diese drei Saetze. Waere die Umbenennung
    // ueber den Seed gelaufen, zeigten sie weiter auf die alten Eintraege
    // und dieser Wert waere 0.
    expect(count).toBe(5)
  })
})

describe('Setup des ersten echten Nutzers', () => {
  const ERWARTET: Array<{ brand: string; name: string; category: string; rarity: RarityBase }> = [
    { brand: 'LTD', name: 'Alexi-600', category: 'guitar', rarity: 'special' },
    { brand: 'Edwards', name: 'Alexi Arrowhead', category: 'guitar', rarity: 'rare' },
    { brand: 'EMG', name: 'HZ-H2', category: 'pickup', rarity: 'common' },
    { brand: 'EMG', name: 'ABQ', category: 'preamp', rarity: 'special' },
    { brand: 'ESP', name: 'MM-04', category: 'preamp', rarity: 'rare' },
    { brand: 'Randall', name: 'Satan 120', category: 'amp', rarity: 'special' },
    { brand: 'Fortin', name: 'Grind', category: 'pedal', rarity: 'special' },
    { brand: 'Fortin', name: 'Zuul+', category: 'pedal', rarity: 'common' },
    { brand: 'Fortin', name: 'Natas Distortion', category: 'pedal', rarity: 'common' },
    { brand: 'Two Notes', name: 'Torpedo Reload', category: 'loadbox', rarity: 'special' },
    { brand: 'Neural DSP', name: 'Fortin NTS Suite', category: 'plugin', rarity: 'special' },
    { brand: "D'Addario", name: 'EXL140 (10-52)', category: 'strings', rarity: 'mass' },
    { brand: "D'Addario", name: 'NYXL0980 (9-80)', category: 'strings', rarity: 'special' },
  ]

  it.each(ERWARTET)('fuehrt $brand $name als $category ($rarity)', ({ brand, name, category, rarity }) => {
    const line = CATALOG.find((entry) => entry.name === name)
    expect(line, `"${name}" fehlt im Katalog`).toBeDefined()
    expect(line!.brand).toBe(brand)
    expect(line!.category).toBe(category)
    expect(line!.rarity).toBe(rarity)
  })

  // Zweistufig nur dort, wo die Seltenheit wirklich spreizt. Eine Linie mit
  // genau einer Ausfuehrung behauptet eine Spreizung, die es nicht gibt -
  // darum wird die jeweils verbreitete Ausfuehrung mit angelegt.
  it.each([
    { linie: 'Blackjack ATX', ausfuehrungen: ['Blackjack ATX C-1', 'Blackjack ATX C-8'] },
    { linie: 'Nazgul', ausfuehrungen: ['Nazgul 7', 'Nazgul 8'] },
  ])('spreizt $linie ueber mehrere Ausfuehrungen', ({ linie, ausfuehrungen }) => {
    const line = CATALOG.find((entry) => entry.name === linie)
    expect(line, `Linie "${linie}" fehlt`).toBeDefined()
    const namen = line!.variants?.map((v) => v.name) ?? []
    expect(namen).toEqual(ausfuehrungen)

    const stufen = new Set([line!.rarity, ...(line!.variants?.map((v) => v.rarity) ?? [])])
    expect(stufen.size).toBeGreaterThan(1)
  })

  it.each(['Randall', 'Fortin', 'Edwards'])('kennt die Marke %s', (brand) => {
    expect(CATALOG.some((entry) => entry.brand === brand)).toBe(true)
  })

  // Alle 19 Eintraege, diesmal gegen echte Supabase-Queries statt gegen das
  // statische CATALOG-Array. Iteriert wird ueber die Erwartungsliste, nicht
  // ueber das Abfrageergebnis -- sonst waere eine leere Antwort ebenfalls
  // gruen (derselbe Fehler, der in Task 2 schon einmal auftrat).
  const ALLE_NEUEN_EINTRAEGE: Array<{ brand: string; name: string; category: string; rarity: RarityBase }> = [
    ...ERWARTET,
    { brand: 'Schecter', name: 'Blackjack ATX', category: 'guitar', rarity: 'special' },
    { brand: 'Schecter', name: 'Blackjack ATX C-1', category: 'guitar', rarity: 'common' },
    { brand: 'Schecter', name: 'Blackjack ATX C-8', category: 'guitar', rarity: 'rare' },
    { brand: 'Seymour Duncan', name: 'Nazgul', category: 'pickup', rarity: 'common' },
    { brand: 'Seymour Duncan', name: 'Nazgul 7', category: 'pickup', rarity: 'special' },
    { brand: 'Seymour Duncan', name: 'Nazgul 8', category: 'pickup', rarity: 'special' },
  ]

  it.each(ALLE_NEUEN_EINTRAEGE)(
    'steht $brand $name als $category ($rarity) in der Datenbank',
    async ({ brand, name, category, rarity }) => {
      const { data, error } = await admin
        .from('catalog_items')
        .select('category_id, rarity_base, brands ( name )')
        .eq('name', name)
        .single()

      expect(error, `Query fuer "${name}" schlug fehl: ${error?.message}`).toBeNull()
      expect(data, `"${name}" fehlt in der Datenbank`).toBeTruthy()
      expect((data as any)?.brands?.name).toBe(brand)
      expect(data?.category_id).toBe(category)
      expect(data?.rarity_base).toBe(rarity)
    },
  )

  // Die Zweistufigkeit ist nur echt, wenn die Ausfuehrungen auch in der
  // Datenbank per parent_id an ihrer Linie haengen, nicht nur im
  // CATALOG-Array nebeneinanderstehen.
  it.each([
    { linie: 'Blackjack ATX', ausfuehrungen: ['Blackjack ATX C-1', 'Blackjack ATX C-8'] },
    { linie: 'Nazgul', ausfuehrungen: ['Nazgul 7', 'Nazgul 8'] },
  ])('haengt die Ausfuehrungen von $linie in der Datenbank per parent_id an ihrer Linie', async ({ linie, ausfuehrungen }) => {
    const { data: lineRow, error: lineError } = await admin
      .from('catalog_items')
      .select('id')
      .eq('name', linie)
      .single()
    expect(lineError, `Linie "${linie}" fehlt in der Datenbank`).toBeNull()
    expect(lineRow).toBeTruthy()

    for (const name of ausfuehrungen) {
      const { data, error } = await admin
        .from('catalog_items')
        .select('parent_id')
        .eq('name', name)
        .single()
      expect(error, `"${name}" fehlt in der Datenbank`).toBeNull()
      expect(data?.parent_id, `"${name}" haengt nicht per parent_id an "${linie}"`).toBe(lineRow!.id)
    }
  })
})
