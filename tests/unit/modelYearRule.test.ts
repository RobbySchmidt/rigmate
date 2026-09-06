import { describe, it, expect } from 'vitest'
import { nameContainsYear } from '../../shared/utils/modelYearRule'

describe('nameContainsYear', () => {
  it('erkennt ein vierstelliges Baujahr', () => {
    expect(nameContainsYear('Stratocaster 1963')).toBe(true)
  })

  it('erkennt die deutsche "NNer"-Kurzform', () => {
    expect(nameContainsYear('63er Strat')).toBe(true)
  })

  it('erkennt die Kurzform mit Apostroph', () => {
    expect(nameContainsYear("'63 Stratocaster")).toBe(true)
  })

  it('laesst einen sauberen Modellnamen ohne Ziffern durch', () => {
    expect(nameContainsYear('Stratocaster')).toBe(false)
  })

  it.each(['AC30', 'DS-1', '4003', 'EXL110', 'TS808'])(
    'laesst einen echten Katalognamen durch, dessen Ziffern kein Baujahr sind (%s)',
    (name) => {
      expect(nameContainsYear(name)).toBe(false)
    },
  )

  it('laesst eine jahreszahl-foermige Ziffernfolge durch, die kein eigenes Wort ist', () => {
    // "1960A" ist ein echter geseedeter Katalogeintrag (Marshall-Cabinet) -
    // kein eigenstaendiges Baujahr, weil "A" direkt anschliesst.
    expect(nameContainsYear('1960A')).toBe(false)
  })
})
