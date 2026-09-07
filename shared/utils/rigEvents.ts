import type { RarityBase } from './rarityBase'

export interface RigEventSource {
  id: string
  label: string
  slug: string
  detail: string | null
  rarity: RarityBase | null
  createdAt: string
}

export interface RigEvent {
  /** Tagesdatum als ISO-Praefix, zugleich der Schluessel im Template. */
  day: string
  items: RigEventSource[]
  hasRarity: boolean
}

// Nur diese beiden Stufen gelten als ausgezeichnet - dieselbe Grenze wie in
// shared/utils/rarityStyle.ts (rare und special leuchten, common und mass
// bleiben still, null zaehlt wie eine stille Stufe). Ein Ereignis mit auch
// nur einem ausgezeichneten Geraet verdient im Feed eine andere Behandlung
// als eines mit lauter Allerweltspedalen.
function isNotableRarity(rarity: RarityBase | null): boolean {
  return rarity === 'rare' || rarity === 'special'
}

/**
 * Leitet Feed-Ereignisse aus vorhandenen Gear-Zeilen ab - dafuer braucht es
 * die naechste Ausbaustufe nicht, `gear_items.created_at` liegt laengst in
 * der Datenbank.
 *
 * Zusammengefasst wird je Tag: wer sein Rig zum ersten Mal eintraegt, legt
 * zwanzig Geraete in fuenf Minuten an - das waeren sonst zwanzig fast
 * identische Zeilen.
 *
 * Der Tag wird aus dem UTC-Praefix von `createdAt` gebildet (die ersten
 * zehn Zeichen eines ISO-Zeitstempels), nicht aus einer lokalen Zeitzone.
 * Ein Geraet, das kurz vor oder nach Mitternacht eingetragen wird, kann so
 * auf den fuer die eintragende Person "falschen" Kalendertag fallen -
 * hoechstens um ein, zwei Stunden verschoben. Das ist hier bewusst
 * hingenommen: diese Funktion ist eine reine Ableitung ohne Kenntnis einer
 * Zeitzone (weder die des Servers noch die der Betrachtenden gehoert in
 * `shared/`), und eine Tagesgruppierung fuer einen Feed ist ohnehin nur eine
 * grobe Zusammenfassung, keine buchhalterische Aufzeichnung. Wollte man das
 * praeziser loesen, muesste die Zeitzone der Betrachtenden an der
 * Aufrufstelle (Client) bekannt sein und dort in den Tagesschluessel
 * einfliessen - nicht hier.
 */
export function buildRigEvents(rows: RigEventSource[]): RigEvent[] {
  const byDay = new Map<string, RigEventSource[]>()

  for (const row of rows) {
    const day = row.createdAt.slice(0, 10)
    const items = byDay.get(day)
    if (items) {
      items.push(row)
    } else {
      byDay.set(day, [row])
    }
  }

  const events: RigEvent[] = []
  for (const [day, items] of byDay) {
    // Neuestes Geraet zuerst - sowohl innerhalb eines Tages als auch, ueber
    // die Sortierung der Ereignisse gleich im Anschluss, zwischen den Tagen.
    const sortedItems = [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    events.push({
      day,
      items: sortedItems,
      hasRarity: sortedItems.some((item) => isNotableRarity(item.rarity)),
    })
  }

  events.sort((a, b) => b.day.localeCompare(a.day))

  return events
}
