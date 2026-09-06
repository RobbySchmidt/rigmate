import { describe, it, expect } from 'vitest'
import { classifyGearWriteError } from '../../app/utils/gearWriteError'

describe('classifyGearWriteError', () => {
  it('erkennt die Ablehnung von Verbrauchsmaterial als Equipment', () => {
    // Wortlaut aus enforce_gear_item_rules() in der rig-Migration.
    expect(classifyGearWriteError({ message: 'consumable items belong in preferences, not in gear_items' })).toBe(
      'consumable',
    )
  })

  it('ist bei der Erkennung nicht auf Gross-/Kleinschreibung angewiesen', () => {
    expect(classifyGearWriteError({ message: 'CONSUMABLE items belong in preferences' })).toBe('consumable')
  })

  it('behandelt jede andere Fehlermeldung als generisch', () => {
    expect(classifyGearWriteError({ message: 'new row violates row-level security policy' })).toBe('generic')
  })

  it('behandelt einen fehlenden Fehler als generisch', () => {
    expect(classifyGearWriteError(null)).toBe('generic')
    expect(classifyGearWriteError(undefined)).toBe('generic')
  })
})
