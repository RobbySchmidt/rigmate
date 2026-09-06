import { describe, it, expect } from 'vitest'
import { BASE_WEIGHTS, measuredWeight, rarityWeight } from '../../server/utils/rarity'

describe('BASE_WEIGHTS', () => {
  it('steigt von Massenware zu rar', () => {
    expect(BASE_WEIGHTS.mass).toBeLessThan(BASE_WEIGHTS.common)
    expect(BASE_WEIGHTS.common).toBeLessThan(BASE_WEIGHTS.special)
    expect(BASE_WEIGHTS.special).toBeLessThan(BASE_WEIGHTS.rare)
  })
})

describe('measuredWeight', () => {
  it('bewertet ein Gerät, das fast alle haben, als wertlos', () => {
    // 400 von 500 - als Signal wertlos.
    expect(measuredWeight(400, 500)).toBeLessThan(0.3)
  })

  it('bewertet ein Gerät, das drei Leute haben, als hochinteressant', () => {
    expect(measuredWeight(3, 500)).toBeGreaterThan(1)
  })

  it('fällt monoton mit der Verbreitung', () => {
    const weights = [1, 10, 100, 400].map((count) => measuredWeight(count, 500))
    expect(weights).toEqual([...weights].sort((a, b) => b - a))
  })

  it('stürzt bei null Nutzern nicht ab', () => {
    expect(Number.isFinite(measuredWeight(0, 0))).toBe(true)
  })
})

describe('rarityWeight', () => {
  it('folgt bei wenigen Nutzern dem Grundwert', () => {
    // 20 Nutzer: die Messung laeuft leer, der Grundwert traegt.
    const mass = rarityWeight('mass', 1, 20)
    const rare = rarityWeight('rare', 1, 20)
    expect(rare).toBeGreaterThan(mass)
    expect(mass).toBeLessThan(0.5)
  })

  it('lässt den Grundwert bei vielen Nutzern von der Messung überlagern', () => {
    // Ein Boss DS-1 mit Grundwert "mass", den aber nur 2 von 2000 haben:
    // die Messung gewinnt.
    const measured = rarityWeight('mass', 2, 2000)
    expect(measured).toBeGreaterThan(BASE_WEIGHTS.mass * 2)
  })

  it('ignoriert die Messung vollständig, wenn es keine Nutzer gibt', () => {
    expect(rarityWeight('special', 0, 0)).toBeCloseTo(BASE_WEIGHTS.special)
  })

  it('liefert nie einen negativen Wert', () => {
    for (const base of ['mass', 'common', 'special', 'rare'] as const) {
      for (const [owners, users] of [[0, 0], [1, 1], [500, 500], [0, 1000]] as const) {
        expect(rarityWeight(base, owners, users)).toBeGreaterThanOrEqual(0)
      }
    }
  })
})
