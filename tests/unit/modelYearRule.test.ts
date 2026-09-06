import { describe, it, expect } from 'vitest'
import { nameContainsYear } from '../../shared/utils/modelYearRule'

describe('nameContainsYear', () => {
  it('flags a plain four-digit year', () => {
    expect(nameContainsYear('Stratocaster 1963')).toBe(true)
  })

  it('flags the German "NNer" shorthand', () => {
    expect(nameContainsYear('63er Strat')).toBe(true)
  })

  it('flags the apostrophe reissue shorthand', () => {
    expect(nameContainsYear("'63 Stratocaster")).toBe(true)
  })

  it('accepts a clean model name with no digits', () => {
    expect(nameContainsYear('Stratocaster')).toBe(false)
  })

  it.each(['AC30', 'DS-1', '4003', 'EXL110', 'TS808'])(
    'accepts a real catalog name whose digits are not a year (%s)',
    (name) => {
      expect(nameContainsYear(name)).toBe(false)
    },
  )

  it('accepts a year-shaped run that is not its own word', () => {
    // "1960A" is a real seeded catalog entry (Marshall cabinet) - the "A"
    // is attached directly, so this is not a standalone year.
    expect(nameContainsYear('1960A')).toBe(false)
  })
})
