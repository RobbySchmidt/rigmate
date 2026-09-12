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

// Klassennamen stehen nicht nur in .vue-Dateien: shared/utils/rarityStyle.ts
// gibt sie als Strings zurueck. Wer nur app/**/*.vue scannt, uebersieht
// genau die Stelle, an der die Seltenheitsfarben herkommen.
function sources(): string[] {
  return [...walk('app'), ...walk('shared')].filter(
    (file) => file.endsWith('.vue') || file.endsWith('.ts'),
  )
}

// Alle Farbfamilien von Tailwind, nicht eine Handvoll ausgedachter Muster.
// Genau daran ist die Farbtoken-Umstellung einmal gescheitert: das Muster
// aus dem damaligen Plan meldete "sauber", waehrend text-amber-700,
// text-green-700 und text-neutral-400 unangetastet dastanden.
const TAILWIND_FAMILIES = [
  'slate', 'gray', 'zinc', 'neutral', 'stone',
  'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal',
  'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose',
]

const COLOR_PREFIXES = [
  'bg', 'text', 'border', 'divide', 'ring', 'outline',
  'fill', 'stroke', 'from', 'via', 'to', 'shadow', 'accent', 'caret', 'decoration', 'placeholder',
]

const ALLOWED_RADII = new Set(['rounded-card', 'rounded-field', 'rounded-btn', 'rounded-full'])

/* --- Die drei Pruefungen. Jede steht hier EINMAL, und der vierte Test ruft
   genau diese Funktionen mit konstruierten schlechten Eingaben auf. Eine
   Gegenprobe, die die Logik nachbaut statt sie zu benutzen, beweist nur,
   dass ein Regex dieser Bauart greift - nicht dass der benutzte greift. --- */

function paletteOffenses(file: string, content: string): string[] {
  const families = new RegExp(
    `\\b(?:${COLOR_PREFIXES.join('|')})-(?:${TAILWIND_FAMILIES.join('|')})(?:-\\d{2,3})?\\b`,
    'g',
  )
  const plain = /\b(?:bg|text|border|divide)-(?:white|black)\b/g
  return [
    ...[...content.matchAll(families)].map((m) => m[0]),
    ...[...content.matchAll(plain)].map((m) => m[0]),
  ].map((hit) => `${file}: ${hit} - Farben kommen aus den Tokens in main.css`)
}

function radiusOffenses(file: string, content: string): string[] {
  // JEDE rounded-Schreibweise einsammeln und gegen die Erlaubnisliste
  // halten - nicht die verbotenen aufzaehlen. Eine Aufzaehlung waere
  // lueckenhaft: sie uebersieht rounded-t-lg, rounded-l-sm und
  // rounded-[4px] alle drei.
  const anyRounded = /\brounded(?:-[a-z0-9[\]%.-]+)?/g
  return [...content.matchAll(anyRounded)]
    .map((m) => m[0])
    .filter((name) => !ALLOWED_RADII.has(name))
    .map(
      (hit) =>
        `${file}: "${hit}" - erlaubt sind nur ${[...ALLOWED_RADII].join(', ')}. ` +
        'Fuer eine neue Form gehoert ein Token mit Rollenbezug in main.css, kein Einzelwert.',
    )
}

function legacyOffenses(file: string, content: string): string[] {
  const out: string[] = []
  for (const m of content.matchAll(/\b(?:border|divide|bg|text|ring)-line-soft\b/g)) {
    out.push(`${file}: ${m[0]} - es gibt nur noch --rm-line`)
  }
  // font-display setzt nur die Familie. display setzt Familie plus Breite 88
  // plus Laufweite - und die Breite ist der sichtbarste Teil der ganzen
  // Designsprache. Eine Stelle, die font-display behaelt, traegt die Schrift
  // ohne die Verengung und faellt aus dem Bild. Genau das waere fast
  // passiert: font-display stand an 14 Stellen in 7 Dateien.
  for (const m of content.matchAll(/\bfont-display\b/g)) {
    out.push(`${file}: ${m[0]} - die Display-Rolle heisst "display" und bringt die Breite mit`)
  }
  // Tiefe kommt aus Flaechenfarbe. Die einzige Hierarchie, die auf dieser
  // Oberflaeche etwas bedeuten soll, ist die Seltenheit - ein Schatten, der
  // "dieses Element ist wichtiger" sagt, konkurriert damit. shadow-none ist
  // erlaubt, es schaltet ja gerade ab.
  for (const m of content.matchAll(/\bshadow-(?!none\b)[a-z0-9-]+/g)) {
    out.push(`${file}: ${m[0]} - die Designsprache ist flach`)
  }
  return out
}

function scan(check: (file: string, content: string) => string[]): string[] {
  return sources().flatMap((file) => check(file, readFileSync(file, 'utf8')))
}

describe('Design-Utilities in app/ und shared/', () => {
  it('benutzt keine fest verdrahtete Tailwind-Palettenfarbe', () => {
    const offenses = scan(paletteOffenses)
    expect(offenses, offenses.join('\n')).toEqual([])
  })

  it('benutzt nur die drei Radien-Rollen und rounded-full', () => {
    const offenses = scan(radiusOffenses)
    expect(offenses, offenses.join('\n')).toEqual([])
  })

  it('benutzt kein line-soft, kein font-display und keinen Schatten', () => {
    const offenses = scan(legacyOffenses)
    expect(offenses, offenses.join('\n')).toEqual([])
  })

  it('wuerde jedes der drei Muster tatsaechlich melden', () => {
    // Diese Gegenprobe ruft DIESELBEN Funktionen auf wie die drei Tests
    // oben. Eine Gegenprobe, die die Regexe nachbaut, beweist nur, dass ein
    // Regex dieser Bauart greift - nicht dass der benutzte greift. Genau das
    // hat der Review von Task 2b an der ersten Fassung dieser Waechter
    // beanstandet, und es ist dieselbe Familie wie der Fehler, der diesen
    // Plan ausgeloest hat: ein Test, der aus dem falschen Grund gruen ist.
    const hits = (found: string[]) => found.map((line) => line.split(': ')[1]?.split(' - ')[0] ?? line)

    expect(hits(paletteOffenses('x.vue', 'class="text-amber-700"'))).toEqual(['text-amber-700'])
    expect(hits(paletteOffenses('x.vue', 'class="text-neutral-400 bg-green-700"'))).toEqual([
      'text-neutral-400',
      'bg-green-700',
    ])
    expect(paletteOffenses('x.vue', 'class="bg-white"')).toHaveLength(1)
    expect(paletteOffenses('x.vue', 'class="text-rare text-muted bg-surface"')).toEqual([])

    // Die drei Faelle, die eine Aufzaehlung der verbotenen Namen
    // uebersehen haette:
    expect(radiusOffenses('x.vue', 'class="rounded border"')).toHaveLength(1)
    expect(radiusOffenses('x.vue', 'class="rounded-sm"')).toHaveLength(1)
    expect(radiusOffenses('x.vue', 'class="rounded-t-lg"')).toHaveLength(1)
    expect(radiusOffenses('x.vue', 'class="rounded-l-sm"')).toHaveLength(1)
    expect(radiusOffenses('x.vue', 'class="rounded-[4px]"')).toHaveLength(1)
    // Und die erlaubten bleiben unangetastet, auch mit Variantenpraefix.
    expect(radiusOffenses('x.vue', 'class="rounded-card rounded-field"')).toEqual([])
    expect(radiusOffenses('x.vue', 'class="md:rounded-btn hover:rounded-full"')).toEqual([])

    expect(legacyOffenses('x.vue', 'class="divide-line-soft"')).toHaveLength(1)
    expect(legacyOffenses('x.vue', 'class="font-display font-semibold"')).toHaveLength(1)
    expect(legacyOffenses('x.vue', 'class="shadow-lg"')).toHaveLength(1)
    expect(legacyOffenses('x.vue', 'class="shadow-none display border-line"')).toEqual([])
  })
})
