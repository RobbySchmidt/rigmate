import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const CSS_PATH = 'app/assets/css/main.css'

// Nur Verzeichnisse, die eigenen Quelltext tragen. node_modules, Build-
// Ausgaben und die Tests selbst interessieren nicht.
const CODE_DIRS = ['app', 'shared', 'server', 'scripts']

function walk(dir: string): string[] {
  // Kein aeusseres try/catch mehr: ein verschwundenes Wurzelverzeichnis soll
  // laut scheitern, nicht als "nichts gefunden" durchgehen - siehe
  // tests/unit/locale.test.ts und tests/unit/draggableItemSlot.test.ts fuer
  // dasselbe Muster.
  const entries = readdirSync(dir)
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
 * Die Namen der Projekt-Farbtoken, aus main.css gelesen statt hier
 * gedoppelt: --color-rare -> "rare". Kommt ein Token dazu, deckt der
 * Waechter es automatisch mit ab.
 */
function projectColorNames(css: string): string[] {
  return [...css.matchAll(/--color-([a-z0-9-]+)\s*:/g)].map((match) => match[1])
}

/**
 * Dieselbe Ableitung fuer die Radien- und Schrift-Tokens: --radius-card ->
 * "card", --font-mono -> "mono". Ein 'rounded-card'- oder 'font-mono'-String
 * in shared/utils/rarityStyle.ts waere sonst so unsichtbar gewesen wie es
 * 'border-special' vor diesem Waechter war.
 */
function projectRadiusNames(css: string): string[] {
  return [...css.matchAll(/--radius-([a-z0-9-]+)\s*:/g)].map((match) => match[1])
}

function projectFontNames(css: string): string[] {
  return [...css.matchAll(/--font-([a-z0-9-]+)\s*:/g)].map((match) => match[1])
}

const COLOR_UTILITY_PREFIXES = [
  'bg', 'text', 'border', 'divide', 'ring', 'outline', 'fill', 'stroke', 'from', 'via', 'to',
]

/**
 * Ob ein Quelltext eine der Projekt-Utilities benutzt (bg-rare, text-muted,
 * border-special, divide-line, rounded-card, font-mono, ...). Steht einmal
 * auf Modulebene, damit die Gegenprobe unten sie aufruft statt den Regex
 * nachzubauen - ein nachgebauter Regex wuerde nur beweisen, dass ein Regex
 * dieser Bauart greift, nicht dass der tatsaechlich benutzte greift.
 *
 * `prefixes` ist konfigurierbar, weil Radien und Schriften andere
 * Praefixe tragen als Farben: rounded-card, nicht bg-card.
 */
function carriesProjectUtility(
  content: string,
  names: string[],
  prefixes: string[] = COLOR_UTILITY_PREFIXES,
): boolean {
  const utility = new RegExp(`\\b(?:${prefixes.join('|')})-(?:${names.join('|')})\\b`)
  return utility.test(content)
}

/**
 * Die Verzeichnisnamen aus den @source-Deklarationen einer CSS-Datei.
 * @source-Pfade stehen relativ zur CSS-Datei; hier interessiert nur das
 * letzte Wegstueck. "../../../shared" wird zu "shared".
 */
function declaredSourceDirs(css: string): string[] {
  return [...css.matchAll(/@source\s+["']([^"']+)["']/g)].map(
    (match) => match[1].replace(/\/+$/, '').split('/').filter((part) => part !== '..').pop() ?? '',
  )
}

describe('Tailwind-Scanabdeckung', () => {
  it('nennt jedes Verzeichnis mit Projekt-Utilities in einem @source', () => {
    const css = readFileSync(CSS_PATH, 'utf8')
    const names = projectColorNames(css)
    const radiusNames = projectRadiusNames(css)
    const fontNames = projectFontNames(css)
    expect(names.length).toBeGreaterThan(5)
    expect(radiusNames.length).toBeGreaterThan(0)
    expect(fontNames.length).toBeGreaterThan(0)

    // Nichtleerheits-Zusicherung: heute liegen ueber app/shared/server/
    // scripts zusammen 60 Dateien. Ohne diese Zusicherung waere der Test
    // GRUEN, wenn walk() aus irgendeinem Grund (falscher Pfad, leeres
    // Verzeichnis) fast nichts mehr findet - offenses bliebe dann einfach
    // leer, ohne dass etwas geprueft wurde.
    const totalFiles = CODE_DIRS.reduce((sum, dir) => sum + walk(dir).length, 0)
    expect(
      totalFiles,
      'Der Waechter hat in app/shared/server/scripts kaum Dateien gesehen - Pfade pruefen',
    ).toBeGreaterThan(30)

    // Wo main.css selbst liegt, scannt Tailwind von sich aus - das ist
    // empirisch belegt: Klassen aus app/ landen im gebauten CSS, Klassen
    // aus shared/ landen nicht darin.
    const cssRoot = CSS_PATH.split('/')[0]

    const declared = new Set(declaredSourceDirs(css))

    const offenses: string[] = []

    for (const dir of CODE_DIRS) {
      if (dir === cssRoot) continue

      const carriers = walk(dir)
        .filter((file) => file.endsWith('.ts') || file.endsWith('.vue'))
        .filter((file) => {
          const text = readFileSync(file, 'utf8')
          return (
            carriesProjectUtility(text, names) ||
            carriesProjectUtility(text, radiusNames, ['rounded']) ||
            carriesProjectUtility(text, fontNames, ['font'])
          )
        })

      if (carriers.length > 0 && !declared.has(dir)) {
        offenses.push(
          `${dir}/ traegt Projekt-Utilities (${carriers.join(', ')}), steht aber in keinem ` +
            `@source in ${CSS_PATH}. Tailwind erzeugt eine Klasse nur, wenn ihr Name im ` +
            `gescannten Quelltext vorkommt - sonst fehlt sie im CSS und faellt wortlos auf ` +
            `den geerbten Wert zurueck.`,
        )
      }
    }

    expect(offenses, offenses.join('\n')).toEqual([])
  })

  it('wuerde ein nicht deklariertes Verzeichnis tatsaechlich melden', () => {
    // Ein Waechter, der nur ueber heilem Code laeuft, kann auch dann gruen
    // sein, wenn er gar nichts prueft. Genau das ist hier passiert:
    // rarityStyle.test.ts prueft den zurueckgegebenen String und war
    // achtzehn Tasks lang gruen, waehrend border-special im CSS fehlte.
    //
    // Diese Gegenprobe ruft DIESELBEN Funktionen auf wie der Test oben.
    // Ein nachgebauter Regex wuerde nur beweisen, dass ein Regex dieser
    // Bauart greift - nicht dass der tatsaechlich benutzte greift.
    const names = ['rare', 'special', 'line']

    expect(carriesProjectUtility(`if (rarity === 'special') return 'border-special'`, names)).toBe(
      true,
    )
    expect(carriesProjectUtility(`return 'bg-rare border-rare'`, names)).toBe(true)
    expect(carriesProjectUtility(`return 'text-ink'`, names)).toBe(false)

    // Dieselbe Erkennung fuer Radien und Schriften, mit ihren eigenen
    // Praefixen: 'rounded-card' und 'font-mono' sind keine bg-/text-/...
    // Utilities und wuerden ohne den Praefix-Parameter unentdeckt bleiben.
    expect(carriesProjectUtility(`return 'rounded-card'`, ['card'], ['rounded'])).toBe(true)
    expect(carriesProjectUtility(`return 'font-mono'`, ['mono'], ['font'])).toBe(true)
    expect(carriesProjectUtility(`return 'text-ink'`, ['card'], ['rounded'])).toBe(false)

    // Und eine Zusicherung, die tatsaechlich etwas aussagt, statt einer
    // Menge nur ein Element abzufragen, das nie hineingelangen konnte:
    // "../../../shared" wird auf genau "shared" abgebildet.
    expect(declaredSourceDirs('@source "../../../shared";')).toEqual(['shared'])
  })
})
