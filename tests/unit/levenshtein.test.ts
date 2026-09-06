import { describe, it, expect } from 'vitest'
import { levenshtein } from '../../server/utils/levenshtein'

describe('levenshtein', () => {
  it('ist null bei gleichen Wörtern', () => {
    expect(levenshtein('strat', 'strat')).toBe(0)
  })

  it('zählt einen Tippfehler als eins', () => {
    expect(levenshtein('strat', 'strap')).toBe(1)
    expect(levenshtein('telecaster', 'telecster')).toBe(1)
  })

  it('zählt Vertauschung als zwei', () => {
    expect(levenshtein('ac', 'ca')).toBe(2)
  })

  it('behandelt leere Strings', () => {
    expect(levenshtein('', 'rat')).toBe(3)
    expect(levenshtein('rat', '')).toBe(3)
    expect(levenshtein('', '')).toBe(0)
  })
})
