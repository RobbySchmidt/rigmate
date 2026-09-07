import { describe, it, expect } from 'vitest'
import { buildRigEvents, type RigEventSource } from '../../shared/utils/rigEvents'

function row(overrides: Partial<RigEventSource> = {}): RigEventSource {
  return {
    id: 'g1',
    label: 'Gretsch White Falcon',
    slug: 'gretsch-white-falcon',
    detail: '1997',
    rarity: 'rare',
    createdAt: '2026-09-06T17:19:19.062Z',
    ...overrides,
  }
}

describe('buildRigEvents', () => {
  it('fasst Geraete desselben Tages zu einem Ereignis zusammen', () => {
    const events = buildRigEvents([
      row({ id: 'a', createdAt: '2026-09-06T10:00:00Z' }),
      row({ id: 'b', createdAt: '2026-09-06T18:00:00Z' }),
    ])

    // Eine Erstbefuellung des Rigs wuerde sonst zwanzig fast identische
    // Zeilen erzeugen.
    expect(events).toHaveLength(1)
    expect(events[0].items).toHaveLength(2)
  })

  it('trennt verschiedene Tage', () => {
    const events = buildRigEvents([
      row({ id: 'a', createdAt: '2026-09-06T10:00:00Z' }),
      row({ id: 'b', createdAt: '2026-09-07T10:00:00Z' }),
    ])
    expect(events).toHaveLength(2)
  })

  it('sortiert das neueste Ereignis nach vorn', () => {
    const events = buildRigEvents([
      row({ id: 'alt', createdAt: '2026-09-01T10:00:00Z' }),
      row({ id: 'neu', createdAt: '2026-09-07T10:00:00Z' }),
    ])
    expect(events[0].items[0].id).toBe('neu')
  })

  it('sortiert auch innerhalb eines Tages das neueste nach vorn', () => {
    const events = buildRigEvents([
      row({ id: 'frueh', createdAt: '2026-09-06T08:00:00Z' }),
      row({ id: 'spaet', createdAt: '2026-09-06T20:00:00Z' }),
    ])
    expect(events[0].items.map((item) => item.id)).toEqual(['spaet', 'frueh'])
  })

  it('merkt sich, ob ein Ereignis etwas Ausgezeichnetes enthaelt', () => {
    expect(buildRigEvents([row({ rarity: 'rare' })])[0].hasRarity).toBe(true)
    expect(buildRigEvents([row({ rarity: 'special' })])[0].hasRarity).toBe(true)
    expect(buildRigEvents([row({ rarity: 'common' })])[0].hasRarity).toBe(false)
    expect(buildRigEvents([row({ rarity: null })])[0].hasRarity).toBe(false)
  })

  it('erkennt eine Raritaet auch neben Allerweltsgeraeten am selben Tag', () => {
    const events = buildRigEvents([
      row({ id: 'a', rarity: 'common', createdAt: '2026-09-06T10:00:00Z' }),
      row({ id: 'b', rarity: 'rare', createdAt: '2026-09-06T11:00:00Z' }),
    ])
    expect(events[0].hasRarity).toBe(true)
  })

  it('gibt bei leerer Eingabe eine leere Liste zurueck, nicht null', () => {
    expect(buildRigEvents([])).toEqual([])
  })
})
