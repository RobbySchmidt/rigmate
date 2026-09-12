import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const CSS_PATH = 'app/assets/css/main.css'

// Kommentare zuerst weg: ein /* ... */ mit einer Klammer darin wuerde die
// Block-Regexe unten aus dem Tritt bringen.
function readCss(): string {
  return readFileSync(CSS_PATH, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
}

function block(css: string, opener: RegExp): string {
  const match = opener.exec(css)
  if (!match) throw new Error(`Block nicht gefunden: ${opener}`)
  const start = css.indexOf('{', match.index)
  const end = css.indexOf('}', start)
  if (start < 0 || end < 0) throw new Error(`Block unvollstaendig: ${opener}`)
  return css.slice(start + 1, end)
}

function declarations(source: string, prefix: string): Record<string, string> {
  const out: Record<string, string> = {}
  const pattern = new RegExp(`(${prefix}[a-z0-9-]+)\\s*:\\s*([^;]+);`, 'g')
  for (const match of source.matchAll(pattern)) out[match[1]] = match[2].trim()
  return out
}

// --- WCAG 2.1, relative Leuchtdichte und Kontrastverhaeltnis ---------------
function srgbToLinear(channel: number): number {
  const s = channel / 255
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}

function luminance(hex: string): number {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim())
  if (!match) throw new Error(`Kein 6-stelliger Hexwert: ${hex}`)
  const value = Number.parseInt(match[1], 16)
  return (
    0.2126 * srgbToLinear((value >> 16) & 0xff) +
    0.7152 * srgbToLinear((value >> 8) & 0xff) +
    0.0722 * srgbToLinear(value & 0xff)
  )
}

function contrast(a: string, b: string): number {
  const la = luminance(a)
  const lb = luminance(b)
  const hi = Math.max(la, lb)
  const lo = Math.min(la, lb)
  return (hi + 0.05) / (lo + 0.05)
}

describe('Designtokens in main.css', () => {
  it('hat genau einen :root-Block und kein zweites Thema', () => {
    const css = readCss()
    const offenses: string[] = []

    if (/@media\s*\(\s*prefers-color-scheme/.test(css)) {
      offenses.push('main.css enthaelt einen prefers-color-scheme-Block. Rigmate hat nur ein Thema.')
    }
    if (/\[data-theme/.test(css)) {
      offenses.push('main.css enthaelt einen [data-theme]-Selektor. Rigmate hat nur ein Thema.')
    }
    const roots = css.match(/:root[^{]*\{/g) ?? []
    if (roots.length !== 1) {
      offenses.push(`${roots.length} :root-Bloecke statt genau einem: ${roots.join(', ')}`)
    }
    if (!/color-scheme\s*:\s*dark/.test(css)) {
      offenses.push('color-scheme: dark fehlt.')
    }

    expect(offenses, offenses.join('\n')).toEqual([])
  })

  it('spiegelt jedes --rm- und jedes --radius-Token in @theme inline', () => {
    const css = readCss()
    const rm = declarations(block(css, /:root[^{]*\{/), '--rm-')
    const theme = block(css, /@theme\s+inline\s*\{/)
    const exposed = declarations(theme, '--color-')
    const radii = declarations(theme, '--radius-')

    const offenses: string[] = []

    // Der teuerste Fehler der Farbtoken-Umstellung: ein Token steht in
    // :root, aber die Utility dazu gibt es nicht - und eine Klasse, die es
    // nicht gibt, faellt wortlos auf den geerbten Wert zurueck.
    for (const name of Object.keys(rm)) {
      const expected = name.replace('--rm-', '--color-')
      if (!(expected in exposed)) {
        offenses.push(`${name} steht in :root, aber ${expected} fehlt in @theme inline`)
      }
    }

    // Und die Gegenrichtung: eine Utility, die auf ein Token zeigt, das es
    // nicht gibt, rendert ebenfalls nichts.
    for (const [name, value] of Object.entries(exposed)) {
      const referenced = /var\((--rm-[a-z0-9-]+)\)/.exec(value)
      if (referenced && !(referenced[1] in rm)) {
        offenses.push(`${name} zeigt auf ${referenced[1]}, das in :root nicht existiert`)
      }
    }

    for (const name of ['--radius-card', '--radius-field', '--radius-btn']) {
      if (!(name in radii)) offenses.push(`${name} fehlt in @theme inline`)
    }

    expect(offenses, offenses.join('\n')).toEqual([])
  })

  it('haelt jedes Textpaar ueber 4,5:1 und jede Flaechenstufe ueber 1,2:1', () => {
    const rm = declarations(block(readCss(), /:root[^{]*\{/), '--rm-')

    // Text auf Flaeche: WCAG AA fuer Fliesstext.
    const textPairs: Array<[string, string, string]> = [
      ['--rm-ink', '--rm-bg', 'Text auf Grund'],
      ['--rm-ink', '--rm-surface', 'Text auf Karte'],
      ['--rm-ink', '--rm-surface-2', 'Text auf abgesetzter Flaeche'],
      ['--rm-ink', '--rm-accent-wash', 'Text im Hinweiskasten'],
      ['--rm-ink', '--rm-rare-wash', 'Text im Seltenheitskasten'],
      ['--rm-muted', '--rm-bg', 'Nebentext auf Grund'],
      ['--rm-muted', '--rm-surface', 'Nebentext auf Karte'],
      ['--rm-muted', '--rm-surface-2', 'Nebentext auf abgesetzter Flaeche'],
      ['--rm-accent', '--rm-bg', 'Interaktiv auf Grund'],
      ['--rm-accent', '--rm-surface', 'Interaktiv auf Karte'],
      ['--rm-accent', '--rm-accent-wash', 'Aktiver Reiter'],
      ['--rm-accent-ink', '--rm-accent', 'Text auf Akzentflaeche'],
      ['--rm-rare', '--rm-bg', 'Raritaet auf Grund'],
      ['--rm-rare', '--rm-surface', 'Raritaet auf Karte'],
      ['--rm-rare', '--rm-rare-wash', 'Raritaet auf Seltenheitsflaeche'],
      ['--rm-special', '--rm-bg', 'Besonderheit auf Grund'],
      ['--rm-special', '--rm-surface', 'Besonderheit auf Karte'],
      ['--rm-danger', '--rm-bg', 'Fehler auf Grund'],
      ['--rm-danger', '--rm-surface', 'Fehler auf Karte'],
    ]

    // Flaechenstufen. Sie sind die EINZIGE Tiefenquelle der App, seit die
    // Rahmen weg sind - deshalb ein eigener Schwellwert statt Augenmass.
    const steps: Array<[string, string, number, string]> = [
      ['--rm-surface', '--rm-bg', 1.2, 'Karte hebt sich vom Grund'],
      ['--rm-surface-2', '--rm-surface', 1.2, 'Eingabefeld hebt sich von der Karte'],
      ['--rm-line', '--rm-surface', 1.35, 'Trennlinie ist auf der Karte zu sehen'],
    ]

    const offenses: string[] = []

    for (const [fg, bg, label] of textPairs) {
      const ratio = contrast(rm[fg], rm[bg])
      if (ratio < 4.5) {
        offenses.push(`${label}: ${fg} auf ${bg} nur ${ratio.toFixed(2)}:1, verlangt 4,50:1`)
      }
    }

    for (const [hi, lo, min, label] of steps) {
      const ratio = contrast(rm[hi], rm[lo])
      if (ratio < min) {
        offenses.push(`${label}: ${hi} gegen ${lo} nur ${ratio.toFixed(2)}:1, verlangt ${min.toFixed(2)}:1`)
      }
    }

    expect(offenses, offenses.join('\n')).toEqual([])
  })

  it('wuerde einen zu schwachen Kontrast tatsaechlich melden', () => {
    // Ein Test, der nur ueber heilen Werten laeuft, kann auch dann gruen
    // sein, wenn er gar nichts prueft. Die alten Hellmodus-Werte sind der
    // belegte Gegenfall: --rm-muted #6a7175 auf --rm-bg #e9e7e1 lag bei
    // 4,01:1 und damit unter AA - genau die Frage, die vor dieser Arbeit
    // offen war.
    expect(contrast('#6a7175', '#e9e7e1')).toBeLessThan(4.5)
    expect(contrast('#a8631a', '#e9e7e1')).toBeLessThan(4.5)

    // Und die Gegenprobe nach oben, damit die Formel nicht einfach alles
    // klein rechnet: Schwarz auf Weiss ist 21:1.
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 1)
  })
})
