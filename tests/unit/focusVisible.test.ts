import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

function walk(dir: string): string[] {
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return []
  }
  return entries.flatMap((name) => {
    const full = join(dir, name)
    try {
      return statSync(full).isDirectory() ? walk(full) : [full]
    } catch {
      // Ein kaputter Symlink soll einen Befund ergeben koennen, nicht den
      // ganzen Lauf abbrechen.
      return []
    }
  })
}

/**
 * Genau EIN Fokusbild in der ganzen App.
 *
 * Seit die Rahmen weg sind, ist der Ring an einem Eingabefeld die einzige
 * Anzeige, dass die Tastatur dort steht - kein Schmuck, sondern die
 * Bedienung selbst. Vor diesem Waechter gab es vier Anzeigen dafuer:
 * focus-visible:ring-* (neu, aus den Tasks 6 bis 8),
 * focus-visible:outline-* (in ProfileHeader.vue, von vor dem Umbau),
 * focus-visible:bg-surface-2 (am Ergebniszeilen-Knopf des CatalogPicker)
 * und den nativen Browser-Fokus an den Textknoepfen, die nie einen Rahmen
 * trugen und deshalb aus der Regel fielen. Jede Entscheidung dafuer war
 * einzeln richtig; das Ergebnis war es nicht.
 */
export function focusOffenses(file: string, content: string): string[] {
  const out: string[] = []

  for (const m of content.matchAll(/focus-visible:outline[a-z0-9[\]/.-]*/g)) {
    out.push(`${file}: ${m[0]} - das Fokusbild ist der Ring, nicht die Umrisslinie`)
  }

  // FIX (Task 9b, waehrend TDD gefunden): die urspruengliche Lookahead
  // schloss nur ring-2/ring-accent/ring-offset aus, nicht "outline" - jedes
  // focus-visible:outline-* fiel damit ZWEIMAL auf (hier UND in der
  // Schleife darueber), und der Gegenprobe-Test unten (toHaveLength(1) fuer
  // outline-2/outline-accent) waere unabhaengig vom Stand von app/ IMMER rot
  // geblieben. "outline" ergaenzt, damit jede Verletzung genau einmal
  // gemeldet wird - siehe Bericht zu Task 9b.
  for (const m of content.matchAll(
    /focus-visible:(?!ring-2\b|ring-accent\b|ring-offset|outline)[a-z][a-z0-9-]*/g,
  )) {
    out.push(`${file}: ${m[0]} - eigenes Fokusbild; erlaubt ist nur ring-2, ring-accent, ring-offset-*`)
  }

  // ring-2 ohne ring-accent ist ein FARBLOSER Ring: er faellt auf
  // currentColor zurueck und ist je nach Textfarbe unsichtbar. Genau die
  // Sorte Fehlschlag, die aussieht, als sei nichts passiert.
  const two = [...content.matchAll(/focus-visible:ring-2\b/g)].length
  const coloured = [...content.matchAll(/focus-visible:ring-accent\b/g)].length
  if (two !== coloured) {
    out.push(`${file}: ${two}x ring-2 gegen ${coloured}x ring-accent - beide gehoeren zusammen`)
  }

  // outline-none gehoert zum Muster wie die beiden Ring-Klassen. Fehlt es,
  // zeigt der Browser seinen eigenen Umriss ZUSAETZLICH zum Ring - zwei
  // Fokusbilder an einem Element, also genau das, was dieser Task abschafft.
  // Drei Karten-Links aus Task 8 waren so gebaut, und der Waechter konnte es
  // in seiner ersten Fassung nicht sehen.
  const outlineNone = [...content.matchAll(/\boutline-none\b/g)].length
  if (two > outlineNone) {
    out.push(`${file}: ${two}x ring-2 gegen ${outlineNone}x outline-none - outline-none gehoert dazu`)
  }

  return out
}

describe('Fokusbild in app/', () => {
  it('benutzt genau ein Muster, ueberall', () => {
    const offenses = walk('app')
      .filter((file) => file.endsWith('.vue'))
      .flatMap((file) => focusOffenses(file, readFileSync(file, 'utf8')))
    expect(offenses, offenses.join('\n')).toEqual([])
  })

  it('wuerde jede Abweichung tatsaechlich melden', () => {
    // Ruft dieselbe Funktion auf wie der Test darueber, mit konstruierten
    // schlechten Eingaben. Eine Gegenprobe, die die Regexe nachbaut, wuerde
    // nur beweisen, dass ein Regex dieser Bauart greift - nicht dass der
    // benutzte greift.
    expect(focusOffenses('x.vue', 'focus-visible:outline-2')).toHaveLength(1)
    expect(focusOffenses('x.vue', 'focus-visible:outline-accent')).toHaveLength(1)
    expect(focusOffenses('x.vue', 'focus-visible:bg-surface-2')).toHaveLength(1)
    expect(focusOffenses('x.vue', 'focus-visible:underline')).toHaveLength(1)
    // Farbloser Ring UND fehlendes outline-none - zwei unabhaengige
    // Befunde fuer dieselbe Eingabe, seit outline-none mitgezaehlt wird.
    expect(focusOffenses('x.vue', 'focus-visible:ring-2')).toHaveLength(2)
    expect(focusOffenses('x.vue', 'focus-visible:ring-accent')).toHaveLength(1)
    // Ring ohne outline-none: der Browser zeigt seinen Umriss zusaetzlich.
    expect(focusOffenses('x.vue', 'focus-visible:ring-2 focus-visible:ring-accent')).toHaveLength(1)
    // Mit outline-none ist das Muster vollstaendig und meldet nichts.
    expect(
      focusOffenses('x.vue', 'outline-none focus-visible:ring-2 focus-visible:ring-accent'),
    ).toEqual([])
    // Das erlaubte Muster meldet nichts, auch mit Offset:
    expect(focusOffenses('x.vue', 'outline-none focus-visible:ring-2 focus-visible:ring-accent')).toEqual([])
    expect(
      focusOffenses(
        'x.vue',
        'outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
      ),
    ).toEqual([])
  })
})
