import { describe, it, expect } from 'vitest'
import { safeRedirect } from '../../app/utils/safeRedirect'

describe('safeRedirect', () => {
  it('lässt einen normalen internen Pfad durch', () => {
    expect(safeRedirect('/rig')).toBe('/rig')
  })

  it('lässt einen Pfad mit Query-String durch', () => {
    expect(safeRedirect('/search?q=strat')).toBe('/search?q=strat')
  })

  it('fällt bei einem protokollrelativen Ziel ("//") auf "/" zurück', () => {
    expect(safeRedirect('//evil.example')).toBe('/')
  })

  it('fällt bei einer absoluten URL auf "/" zurück', () => {
    expect(safeRedirect('https://evil.example')).toBe('/')
  })

  it('fällt bei einem relativen Pfad ohne führenden Slash auf "/" zurück', () => {
    expect(safeRedirect('rig')).toBe('/')
  })

  it('fällt bei fehlendem Wert auf "/" zurück', () => {
    expect(safeRedirect(undefined)).toBe('/')
  })

  it('fällt bei einem Array-Query-Wert auf "/" zurück', () => {
    // route.query kann bei wiederholten Query-Parametern ein Array liefern.
    expect(safeRedirect(['/rig', '/settings'])).toBe('/')
  })
})
