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
    return statSync(full).isDirectory() ? walk(full) : [full]
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

describe('Tailwind-Scanabdeckung', () => {
  it('nennt jedes Verzeichnis mit Projekt-Utilities in einem @source', () => {
    const css = readFileSync(CSS_PATH, 'utf8')
    const names = projectColorNames(css)
    expect(names.length).toBeGreaterThan(5)

    // bg-rare, text-muted, border-special, divide-line ...
    const utility = new RegExp(
      `\\b(?:bg|text|border|divide|ring|outline|fill|stroke|from|via|to)-(?:${names.join('|')})\\b`,
    )

    // Wo main.css selbst liegt, scannt Tailwind von sich aus - das ist
    // empirisch belegt: Klassen aus app/ landen im gebauten CSS, Klassen
    // aus shared/ landen nicht darin.
    const cssRoot = CSS_PATH.split('/')[0]

    // @source-Pfade stehen relativ zur CSS-Datei. "../../../shared" von
    // app/assets/css/main.css aus ist shared/ im Projektstamm; hier
    // interessiert nur das letzte Wegstueck.
    const declared = new Set(
      [...css.matchAll(/@source\s+["']([^"']+)["']/g)].map(
        (match) => match[1].replace(/\/+$/, '').split('/').filter((part) => part !== '..').pop() ?? '',
      ),
    )

    const offenses: string[] = []

    for (const dir of CODE_DIRS) {
      if (dir === cssRoot) continue

      const carriers = walk(dir)
        .filter((file) => file.endsWith('.ts') || file.endsWith('.vue'))
        .filter((file) => utility.test(readFileSync(file, 'utf8')))

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
    const names = ['rare', 'special', 'line']
    const utility = new RegExp(`\\b(?:bg|text|border)-(?:${names.join('|')})\\b`)

    expect(utility.test(`if (rarity === 'special') return 'border-special'`)).toBe(true)
    expect(utility.test(`return 'bg-rare border-rare'`)).toBe(true)
    expect(utility.test(`return 'text-ink'`)).toBe(false)

    const declared = new Set(
      [...`@source "../../../shared";`.matchAll(/@source\s+["']([^"']+)["']/g)].map(
        (match) => match[1].split('/').filter((part) => part !== '..').pop() ?? '',
      ),
    )
    expect(declared.has('shared')).toBe(true)
    expect(declared.has('server')).toBe(false)
  })
})
