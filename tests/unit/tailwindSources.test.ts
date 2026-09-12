import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const CSS_PATH = 'app/assets/css/main.css'

// Nur Verzeichnisse, die eigenen Quelltext tragen. node_modules, Build-
// Ausgaben und die Tests selbst interessieren nicht.
const CODE_DIRS = ['app', 'shared', 'server', 'scripts']

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
 * Die Namen der Projekt-Farbtoken, aus main.css gelesen statt hier
 * gedoppelt: --color-rare -> "rare". Kommt ein Token dazu, deckt der
 * Waechter es automatisch mit ab.
 */
function projectColorNames(css: string): string[] {
  return [...css.matchAll(/--color-([a-z0-9-]+)\s*:/g)].map((match) => match[1])
}

/**
 * Ob ein Quelltext eine der Projekt-Farbutilities benutzt (bg-rare,
 * text-muted, border-special, divide-line, ...). Steht einmal auf
 * Modulebene, damit die Gegenprobe unten sie aufruft statt den Regex
 * nachzubauen - ein nachgebauter Regex wuerde nur beweisen, dass ein Regex
 * dieser Bauart greift, nicht dass der tatsaechlich benutzte greift.
 */
function carriesProjectUtility(content: string, names: string[]): boolean {
  const utility = new RegExp(
    `\\b(?:bg|text|border|divide|ring|outline|fill|stroke|from|via|to)-(?:${names.join('|')})\\b`,
  )
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
    expect(names.length).toBeGreaterThan(5)

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
        .filter((file) => carriesProjectUtility(readFileSync(file, 'utf8'), names))

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

    // Und eine Zusicherung, die tatsaechlich etwas aussagt, statt einer
    // Menge nur ein Element abzufragen, das nie hineingelangen konnte:
    // "../../../shared" wird auf genau "shared" abgebildet.
    expect(declaredSourceDirs('@source "../../../shared";')).toEqual(['shared'])
  })
})
