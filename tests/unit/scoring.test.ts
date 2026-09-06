import { describe, it, expect } from 'vitest'
import {
  COMBO_FACTOR,
  comparePair,
  matchDepth,
  matchScore,
  pairScore,
  type OwnedEntry,
  type SharedMatch,
  type UserRig,
} from '../../server/utils/scoring'

function gear(catalogItemId: string, lineId: string, year: number | null = null): OwnedEntry {
  return { catalogItemId, lineId, year, kind: 'gear' }
}

function consumable(catalogItemId: string): OwnedEntry {
  return { catalogItemId, lineId: catalogItemId, year: null, kind: 'consumable' }
}

function rig(userId: string, owned: OwnedEntry[], wished: { catalogItemId: string; lineId: string }[] = []): UserRig {
  return { userId, owned, wished }
}

const flatRarity = () => 1

describe('matchDepth — die Tabelle aus Abschnitt 6', () => {
  it('Strat / Strat trifft auf der Modell-Linie', () => {
    expect(matchDepth(gear('strat', 'strat'), gear('strat', 'strat'))).toBe('line')
  })

  it('American Pro II / Strat trifft auf der Modell-Linie', () => {
    expect(matchDepth(gear('ampro', 'strat'), gear('strat', 'strat'))).toBe('line')
  })

  it('American Pro II / American Pro II trifft auf der Ausführung', () => {
    expect(matchDepth(gear('ampro', 'strat'), gear('ampro', 'strat'))).toBe('variant')
  })

  it('gleiche Ausführung mit gleichem Baujahr trifft am tiefsten', () => {
    expect(matchDepth(gear('ampro', 'strat', 1963), gear('ampro', 'strat', 1963))).toBe('variant_year')
  })

  it('gleiche Ausführung mit verschiedenem Baujahr bleibt auf der Ausführung', () => {
    expect(matchDepth(gear('ampro', 'strat', 1963), gear('ampro', 'strat', 2021))).toBe('variant')
  })

  it('verschiedene Modell-Linien treffen sich nicht', () => {
    expect(matchDepth(gear('strat', 'strat'), gear('lp', 'lp'))).toBeNull()
  })
})

describe('matchScore', () => {
  it('steigt mit der Tiefe', () => {
    expect(matchScore('gear', 'line', 1)).toBeLessThan(matchScore('gear', 'variant', 1))
    expect(matchScore('gear', 'variant', 1)).toBeLessThan(matchScore('gear', 'variant_year', 1))
  })

  it('steigt mit der Seltenheit', () => {
    expect(matchScore('gear', 'variant', 0.25)).toBeLessThan(matchScore('gear', 'variant', 1.5))
  })

  it('gewichtet Verbrauchsmaterial niedriger als Equipment', () => {
    // "Wir spielen beide Ernie Ball Slinky" ist ein starker Identitaets-Marker,
    // aber ein schwaches Uebereinstimmungs-Signal.
    expect(matchScore('consumable', 'line', 1)).toBeLessThan(matchScore('gear', 'line', 1))
  })

  it('gewichtet einen Wunsch zwischen Verbrauchsmaterial und Equipment', () => {
    expect(matchScore('wish', 'line', 1)).toBeGreaterThan(matchScore('consumable', 'line', 1))
    expect(matchScore('wish', 'line', 1)).toBeLessThan(matchScore('gear', 'line', 1))
  })
})

describe('pairScore', () => {
  it('ist bei einem einzelnen Treffer die Summe', () => {
    const single = [{ kind: 'gear', depth: 'variant', catalogItemId: 'a', lineId: 'a', score: 1 }] as const
    expect(pairScore([...single])).toBeCloseTo(1)
  })

  it('belohnt Kombinationen überproportional', () => {
    // "Ihr fahrt beide einen Tube Screamer in einen Deluxe Reverb" ist eine
    // andere Aussage als zwei zufaellige Einzeltreffer.
    const two = [
      { kind: 'gear', depth: 'variant', catalogItemId: 'ts', lineId: 'ts', score: 1 },
      { kind: 'gear', depth: 'variant', catalogItemId: 'dr', lineId: 'dr', score: 1 },
    ] as const
    expect(pairScore([...two])).toBeGreaterThan(2)
    expect(pairScore([...two])).toBeCloseTo(2 + COMBO_FACTOR * 2)
  })

  it('gibt keinen Kombinations-Bonus für Verbrauchsmaterial allein', () => {
    const consumables = [
      { kind: 'consumable', depth: 'line', catalogItemId: 's1', lineId: 's1', score: 0.3 },
      { kind: 'consumable', depth: 'line', catalogItemId: 's2', lineId: 's2', score: 0.3 },
    ] as const
    expect(pairScore([...consumables])).toBeCloseTo(0.6)
  })

  it('ist null ohne Treffer', () => {
    expect(pairScore([])).toBe(0)
  })

  it('deckelt den Kombinationsbonus bei einem Multiplikator von 2', () => {
    // Ab genug geteilten Massenware-Treffern waechst der Multiplikator ohne
    // Deckel ueber 2 - hier mit zwoelf geteilten Geraeten bewusst so weit
    // getrieben, dass die Deckelung tatsaechlich greift (2.65 ungedeckelt).
    const many: SharedMatch[] = Array.from({ length: 12 }, (_, i) => ({
      kind: 'gear',
      depth: 'variant',
      catalogItemId: `g${i}`,
      lineId: `g${i}`,
      score: 1,
    }))
    const base = many.length
    const uncappedMultiplier = 1 + COMBO_FACTOR * (many.length - 1)
    expect(uncappedMultiplier).toBeGreaterThan(2)
    expect(pairScore(many)).toBeCloseTo(base * 2)
  })
})

describe('comparePair', () => {
  it('findet den geteilten Treffer', () => {
    const me = rig('me', [gear('ac30', 'ac30')])
    const other = rig('other', [gear('ac30', 'ac30')])
    const result = comparePair(me, other, flatRarity)
    expect(result.matches).toHaveLength(1)
    expect(result.matches[0]!.catalogItemId).toBe('ac30')
    expect(result.score).toBeGreaterThan(0)
  })

  it('zählt eine Modell-Linie nur einmal, auch bei mehreren Exemplaren', () => {
    // Wer drei Strats hat, ist nicht dreimal so verbunden.
    const me = rig('me', [gear('ampro', 'strat'), gear('player', 'strat'), gear('strat', 'strat')])
    const other = rig('other', [gear('strat', 'strat')])
    expect(comparePair(me, other, flatRarity).matches).toHaveLength(1)
  })

  it('nimmt bei mehreren Möglichkeiten den tiefsten Treffer', () => {
    const me = rig('me', [gear('ampro', 'strat')])
    const other = rig('other', [gear('strat', 'strat'), gear('ampro', 'strat')])
    expect(comparePair(me, other, flatRarity).matches[0]!.depth).toBe('variant')
  })

  it('erkennt "du hast, was ich suche"', () => {
    const me = rig('me', [], [{ catalogItemId: 'klon', lineId: 'klon' }])
    const other = rig('other', [gear('klon', 'klon')])
    const result = comparePair(me, other, flatRarity)
    expect(result.matches[0]!.kind).toBe('wish')
  })

  it('erkennt die Gegenrichtung ebenso', () => {
    const me = rig('me', [gear('klon', 'klon')])
    const other = rig('other', [], [{ catalogItemId: 'klon', lineId: 'klon' }])
    expect(comparePair(me, other, flatRarity).matches[0]!.kind).toBe('wish')
  })

  it('gewichtet seltene Treffer stärker', () => {
    const me = rig('me', [gear('klon', 'klon')])
    const other = rig('other', [gear('klon', 'klon')])
    const rare = comparePair(me, other, () => 1.5).score
    const common = comparePair(me, other, () => 0.25).score
    expect(rare).toBeGreaterThan(common)
  })

  it('ist null bei leeren Rigs', () => {
    expect(comparePair(rig('me', []), rig('other', []), flatRarity).score).toBe(0)
  })

  it('ist null ohne Überschneidung', () => {
    const me = rig('me', [gear('strat', 'strat')])
    const other = rig('other', [gear('lp', 'lp')])
    expect(comparePair(me, other, flatRarity).score).toBe(0)
  })
})
