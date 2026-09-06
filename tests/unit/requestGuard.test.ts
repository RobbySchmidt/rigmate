import { describe, it, expect } from 'vitest'
import { createRequestGuard } from '../../app/utils/requestGuard'

describe('createRequestGuard', () => {
  it('haelt das erste Ticket fuer aktuell, solange nichts Neueres kam', () => {
    const guard = createRequestGuard()
    const ticket = guard.next()
    expect(guard.isCurrent(ticket)).toBe(true)
  })

  it('macht ein altes Ticket ungueltig, sobald ein neues gezogen wurde', () => {
    // Genau der Fall aus dem Bug: eine langsame Antwort auf "str" darf eine
    // schnellere Antwort auf "strat" nicht mehr ueberschreiben.
    const guard = createRequestGuard()
    const staleTicket = guard.next()
    const freshTicket = guard.next()
    expect(guard.isCurrent(staleTicket)).toBe(false)
    expect(guard.isCurrent(freshTicket)).toBe(true)
  })

  it('macht auch das Leeren des Suchfelds zu einem neuen Ticket', () => {
    // Ein Leeren mitten im Flug muss die noch laufende Anfrage entwerten.
    const guard = createRequestGuard()
    const inFlight = guard.next()
    const cleared = guard.next()
    expect(guard.isCurrent(inFlight)).toBe(false)
    expect(guard.isCurrent(cleared)).toBe(true)
  })
})
