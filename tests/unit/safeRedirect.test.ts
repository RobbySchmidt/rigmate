import { describe, it, expect } from 'vitest'
import { safeRedirect } from '../../app/utils/safeRedirect'

describe('safeRedirect', () => {
  describe('lässt einen echten internen Pfad durch', () => {
    it.each([
      ['/rig'],
      ['/rig?x=1#y'],
      ['/'],
    ])('%s', (value) => {
      expect(safeRedirect(value)).toBe(value)
    })
  })

  describe('fällt bei allem, was navigateTo() als extern/protokollrelativ ablehnen würde, auf "/" zurück', () => {
    it.each([
      ['//evil.com'],
      ['///evil.com'],
      ['/\\evil.com'],
      ['/\\\\evil.com'],
      ['/\\/evil.com'],
      ['/ \\evil.com'],
      ['http://evil.com'],
      ['https://evil.com'],
      ['javascript:alert(1)'],
      ['rig'],
      [''],
    ])('%j', (value) => {
      expect(safeRedirect(value)).toBe('/')
    })
  })

  it('fällt bei null auf "/" zurück', () => {
    expect(safeRedirect(null)).toBe('/')
  })

  it('fällt bei undefined auf "/" zurück', () => {
    expect(safeRedirect(undefined)).toBe('/')
  })

  it('fällt bei einem Array-Query-Wert auf "/" zurück', () => {
    // Vue Router liefert bei einem wiederholten Query-Parameter ein Array.
    expect(safeRedirect(['/rig', '/settings'])).toBe('/')
  })
})
