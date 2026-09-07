import { describe, it, expect } from 'vitest'
import { rarityNameClass, rarityPipClass, rarityNodeClass } from '../../shared/utils/rarityStyle'

// Durchgehend POSITIVE Zusicherungen. Ein reines "enthaelt nicht bg-rare"
// waere auch bei einem leeren Rueckgabewert gruen - und ein leerer String
// hiesse: der Punkt ist unsichtbar, der Name farblos. Jede Stufe muss
// deshalb sagen, was sie IST, nicht nur, was sie nicht ist.

describe('rarityNameClass', () => {
  it('faerbt rare in Bernstein', () => {
    expect(rarityNameClass('rare')).toBe('text-rare')
  })

  it('faerbt special in seiner eigenen Farbe', () => {
    expect(rarityNameClass('special')).toBe('text-special')
  })

  it('laesst common in der normalen Textfarbe', () => {
    expect(rarityNameClass('common')).toBe('text-ink')
  })

  it('laesst mass in der normalen Textfarbe', () => {
    expect(rarityNameClass('mass')).toBe('text-ink')
  })

  it('vertraegt null wie eine stille Stufe', () => {
    expect(rarityNameClass(null)).toBe('text-ink')
  })

  it('behandelt mass und common gleich - beide bleiben still', () => {
    expect(rarityNameClass('mass')).toBe(rarityNameClass('common'))
  })

  it('unterscheidet rare und special', () => {
    // Leuchteten beide gleich, waere die Abstufung nur noch an/aus.
    expect(rarityNameClass('rare')).not.toBe(rarityNameClass('special'))
  })

  it('traegt kein Schriftgewicht', () => {
    // Das Gewicht haengt an der Ansicht (normale Liste vs. font-semibold im
    // Signalweg) und gehoert deshalb an die Aufrufstelle, nicht hierher.
    for (const rarity of ['rare', 'special', 'common', 'mass'] as const) {
      expect(rarityNameClass(rarity)).not.toMatch(/font-/)
    }
  })
})

describe('rarityPipClass', () => {
  it('fuellt den Punkt bei rare', () => {
    expect(rarityPipClass('rare')).toBe('bg-rare border-rare')
  })

  it('laesst den Punkt bei special hohl', () => {
    expect(rarityPipClass('special')).toBe('border-special')
  })

  it('traegt den stillen Punkt bei common ueber die Deckkraft', () => {
    expect(rarityPipClass('common')).toBe('bg-line opacity-55')
  })

  it('traegt den stillen Punkt bei mass ueber die Deckkraft', () => {
    expect(rarityPipClass('mass')).toBe('bg-line opacity-55')
  })

  it('vertraegt null wie eine stille Stufe', () => {
    expect(rarityPipClass(null)).toBe('bg-line opacity-55')
  })

  it('behandelt mass und common gleich - beide bleiben still', () => {
    expect(rarityPipClass('mass')).toBe(rarityPipClass('common'))
  })

  it('unterscheidet rare und special', () => {
    expect(rarityPipClass('rare')).not.toBe(rarityPipClass('special'))
  })
})

describe('rarityNodeClass', () => {
  it('fuellt den Knoten bei rare', () => {
    expect(rarityNodeClass('rare')).toBe('bg-rare border-rare')
  })

  it('laesst den Knoten bei special hohl', () => {
    expect(rarityNodeClass('special')).toBe('border-special')
  })

  it('traegt den stillen Knoten bei common ueber den Rand', () => {
    expect(rarityNodeClass('common')).toBe('bg-surface border-line')
  })

  it('traegt den stillen Knoten bei mass ueber den Rand', () => {
    expect(rarityNodeClass('mass')).toBe('bg-surface border-line')
  })

  it('vertraegt null wie eine stille Stufe', () => {
    expect(rarityNodeClass(null)).toBe('bg-surface border-line')
  })

  it('behandelt mass und common gleich - beide bleiben still', () => {
    expect(rarityNodeClass('mass')).toBe(rarityNodeClass('common'))
  })

  it('unterscheidet rare und special', () => {
    expect(rarityNodeClass('rare')).not.toBe(rarityNodeClass('special'))
  })
})

describe('Punkt und Knoten im Verhaeltnis', () => {
  it('spricht bei ausgezeichneten Stufen dieselbe Sprache', () => {
    // Zwischen Equipment-Liste und Signalweg soll niemand umlernen muessen.
    expect(rarityNodeClass('rare')).toBe(rarityPipClass('rare'))
    expect(rarityNodeClass('special')).toBe(rarityPipClass('special'))
  })

  it('haelt die beiden stillen Zustaende bewusst auseinander', () => {
    // Der Punkt in der Liste wird von der Deckkraft getragen, der Knoten vom
    // Rand: zwischen zwei bg-line-Segmenten derselben Farbe laese sich ein
    // halbtransparenter Punkt als duennere Stelle im Kabel, nicht als
    // Station. Verschmelzen die beiden Varianten irgendwann doch, muss
    // dieser Test es sagen.
    expect(rarityNodeClass(null)).not.toBe(rarityPipClass(null))
    expect(rarityPipClass(null)).toContain('opacity-55')
    expect(rarityNodeClass(null)).toContain('border-line')
  })
})
