import { describe, it, expect } from 'vitest'
import {
  buildSearchable,
  matchCatalog,
  needsPrecisionHint,
  type CatalogEntry,
} from '../../server/utils/catalogMatch'

function entry(partial: Partial<CatalogEntry> & { id: string; name: string }): CatalogEntry {
  return {
    slug: `fender-${partial.id}`,
    brandName: 'Fender',
    categoryId: 'guitar',
    parentId: null,
    lineId: partial.id,
    synonyms: [],
    rarityBase: 'common',
    isVerified: true,
    ...partial,
  }
}

const STRAT = entry({ id: 'strat', name: 'Stratocaster', synonyms: ['strat'], rarityBase: 'mass' })
const AM_PRO = entry({
  id: 'ampro',
  name: 'American Professional II Stratocaster',
  parentId: 'strat',
  lineId: 'strat',
  synonyms: ['am pro ii strat'],
  rarityBase: 'common',
})
const CS_STRAT = entry({
  id: 'cs',
  name: 'Custom Shop Stratocaster',
  parentId: 'strat',
  lineId: 'strat',
  rarityBase: 'rare',
})
const AC30 = entry({
  id: 'ac30',
  name: 'AC30',
  brandName: 'Vox',
  categoryId: 'amp',
  synonyms: ['ac30', 'ac 30'],
})
const DS1 = entry({
  id: 'ds1',
  name: 'DS-1 Distortion',
  brandName: 'Boss',
  categoryId: 'pedal',
  synonyms: ['ds1'],
  rarityBase: 'mass',
})
const SLINKY = entry({
  id: 'slinky',
  name: 'Regular Slinky',
  brandName: 'Ernie Ball',
  categoryId: 'strings',
  synonyms: ['slinky'],
  rarityBase: 'mass',
})

const CATALOG = buildSearchable([STRAT, AM_PRO, CS_STRAT, AC30, DS1, SLINKY])

function ids(query: string, options?: Parameters<typeof matchCatalog>[2]) {
  return matchCatalog(query, CATALOG, options).map((m) => m.entry.id)
}

describe('buildSearchable', () => {
  it('markiert Einträge ohne Elternteil als Modell-Linie', () => {
    expect(CATALOG.find((e) => e.id === 'strat')!.level).toBe('line')
  })

  it('markiert Einträge mit Elternteil als Ausführung', () => {
    expect(CATALOG.find((e) => e.id === 'ampro')!.level).toBe('variant')
  })
})

describe('matchCatalog', () => {
  it('findet über ein Synonym', () => {
    expect(ids('strat')).toContain('strat')
  })

  it('stellt die Modell-Linie an die erste Stelle', () => {
    // Der Gelegenheitsnutzer klickt oben und ist fertig.
    expect(ids('strat')[0]).toBe('strat')
  })

  it('zeigt beide Katalogebenen nebeneinander', () => {
    const result = ids('strat')
    expect(result).toContain('strat')
    expect(result).toContain('ampro')
    expect(result).toContain('cs')
  })

  it('behandelt AC30 und AC 30 gleich', () => {
    expect(ids('AC30')[0]).toBe('ac30')
    expect(ids('AC 30')[0]).toBe('ac30')
    expect(ids('ac-30')[0]).toBe('ac30')
  })

  it('verarbeitet eine ganze Frage wie ein Stichwort', () => {
    // Suche und Eintragen sind dasselbe Problem, Abschnitt 5 der Spec.
    expect(ids('Wer hat hier einen AC30?')[0]).toBe('ac30')
  })

  it('verzeiht einen Tippfehler', () => {
    expect(ids('telecster')).toEqual([])
    expect(ids('stratocster')).toContain('strat')
  })

  it('findet über die Marke', () => {
    expect(ids('boss ds1')).toContain('ds1')
  })

  it('liefert nichts bei leerer Eingabe', () => {
    expect(ids('')).toEqual([])
    expect(ids('   ')).toEqual([])
  })

  it('liefert nichts, wenn ein Suchwort gar nicht trifft', () => {
    expect(ids('strat gurkensalat')).toEqual([])
  })

  it('filtert auf eine Kategorie, wenn verlangt', () => {
    expect(ids('slinky', { categoryId: 'strings' })).toEqual(['slinky'])
    expect(ids('slinky', { categoryId: 'pedal' })).toEqual([])
  })

  it('hält sich an das Limit', () => {
    expect(ids('strat', { limit: 2 })).toHaveLength(2)
  })
})

describe('needsPrecisionHint', () => {
  it('fragt nach, wenn die Seltenheit zwischen Ausführungen stark streut', () => {
    // Fender Stratocaster: zwischen den Ausführungen liegen Welten.
    expect(needsPrecisionHint(STRAT, [AM_PRO, CS_STRAT])).toBe(true)
  })

  it('fragt nicht nach, wenn es keine Ausführungen gibt', () => {
    // Ein DS-1 ist ein DS-1.
    expect(needsPrecisionHint(DS1, [])).toBe(false)
  })

  it('fragt nicht nach, wenn die Ausführungen ähnlich selten sind', () => {
    const a = entry({ id: 'a', name: 'AC30C2', parentId: 'ac30', lineId: 'ac30', rarityBase: 'common' })
    const b = entry({ id: 'b', name: 'AC30 Hand-Wired', parentId: 'ac30', lineId: 'ac30', rarityBase: 'special' })
    expect(needsPrecisionHint(AC30, [a, b])).toBe(false)
  })
})

describe('Auffindbarkeit ueber die Dachmarke', () => {
  it('findet die Edwards ueber "ESP Alexi", obwohl die Marke Edwards heisst', () => {
    const entries = buildSearchable([
      {
        id: 'edwards-alexi',
        name: 'Alexi Arrowhead',
        slug: 'edwards-alexi-arrowhead',
        brandName: 'Edwards',
        categoryId: 'guitar',
        parentId: null,
        lineId: 'edwards-alexi',
        synonyms: ['esp alexi', 'edwards alexi', 'arrowhead', 'alexi laiho'],
        rarityBase: 'rare',
        isVerified: true,
      },
    ])

    const treffer = matchCatalog('ESP Alexi', entries, { limit: 5 })

    expect(treffer.map((m) => m.entry.id)).toContain('edwards-alexi')
  })

  it('findet einen Saitensatz ueber seine Staerke', () => {
    const entries = buildSearchable([
      {
        id: 'exl140',
        name: 'EXL140 (10-52)',
        slug: 'daddario-exl140-10-52',
        brandName: "D'Addario",
        categoryId: 'strings',
        parentId: null,
        lineId: 'exl140',
        synonyms: ['exl140', 'exl 140', '10-52'],
        rarityBase: 'mass',
        isVerified: true,
      },
    ])

    const treffer = matchCatalog('10-52', entries, { limit: 5 })

    expect(treffer.map((m) => m.entry.id)).toContain('exl140')
  })
})
