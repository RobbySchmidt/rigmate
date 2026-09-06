import { describe, it, expect } from 'vitest'
import { normalize, tokenize, meaningfulTokens } from '../../server/utils/normalize'

describe('normalize', () => {
  it('macht klein und wirft Satzzeichen weg', () => {
    expect(normalize('Fender Stratocaster!')).toBe('fender stratocaster')
  })

  it('behandelt Bindestriche wie Leerzeichen', () => {
    expect(normalize('DS-1')).toBe('ds 1')
  })

  it('trennt an der Grenze zwischen Buchstabe und Ziffer', () => {
    // Damit AC30 und AC 30 identisch werden - der Kern des Abgleichs.
    expect(normalize('AC30')).toBe('ac 30')
    expect(normalize('AC 30')).toBe('ac 30')
    expect(normalize('DS1')).toBe('ds 1')
  })

  it('entfernt Diakritika', () => {
    expect(normalize('Röhre')).toBe('rohre')
    expect(normalize('Größe')).toBe('grosse')
  })

  it('setzt Apostrophe in Markennamen auf Leerzeichen', () => {
    expect(normalize("D'Addario")).toBe('d addario')
  })

  it('kollabiert Mehrfach-Leerzeichen', () => {
    expect(normalize('  Les    Paul  ')).toBe('les paul')
  })

  it('liefert bei leerer Eingabe einen leeren String', () => {
    expect(normalize('   ...  ')).toBe('')
  })
})

describe('tokenize', () => {
  it('zerlegt in Wörter', () => {
    expect(tokenize('Fender AC30')).toEqual(['fender', 'ac', '30'])
  })

  it('liefert bei leerer Eingabe ein leeres Array', () => {
    expect(tokenize('')).toEqual([])
  })
})

describe('meaningfulTokens', () => {
  it('wirft deutsche Füllwörter weg', () => {
    // "AC30" und "Wer hat hier einen AC30?" sind dasselbe Problem.
    expect(meaningfulTokens('Wer hat hier einen AC30?')).toEqual(['ac', '30'])
  })

  it('wirft englische Füllwörter weg', () => {
    expect(meaningfulTokens('who has a Les Paul')).toEqual(['les', 'paul'])
  })

  it('behält alles, wenn nur Füllwörter übrig blieben', () => {
    expect(meaningfulTokens('wer hat')).toEqual(['wer', 'hat'])
  })

  it('lässt einen reinen Modellnamen unangetastet', () => {
    expect(meaningfulTokens('Deluxe Reverb')).toEqual(['deluxe', 'reverb'])
  })
})
