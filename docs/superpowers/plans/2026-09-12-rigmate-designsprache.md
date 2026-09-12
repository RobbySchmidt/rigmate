# Designsprache (nur Dunkelmodus) — Umsetzungsplan

> **Für agentische Arbeiter:** ERFORDERLICHE SUB-SKILL: `superpowers:subagent-driven-development`
> (empfohlen) oder `superpowers:executing-plans`, um diesen Plan Task für Task umzusetzen. Die Schritte
> benutzen Checkbox-Syntax (`- [ ]`) zur Verfolgung.

**Ziel:** Rigmate bekommt eine einzige, dunkle Designsprache — Flächenkontrast statt Rahmen, eine
gestaffelte Radien-Skala statt eines Werts für alles, und Archivos Breitenachse für die Display-Stimme.

**Vorgehen:** Zuerst die Tokens und die Wächter, die das Silent-Fallback-Problem unmöglich machen; dann
die 24 `.vue`-Dateien in sechs thematischen Gruppen, jede für sich testbar; dann die
Vollständigkeits-Wächter, der Durchgang von Hand und die Dokumente. Reine Darstellungsänderung — kein
Datenmodell, keine Migration, keine Server-Route.

**Stack:** Nuxt 4 (SSR) · Tailwind **4.3.3** · Vitest 5 · yarn

**Spec:** [docs/superpowers/specs/2026-09-12-rigmate-designsprache-design.md](../specs/2026-09-12-rigmate-designsprache-design.md)

---

## Globale Randbedingungen

Gelten in **jedem** Task. Aus der Spec und aus `CLAUDE.md`.

- **Gearbeitet wird auf `development`.** `main` bleibt stabil. Gemergt wird per fast-forward.
- **Ein `:root`-Block.** Kein `@media (prefers-color-scheme: ...)`, kein `[data-theme]`. `color-scheme: dark`.
- **Bernstein (`--rm-rare`, `--rm-special`) gehört ausschließlich der Seltenheit.** Nie für Fehler, Hinweise
  oder Verzierung. Für Fehler gibt es `--rm-danger`.
- **Kein Schatten.** Kein `shadow-*` in `app/`. Wenn eine Fläche hervortreten soll, geht sie eine Ebene höher.
- **Ein Wert wird erst durch seine Utility wahr.** Jedes Token gehört sowohl in `:root` als auch in
  `@theme inline`. Ein Token nur in `:root` erzeugt keine Klasse, und eine Klasse, die es nicht gibt, fällt
  **wortlos** auf den geerbten Wert zurück. Task 1 baut den Wächter dagegen.
- **In `.vue`-Dateien keine echten Umlaute**, auch nicht in Kommentaren — „ae"/„oe"/„ue"/„ss". In `.ts` und
  `.md` sind echte Umlaute in Ordnung. **Ausnahme:** sichtbare Texte in `app/locales/de.ts` bekommen echte
  Umlaute. Der Sprachtest (`tests/unit/locale.test.ts`) ist ein AST-Scan und schlägt bei statischen
  Textknoten und bei literalen `placeholder`/`title`/`aria-label`/`alt` fehl.
- **Alle `data-*`-Selektoren bleiben unverändert.** `data-cable`, `data-station`, `data-pip`, `data-count`,
  `data-stat`, `data-action`, `data-gear`, `data-initials`, `data-links`, `data-label`, `data-value`,
  `data-state`. Sie sind der Grund, warum ein Klassen-Umbau die Tests nicht umwirft.
- **Kommentare auf Deutsch.** Bezeichner, Dateinamen und Routen englisch.
- **`yarn test` muss nach jedem Task grün sein** (Stand heute: 519 Tests in 46 Dateien).
- **Die `Co-Authored-By:`-Zeile in den Commit-Nachrichten dieses Plans ist ein Beispiel, kein Wert zum
  Abschreiben.** Wer einen Commit schreibt, setzt die Attribution seines eigenen Modells — sie soll
  benennen, wer die Arbeit gemacht hat. Der übrige Wortlaut der Nachricht wird wörtlich übernommen.
- **Nie zwei `yarn test`-Läufe gleichzeitig.** `deleteTestUsers()` räumt **jeden** `rigmate-test-*`-Account
  auf der geteilten Instanz ab, nicht nur die eigenen.
- **`yarn test:api` braucht einen laufenden `yarn dev` auf Port 3000.** Vor dem Lauf mit einem HTTP-Aufruf
  belegen, **welche** App antwortet — Nuxt weicht auf 3001 aus, wenn 3000 belegt ist, und dann befragt der
  Testlauf still eine andere Anwendung.

### Die vier Radien und ihre Rollen

Ab Task 1 verfügbar. Jede Ecke in `app/` benutzt genau eine davon.

| Klasse | Wert | Rolle |
|---|---|---|
| `rounded-card` | 16px | Panel, Karte, Feed-Eintrag, Profilkopf, Hinweiskasten, Leerzustand, Bildschirmmeldung |
| `rounded-field` | 10px | Eingabefeld, Auswahlliste, Textfeld, Vorschlagsliste |
| `rounded-btn` | 8px | Schaltfläche, kleines Chip, Gerätekachel im Pool |
| `rounded-full` | ∞ | Pille, Reiter, Avatar, Seltenheitspunkt, Kabelknoten |

### Die Flächenleiter

| Klasse | Wert | Wofür |
|---|---|---|
| `bg-bg` | `#0e1113` | Seitengrund |
| `bg-surface` | `#23282b` | Karte, Panel, Profilkopf |
| `bg-surface-2` | `#30373a` | Eingabefeld, inaktiver Reiter, Gerätekachel, abgesetzte Fläche |

### Die Rahmen-Regel

> **Ein Rahmen nur dort, wo keine Flächenstufe ist. Im Zweifel fällt er weg.**

**Fällt weg:** jedes `border border-line` um eine Fläche, die eine eigene Hintergrundfarbe bekommt. Jedes
`divide-y divide-line-soft`, das jede Zeile einer Liste trennt (siehe „Liste aus Karten" unten).

**Bleibt, weil es kein Kasten ist** — diese vier Fälle sind **Ausnahmen mit Begründung** und dürfen nicht
wegoptimiert werden:

| Fall | Wo | Warum |
|---|---|---|
| `border-dashed border-line` | Leerzustände in `GearPanel`, `SignalChain`, `GearPool`, `index.vue` | Die gestrichelte Linie **bedeutet** „hier ist nichts" bzw. „hier hin ziehen". Sie ist Inhalt, kein Rahmen. Radius wird trotzdem zu `rounded-card`. |
| `border-b border-line` an einem `<a>` | `ProfileHeader.vue:164` | Das ist eine Unterstreichung, kein Kasten. |
| `border-rare` / `border-special` / `border-current` / `border-transparent` | `RarityPip`, `SignalChain`, `SignalChainEditor`, `GearPanel`, `shared/utils/rarityStyle.ts`, `FeedItem` | Seltenheitsauszeichnung und Platzhalter gegen Layout-Sprünge beim Hover. Gehören zur Mechanik. |
| `border-accent` | Hover- und Fokuszustände, 5× | Zustand, nicht Form. |

### Zwei wiederkehrende Muster

**Muster „Eingabefeld als gefüllte Mulde".** Ersetzt 24 von 30 `rounded border border-line`-Stellen:

```
ALT:  class="rounded border border-line px-3 py-2"
NEU:  class="rounded-field bg-surface-2 px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-accent"
```

**Muster „Liste aus Karten statt Tabelle mit Linien".** Ersetzt alle 8 `divide-y divide-line-soft`-Listen:

```
ALT:  <ul class="divide-y divide-line-soft rounded border border-line">
        <li class="px-3 py-2">…</li>
NEU:  <ul class="flex flex-col gap-2">
        <li class="rounded-card bg-surface px-4 py-3">…</li>
```

**Und die Regel, ohne die aus „Liste aus Karten" eine Falle wird: der Innenabstand gehört an das
anklickbare Element.**

Eine Karte, die anklickbar *aussieht*, bei der aber nur ein kleiner Text darin klickt, ist schlechter als
die Zeile vorher. Deshalb drei Fälle, und sie sind zu unterscheiden:

| Der Eintrag ist … | Dann … |
|---|---|
| **ein Navigationsziel** (die ganze Zeile führt woanders hin) | **der Link IST die Karte.** `<li>` ohne Klassen, darin `<NuxtLink class="block rounded-card bg-surface px-4 py-3 transition-colors hover:bg-surface-2">`. Das `underline` am Link **fällt weg** — in einer Karte mit Hover ist es redundant und liest sich als Wireframe. Vorbild: `PersonSuggestion.vue`, das es schon so macht. |
| **eine Datenzeile mit einem Link darin** (daneben stehen Metadaten, die nicht zum Link gehören) | **die `<li>` ist die Karte**, der Link bleibt ein Link **mit** `underline` — er muss sich von den Spans daneben unterscheiden, und die Karte ist kein Navigationsziel. |
| **ein Eintrag in einem Auswahlmenü** (Vorschlagsliste) | **eine Fläche, keine Karten.** Abstand am `<button>`, `w-full text-left`, Hover auf `bg-surface-2`. |

Wer das nicht unterscheidet, baut entweder tote Kartenfläche oder verschluckt Metadaten in einen Link.

**Muster „`font-display` wird `display`".** Gilt für **jedes** Vorkommen, ohne Ausnahme:

```
ALT:  class="font-display text-f-2xl font-semibold"
NEU:  class="display text-f-2xl font-semibold"
```

`font-display` setzt nur die Familie. `display` setzt Familie **plus Breite 88 plus Laufweite plus
tabular-nums** — und die Breite ist der sichtbarste Teil der ganzen Designsprache. Eine Stelle, die
`font-display` behält, trägt die Schrift ohne die Verengung und fällt dadurch aus dem Bild.

**Wo `display` die Zahlenformatierung schon mitbringt, fällt ein daneben stehendes `tabular-nums` weg** —
sonst steht es zweimal.

Das sind **14 Stellen in 7 Dateien**, und sie gehören den Tasks, die die Datei ohnehin besitzen:

| Datei | Zeilen (Stand 12. September 2026) | Task |
|---|---|---|
| `app/layouts/default.vue` | 21 | 3 |
| `app/components/ProfileHeader.vue` | 133, 145, 211, 215, 219, 230 | 2 (nur die `<h1>`), **4 (alle übrigen)** |
| `app/components/GearPanel.vue` | 254 | 4 |
| `app/components/FeedItem.vue` | 65 | 4 |
| `app/components/GearPool.vue` | 59, 98 | 5 |
| `app/components/SignalChain.vue` | 59, 122 | 5 |
| `app/components/SignalChainEditor.vue` | 172 | 5 |

Task 9 prüft die Vollständigkeit maschinell — verlassen wird sich darauf nicht.

---

## Was dieser Plan über die Spec hinaus festlegt

Drei Entscheidungen, die die Spec offen gelassen hat oder die sich beim Inventarisieren als besser
erwiesen haben. Sie stehen hier, damit sie nachvollziehbar sind und nicht als stille Abweichung gelten.

**P1 · `--radius-chip` entfällt, `rounded-full` bleibt.** Die Spec nennt in §3.4 ein viertes Token
`--radius-chip: 9999px`. Tailwind hat für genau das eine statische Utility `rounded-full`, die keine
Theme-Variable braucht. Ein eigenes Token daneben wäre ein zweiter Name für einen Wert — dasselbe Problem
wie `rounded`/`rounded-sm` heute. Also nur drei neue Tokens.

**P2 · Eingabefelder bekommen keinen Ruherahmen, sondern eine gefüllte Mulde plus Fokusring.** Die Spec
sagt „kein Rahmen um Flächen", regelt Formularelemente aber nicht ausdrücklich. Die Referenz behält bei
Schaltflächen sogar einen Rahmen; ihr Don't gilt Karten. 30 Felder mit Rahmen wären 30 wiedereingeführte
Kästen. Eine gefüllte Mulde (`bg-surface-2`) liest sich auf dunklem Grund eindeutig als Eingabe — das ist
ein Vorteil, den wir nur haben, weil es kein Hellthema gibt. Der Fokusring ist Pflicht, nicht Zierde: ohne
Ruherahmen trägt er allein die Tastaturbedienung.

**P3 · Die Reiter im Equipment-Panel werden Pillen, der Unterstrich entfällt.** Spec §3.2 weist
`--rm-accent-wash` unter anderem dem „aktiven Reiter" zu, sagt aber nicht, dass der `border-b` unter der
Reiterzeile damit verschwindet. Er verschwindet: eine Pille, die durch ihre Fläche aktiv ist, braucht
keine zweite Auszeichnung durch eine Linie darunter.

---

## Dateien

**Geändert:**

| Datei | Verantwortung nach dem Umbau |
|---|---|
| `app/assets/css/main.css` | Ein `:root` mit 12 Farb- und 3 Radien-Tokens, ihre Spiegelung in `@theme inline`, die Display-Rolle als eine Utility |
| `nuxt.config.ts:16` | Schriftabfrage mit Breitenachse |
| 24 `.vue`-Dateien unter `app/` | Flächen statt Rahmen, gestaffelte Radien, Display-Rolle über die Utility |
| `CLAUDE.md` | Architekturregeln und Fallstricke, die diese Arbeit ungültig macht |
| `docs/superpowers/specs/2026-09-07-rigmate-profil-design.md` | Abschnitt 3 wird Verweis |

**Neu:**

| Datei | Verantwortung |
|---|---|
| `tests/unit/designTokens.test.ts` | Wächter über `main.css` selbst: Spiegelung, kein zweites Thema, Kontrastwerte |
| `tests/unit/designUtilities.test.ts` | Wächter über die Benutzung: keine Fremdpalette, nur die vier Radien, kein Schatten |

**Nicht angefasst:** `shared/utils/rarityStyle.ts` selbst (seine Rückgabewerte bleiben, wie sie sind —
Task 2b sorgt nur dafür, dass Tailwind sie überhaupt sieht), jede Migration, jede Server-Route,
`app/locales/de.ts`.

---

## Task 1: Tokens, Flächenleiter und der Spiegelungs-Wächter

Der erste Task liefert schon einen sichtbaren Unterschied: die App steht in der neuen Palette, nur eben
noch mit Rahmen und 4px-Ecken. Und er baut den Wächter, der alle folgenden Tasks vor dem wiederkehrenden
Projektfehler schützt.

**Dateien:**
- Erstellen: `tests/unit/designTokens.test.ts`
- Ändern: `app/assets/css/main.css:8-68` (drei Blöcke → einer), `:70-132` (`@theme inline`)

**Schnittstellen:**
- Liefert: die Utilities `bg-bg`, `bg-surface`, `bg-surface-2`, `text-ink`, `text-muted`, `border-line`,
  `bg-accent`/`text-accent`, `text-accent-ink`, `bg-accent-wash`, `text-rare`/`bg-rare`/`border-rare`,
  `bg-rare-wash`, `text-special`/`border-special`, `text-danger`, `rounded-card`, `rounded-field`,
  `rounded-btn`. Alle folgenden Tasks benutzen ausschließlich diese.
- `--rm-line-soft` und `--color-line-soft` **bleiben in diesem Task bestehen.** Sie werden erst in Task 9
  entfernt, wenn ihre 17 Benutzungen weg sind — eine Utility vor ihren Aufrufstellen zu löschen ist genau
  der Fehlschlag, der aussieht, als sei nichts passiert.

- [ ] **Schritt 1: Den Wächter schreiben**

`tests/unit/designTokens.test.ts`:

```ts
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

export function contrast(a: string, b: string): number {
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
```

- [ ] **Schritt 2: Wächter laufen lassen, Fehlschlag prüfen**

Run: `yarn vitest run tests/unit/designTokens.test.ts`

Erwartet: **FAIL** in drei der vier Tests.
- „hat genau einen `:root`-Block" scheitert mit drei Befunden: `prefers-color-scheme`-Block vorhanden,
  `[data-theme]` vorhanden, 3 `:root`-Blöcke statt einem.
- „spiegelt jedes Token" scheitert mit drei Befunden — `--radius-card`, `--radius-field` und
  `--radius-btn` fehlen in `@theme inline`. Die Farbspiegelung selbst ist heute schon vollständig; nur
  die Radien-Tokens gibt es noch nicht.
- „hält jedes Textpaar über 4,5:1" scheitert mit `Nebentext auf Grund: --rm-muted auf --rm-bg nur
  4,01:1` und `Raritaet auf Grund: --rm-rare auf --rm-bg nur 3,80:1` — die beiden Werte aus der
  Hellmodus-Palette, die die offene Kontrastfrage waren.
- „würde einen zu schwachen Kontrast melden" ist grün: er rechnet mit festen Werten und hängt nicht an
  `main.css`.

Das ist der Beleg, dass der Wächter greift: er findet genau die Fehler, die heute wirklich da sind — und
zwar mit Namen und Zahl, nicht als bloßes „rot".

- [ ] **Schritt 3: `main.css` auf einen `:root`-Block umschreiben**

`app/assets/css/main.css`, Zeilen 3–68 (Kommentarkopf plus die drei Blöcke) vollständig ersetzen:

```css
/* Farbwelt: Verstaerkerfrontplatte, Pedalgehaeuse, Werkstatt - nur dunkel.
   Rigmate hat EIN Thema. Kein prefers-color-scheme, kein data-theme, kein
   Umschalter; die Begruendung steht in Abschnitt 3.1 der Designsprache-Spec.
   Wer hier je ein Hellthema ergaenzt, tut das als bewusste Entscheidung mit
   eigener Spec - nicht als halb gebauten zweiten Block.

   Zwei Akzente mit strikt getrennten Rollen: Petrol fuehrt durch die
   Oberfläche, Bernstein gehoert AUSSCHLIESSLICH der Seltenheit. Sie ist bei
   Rigmate keine Verzierung, sondern die Mechanik, ueber die Menschen
   einander finden. Wer Bernstein woanders benutzt, macht sie unlesbar. */
:root {
  /* Die Flaechenleiter. Sie ist die EINZIGE Tiefenquelle der App, seit die
     Rahmen weg sind - deshalb gespreizt gegenueber den alten Dunkelwerten:
     #131617 gegen #1d2123 kam auf 1,11:1, hier sind es 1,27:1. Dunkle
     Themen verlieren Flaechenkontrast, weil in den unteren Helligkeiten
     wenig Luft ist. tests/unit/designTokens.test.ts haelt die Stufen fest. */
  --rm-bg: #0e1113;
  --rm-surface: #23282b;
  --rm-surface-2: #30373a;

  /* Genau eine Linienstaerke. Sie steht nur noch als INNERE Trennlinie
     innerhalb einer Flaeche - nie als Rahmen um eine. Zwei Staerken waren
     ein Erbe des Hellmodus. */
  --rm-line: #3c4447;
  /* Uebergangsweise, bis die 17 Benutzungen weg sind (Task 9 dieses Plans).
     Zeigt bewusst auf denselben Wert wie --rm-line: die Unterscheidung ist
     schon aufgehoben, nur die Aufrufstellen wissen es noch nicht. */
  --rm-line-soft: #3c4447;

  --rm-ink: #eae7e0;
  --rm-muted: #9aa1a4;

  --rm-accent: #5cb8be;
  --rm-accent-ink: #0a1416;
  --rm-accent-wash: #183034;

  --rm-rare: #e3a862;
  --rm-rare-wash: #2e2313;
  --rm-special: #bd9d6b;

  /* Fehler und Zerstoerendes. Eigene Farbe, weil --rm-rare ausschliesslich
     der Seltenheit gehoert - ein roter Fehlertext in Bernstein waere
     doppeldeutig genau dort, wo Eindeutigkeit zaehlt. */
  --rm-danger: #e0897a;

  color-scheme: dark;
}
```

- [ ] **Schritt 4: Radien-Tokens in `@theme inline` ergänzen**

In `app/assets/css/main.css` direkt nach dem `--color-danger`-Eintrag (heute Zeile 124) einfügen:

```css
  /* Radien mit Rollenbezug. Die Staffel ist die Aussage, nicht der
     Einzelwert: unterschiedliche Ecken sagen dem Auge, dass Karte, Feld und
     Schaltflaeche verschiedene Arten von Ding sind. Vorher hatten 56 von 62
     Stellen denselben Wert (4px), in zwei Schreibweisen - "rounded" und
     "rounded-sm" sind in Tailwind 4.3.3 beide 0.25rem.

     Fuer vollrunde Formen gibt es Tailwinds statisches rounded-full; ein
     eigenes Token daneben waere ein zweiter Name fuer einen Wert. */
  --radius-card: 16px;
  --radius-field: 10px;
  --radius-btn: 8px;
```

- [ ] **Schritt 5: Wächter laufen lassen, grün prüfen**

Run: `yarn vitest run tests/unit/designTokens.test.ts`

Erwartet: **PASS**, alle vier Tests.

- [ ] **Schritt 6: Voller Testlauf**

Run: `yarn test`

Erwartet: PASS, 519 Tests in 46 Dateien plus die 4 neuen — also 523.

- [ ] **Schritt 7: Belegen, dass die Farbschicht wirklich erzeugt wird**

Ein Token in `@theme inline` ist noch keine Klasse. Also nachsehen, nicht annehmen:

```bash
yarn dev            # in einem eigenen Terminal
curl -s http://localhost:3000/_nuxt/assets/css/main.css | grep -oE '\.bg-surface-2\b' | sort -u
```

Erwartet: `.bg-surface-2` kommt vor.

**Warum hier nur die Farbe geprüft wird und nicht die Radien:** Tailwind v4 erzeugt eine Utility nur,
wenn ihr Klassenname im gescannten Quelltext **vorkommt** — ein Token allein genügt nicht.
`bg-surface-2` steht schon in fünf `.vue`-Dateien, `rounded-card`/`rounded-field`/`rounded-btn` in
keiner. Sie erscheinen im CSS, sobald Task 3 sie zum ersten Mal benutzt, und werden **dort** geprüft.
Eine `@source inline(...)`-Safelist wäre hier der falsche Weg: sie ließe die Gegenprobe bestehen, ohne
etwas über die echte Benutzung zu beweisen — ein Wächter, der grün ist, ohne zu prüfen.

Zwei Fallstricke dabei: Nuxt bindet auf `[::1]:3000`, also IPv6, und weicht auf **3001** aus, wenn 3000
belegt ist — erst mit einem HTTP-Aufruf belegen, **welche** App antwortet. Auf deutschem Windows heißt
der Zustand in `netstat` **`ABHÖREN`**, nicht `LISTENING`.

- [ ] **Schritt 8: Committen**

```bash
git add app/assets/css/main.css tests/unit/designTokens.test.ts
git commit -m "feat(design): ein :root-Block, gespreizte Flaechenleiter, Radien-Tokens

Drei Token-Bloecke werden einer. Kein prefers-color-scheme, kein
data-theme - Rigmate hat ein Thema. Damit loesen sich beide offenen
Kontrastfragen auf: --rm-muted lag im Hellmodus bei 4,01:1 und rare bei
3,80:1, im Dunkeln liegt jedes Textpaar ueber 4,6:1.

Die Flaechenleiter wird gespreizt (#0e1113 / #23282b / #30373a). Die
alten Dunkelwerte kamen auf 1,11:1; solange es Rahmen gab, trug das.
Ohne Rahmen ist die Stufe die einzige Tiefenquelle.

designTokens.test.ts haelt drei Dinge fest: genau ein Thema, jedes Token
in :root UND in @theme inline gespiegelt, und jedes Paar ueber seiner
Schwelle. Der vierte Test belegt an den alten Hellmodus-Werten, dass die
Kontrastpruefung ueberhaupt fehlschlagen kann.

--rm-line-soft bleibt vorerst und zeigt auf denselben Wert wie --rm-line.
Es faellt in Task 9, wenn seine 17 Benutzungen weg sind - eine Utility
vor ihren Aufrufstellen zu loeschen ist genau der Fehlschlag, der
aussieht, als sei nichts passiert.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Die Display-Rolle an einer Stelle

Heute wiederholt sich `font-display … font-semibold` in sechs Komponenten, und die Breite fehlt überall.
Das ist dieselbe Art Duplikat, die zu `shared/utils/rarityStyle.ts` geführt hat.

**Dateien:**
- Ändern: `nuxt.config.ts:16`, `app/assets/css/main.css` (Utility ergänzen),
  `app/components/ProfileHeader.vue:147`, `tests/component/profileHeader.test.ts`

**Schnittstellen:**
- Liefert: die Klasse **`display`**. Sie setzt Familie, Breite 88 und Laufweite zusammen. Jede
  Überschrift, jeder Name und jede Kennzahl in den Tasks 3–8 benutzt `display` statt
  `font-display tracking-…`. Das Schriftgewicht bleibt an der Aufrufstelle — dieselbe Begründung wie bei
  `rarityNameClass()`, die bewusst nur die Farbe setzt: Namen stehen je nach Ansicht in unterschiedlichen
  Stärken, und ein fest verdrahtetes Gewicht würde die eine Ansicht anheben und die andere heruntersetzen.

- [ ] **Schritt 1: Den fehlschlagenden Komponententest schreiben**

In `tests/component/profileHeader.test.ts` ergänzen:

```ts
  it('setzt die Display-Rolle als eine Klasse, nicht als Einzelteile', () => {
    const wrapper = mount(ProfileHeader, {
      props: {
        displayName: 'Roehrenglut Ruediger',
        deviceCount: 4,
        rarityCount: 1,
        specialCount: 2,
        mateCount: 0,
      },
    })

    const heading = wrapper.get('h1')
    // Positive Zusicherung: die Rolle ist EINE Klasse. Ein reines "enthaelt
    // nicht font-display" waere auch bei einem klassenlosen h1 gruen - und
    // ein klassenloses h1 hiesse: der Name steht in der Textschrift.
    expect(heading.classes()).toContain('display')
    // Und die Einzelteile duerfen daneben nicht noch einmal stehen, sonst
    // gibt es die Rolle wieder zweimal.
    expect(heading.classes()).not.toContain('font-display')
  })
```

- [ ] **Schritt 2: Test laufen lassen, Fehlschlag prüfen**

Run: `yarn vitest run tests/component/profileHeader.test.ts -t "Display-Rolle"`

Erwartet: **FAIL** — `expected [ 'font-display', 'text-f-4xl', 'font-semibold', 'leading-tight',
'text-ink' ] to contain 'display'`.

- [ ] **Schritt 3: Die Breitenachse laden**

`nuxt.config.ts:16` — die `href`-Zeile ersetzen:

```ts
          href: 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..700&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap',
```

Die Achsen müssen alphabetisch stehen (`wdth` vor `wght`), sonst antwortet Google Fonts mit 400 und die
Schrift fällt stumm auf die Systemschrift zurück.

- [ ] **Schritt 4: Die Utility anlegen**

In `app/assets/css/main.css` **nach** dem `@theme inline`-Block anfügen:

```css
/* Die Display-Rolle ist Familie plus Breite plus Laufweite zusammen und
   steht deshalb an einer Stelle. Vorher wiederholte sich die Kombination in
   sechs Komponenten, und die Breite fehlte ueberall.

   Breite 88 verengt um 12 Prozent: an einem kurzen Wort kaum zu sehen, an
   einem Namen oder einer Ueberschrift deutlich. Das ist die editoriale
   Stimme der Referenz, dosiert - wir haben keinen Hero, an dem 130px Sinn
   haetten, sondern Profilnamen bei 38px.

   Kein Schriftgewicht: die Namen stehen je nach Ansicht in
   unterschiedlichen Staerken. Dieselbe Entscheidung wie in
   rarityNameClass(), die bewusst nur die Farbe setzt. */
@utility display {
  font-family: var(--font-display);
  font-variation-settings: "wdth" 88;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}
```

`font-variation-settings` statt `font-stretch`, weil es unmissverständlich die `wdth`-Achse anspricht.
`tabular-nums` gehört dazu, weil jede Kennzahl im Kopf der Profilseite über diese Rolle läuft.

- [ ] **Schritt 5: Die Aufrufstelle umstellen**

`app/components/ProfileHeader.vue:147` — im `<h1>` `font-display` durch `display` ersetzen:

```html
        <h1 class="display text-f-4xl font-semibold leading-tight text-ink">{{ displayName }}</h1>
```

- [ ] **Schritt 6: Tests laufen lassen, grün prüfen**

Run: `yarn vitest run tests/component/profileHeader.test.ts`

Erwartet: PASS.

Run: `yarn test`

Erwartet: PASS, 524 Tests.

- [ ] **Schritt 7: Belegen, dass die Utility erzeugt wird und die Schrift ankommt**

```bash
curl -s http://localhost:3000/_nuxt/assets/css/main.css | grep -A 4 '\.display'
curl -s 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..700' | head -5
```

Erwartet: die `.display`-Regel steht im ausgelieferten CSS **mit** `font-variation-settings`, und die
Google-Fonts-Antwort ist ein `@font-face`-Block, keine Fehlermeldung. Nitro braucht ~13 Sekunden zum
Neubauen — wer sofort nach dem Speichern prüft, sieht den alten Build.

Dann im Browser: `/profile/<eine-id>` öffnen und den Namen ansehen. Die Verengung muss sichtbar sein.
**Wenn der Name genauso breit aussieht wie vorher, ist die Variable-Font-Instanz nicht geladen** — dann
zuerst im Netzwerk-Reiter prüfen, welche Archivo-Datei kam.

- [ ] **Schritt 8: Committen**

```bash
git add nuxt.config.ts app/assets/css/main.css app/components/ProfileHeader.vue tests/component/profileHeader.test.ts
git commit -m "feat(design): Display-Rolle als eine Utility, Archivo mit Breitenachse

Archivo ist ein Variable Font mit wdth 62-125; geladen wurde bisher nur
eine Breite. Die Schriftabfrage bekommt die Achse (alphabetisch, wdth vor
wght - sonst antwortet Google Fonts mit 400 und die Schrift faellt stumm
auf die Systemschrift zurueck).

Die Display-Rolle ist Familie plus Breite plus Laufweite zusammen und
steht jetzt an einer Stelle statt in sechs Komponenten. Ohne Gewicht,
aus demselben Grund, aus dem rarityNameClass() nur die Farbe setzt.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 2b: Tailwind sieht `shared/` nicht — ein Fehler, der schon auf `main` liegt

**Nicht geplant, im Vorflug von Task 1 gefunden.** Dieser Task war im ursprünglichen Plan nicht
vorgesehen; er kam aus dem Kontrollexperiment des Task-1-Implementierenden und ist am gebauten CSS
belegt.

### Der Befund

Tailwind v4 erzeugt eine Utility nur, wenn ihr Klassenname im **gescannten** Quelltext vorkommt.
`shared/` wird nicht gescannt. Von den Klassen, die `shared/utils/rarityStyle.ts` als String
zurückgibt, fehlen deshalb im ausgelieferten CSS **genau die zwei**, die in keiner `.vue`-Datei
zusätzlich stehen:

| Klasse | Im gebauten CSS | Warum |
|---|---|---|
| `text-rare`, `text-special` | vorhanden | stehen auch in `.vue`-Dateien |
| `border-rare` | vorhanden | steht auch in `FeedItem.vue:92` |
| `bg-line`, `bg-surface`, `border-line`, `opacity-55` | vorhanden | stehen auch in `.vue`-Dateien |
| **`bg-rare`** | **FEHLT** | nur in `rarityStyle.ts:41` und `:63` |
| **`border-special`** | **FEHLT** | nur in `rarityStyle.ts:42` und `:64` |

**Was das live bedeutet:**

- `rarityPipClass('special')` liefert `border-special`. Die Klasse existiert nicht, und der Punkt trägt
  als Grundzustand `border-transparent` (`RarityPip.vue:34`) — **der Punkt für „speziell" ist
  unsichtbar.**
- `rarityPipClass('rare')` liefert `bg-rare border-rare`. Ohne `bg-rare` ist der „gefüllte" Punkt ein
  Ring. Der Unterschied zwischen `rare` und `special`, den die Legende behauptet, existiert nicht.
- Dasselbe für `rarityNodeClass()` an den Kabelknoten im Signalweg.

`tests/unit/rarityStyle.test.ts` ist dabei grün, weil er den zurückgegebenen **String** prüft, nicht die
Existenz der Klasse. Das ist der wiederkehrende Fehler dieses Projekts und seine Schwester in einem:
ein Fehlschlag, der aussieht, als sei nichts passiert — und ein Test, der aus dem falschen Grund grün
ist. Und er trifft die Seltenheitsauszeichnung, also die Mechanik, über die Menschen einander finden.

**Dateien:**
- Ändern: `app/assets/css/main.css` (eine `@source`-Zeile)
- Erstellen: `tests/unit/tailwindSources.test.ts`

**Schnittstellen:**
- Liefert: `bg-rare` und `border-special` im erzeugten CSS. Tasks 4 und 5 setzen das voraus.
- Ändert **nichts** an `shared/utils/rarityStyle.ts`. Seine Rückgabewerte sind richtig; gefehlt hat die
  Scan-Abdeckung.

- [ ] **Schritt 1: Den Fehlschlag am gebauten CSS belegen (RED, von Hand)**

```bash
yarn build
find .output/public -name "*.css" | xargs grep -o '\.bg-rare[,{ :]' | head
find .output/public -name "*.css" | xargs grep -o '\.border-special[,{ :]' | head
```

Erwartet: **beide Befehle geben nichts aus.** Zur Kontrolle, dass die Suche selbst funktioniert:

```bash
find .output/public -name "*.css" | xargs grep -o '\.border-rare[,{ :]' | head
```

Erwartet: **eine Ausgabe.** `border-rare` steht auch in einem Template und wird deshalb erzeugt — das
ist der Beleg, dass nicht der `grep` das Problem ist, sondern die Scan-Abdeckung.

- [ ] **Schritt 2: Den Wächter schreiben**

`tests/unit/tailwindSources.test.ts`:

```ts
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
```

- [ ] **Schritt 3: Wächter laufen lassen, Fehlschlag prüfen**

Run: `yarn vitest run tests/unit/tailwindSources.test.ts`

Erwartet: **FAIL** im ersten Test, mit `shared/ traegt Projekt-Utilities
(shared/utils/rarityStyle.ts), steht aber in keinem @source`. Der zweite Test ist grün.

- [ ] **Schritt 4: `@source` ergänzen**

In `app/assets/css/main.css` direkt unter `@import "tailwindcss";`:

```css
/* Tailwind erzeugt eine Utility nur, wenn ihr Klassenname im gescannten
   Quelltext vorkommt - und gescannt wird von sich aus nur, wo diese Datei
   liegt. shared/utils/rarityStyle.ts gibt Klassennamen als Strings zurueck
   ("border-special", "bg-rare") und lag damit ausserhalb.

   Folge, bis das hier stand: bg-rare und border-special fehlten im
   ausgelieferten CSS. Der Punkt fuer "speziell" war unsichtbar, der fuer
   "rar" ein Ring statt gefuellt - also genau die Auszeichnung kaputt, die
   bei Rigmate die Mechanik ist, ueber die Menschen einander finden.
   rarityStyle.test.ts war die ganze Zeit gruen, weil er den
   zurueckgegebenen String prueft, nicht die Existenz der Klasse.

   tests/unit/tailwindSources.test.ts haelt das fest. */
@source "../../../shared";
```

- [ ] **Schritt 5: Wächter laufen lassen, grün prüfen**

Run: `yarn vitest run tests/unit/tailwindSources.test.ts`

Erwartet: **PASS**, beide Tests.

- [ ] **Schritt 6: Am gebauten CSS belegen (GREEN, von Hand)**

Derselbe Befehl wie in Schritt 1 — das ist der eigentliche Beweis, der Wächter ist nur die
Regressionssperre:

```bash
yarn build
find .output/public -name "*.css" | xargs grep -o '\.bg-rare[,{ :]' | head
find .output/public -name "*.css" | xargs grep -o '\.border-special[,{ :]' | head
```

Erwartet: **beide geben jetzt eine Ausgabe.** Fehlt eine weiterhin, ist `@source` nicht der richtige
Hebel — dann **melden, nicht weiterprobieren**.

- [ ] **Schritt 7: Voller Testlauf**

Run: `yarn test`

Erwartet: PASS, 526 Tests (524 nach Task 2 plus zwei neue).

- [ ] **Schritt 8: Committen**

```bash
git add app/assets/css/main.css tests/unit/tailwindSources.test.ts
git commit -m "fix(design): Tailwind scannt shared/, bg-rare und border-special fehlten

Tailwind erzeugt eine Utility nur, wenn ihr Klassenname im gescannten
Quelltext vorkommt - und gescannt wurde von sich aus nur app/, wo
main.css liegt. shared/utils/rarityStyle.ts gibt Klassennamen als
Strings zurueck und lag damit ausserhalb.

Folge, am gebauten CSS belegt: von den Klassen, die rarityStyle.ts
zurueckgibt, fehlten genau die zwei, die in keinem Template zusaetzlich
stehen - bg-rare und border-special. Der Punkt fuer "speziell" war
damit unsichtbar (er traegt als Grundzustand border-transparent), und
der gefuellte Punkt fuer "rar" war ein Ring. Der Unterschied, den die
Legende behauptet, existierte nicht.

Das trifft die Seltenheitsauszeichnung, also die Mechanik, ueber die
Menschen bei Rigmate einander finden. Der Fehler lag seit Stufe 1 auf
main und ist beim Vorflug von Task 1 aufgefallen - nicht durch einen
Test, sondern durch ein Kontrollexperiment am ausgelieferten CSS.

rarityStyle.test.ts war die ganze Zeit gruen, weil er den
zurueckgegebenen String prueft, nicht die Existenz der Klasse. Der neue
tailwindSources.test.ts prueft die Abdeckung selbst und hat einen
Gegenprobe-Test, der belegt, dass er fehlschlagen kann.
"
```

Die Attributionszeile nach deiner eigenen Sitzungsregel anfügen.

---

## Task 3: Layout und Navigation

Die kleinste Gruppe und die sichtbarste: die Navigationsleiste hat heute **keinen einzigen Radius** und
trennt sich mit einer Linie vom Inhalt.

**Dateien:**
- Ändern: `app/layouts/default.vue:19-35`, `app/app.vue`
- Test: `tests/component/layout.test.ts`

**Schnittstellen:**
- Konsumiert: `rounded-card`, `bg-surface`, `bg-bg`, `display` aus Tasks 1–2.
- Liefert: die Kopfleiste als **schwebende Karte** auf dem Grund. Alle Seiten liegen darunter in
  `<main>` und brauchen selbst keinen Rahmen nach oben.

- [ ] **Schritt 1: Den fehlschlagenden Test schreiben**

In `tests/component/layout.test.ts` ergänzen:

```ts
  it('traegt die Kopfleiste als Flaeche, nicht als Kasten mit Linie', () => {
    const wrapper = mount(DefaultLayout, { /* dieselben globalen Stubs wie in den
      bestehenden Faellen dieser Datei - nicht neu erfinden, uebernehmen */ })

    const header = wrapper.get('header')
    // Positive Zusicherung: die Leiste IST eine Flaeche mit Ecke.
    expect(header.classes()).toContain('bg-surface')
    expect(header.classes()).toContain('rounded-card')
    // Und sie trennt sich nicht mehr mit einer Linie. Die Flaechenstufe
    // gegen bg-bg leistet das; eine Linie obendrauf waere die doppelte
    // Auszeichnung, die die Rahmen-Regel verbietet.
    expect(header.classes()).not.toContain('border-b')
    expect(header.classes()).not.toContain('border-line')
  })
```

- [ ] **Schritt 2: Test laufen lassen, Fehlschlag prüfen**

Run: `yarn vitest run tests/component/layout.test.ts -t "Kopfleiste"`

Erwartet: **FAIL** — `expected [ 'border-b', 'border-line', 'bg-surface' ] to contain 'rounded-card'`.

- [ ] **Schritt 3: Das Layout umbauen**

`app/layouts/default.vue`, das `<template>` ersetzen:

```html
<template>
  <div class="min-h-screen bg-bg font-sans text-ink">
    <div class="mx-auto max-w-5xl px-f-6 pt-4">
      <header class="rounded-card bg-surface">
        <nav class="flex flex-wrap items-center gap-f-6 px-f-6 py-4">
          <NuxtLink to="/" class="display text-f-xl font-semibold">{{ t.app.name }}</NuxtLink>
          <NuxtLink to="/search" class="text-sm">{{ t.nav.search }}</NuxtLink>
          <template v-if="user">
            <NuxtLink v-if="userId" :to="`/profile/${userId}`" class="text-sm">{{ t.nav.profile }}</NuxtLink>
            <NuxtLink to="/rig" class="text-sm">{{ t.nav.rig }}</NuxtLink>
            <NuxtLink to="/settings" class="text-sm">{{ t.nav.settings }}</NuxtLink>
            <button type="button" class="ml-auto text-sm" @click="logout">{{ t.nav.logout }}</button>
          </template>
          <template v-else>
            <NuxtLink to="/login" class="ml-auto text-sm">{{ t.nav.login }}</NuxtLink>
          </template>
        </nav>
      </header>
    </div>
    <main class="mx-auto max-w-5xl px-f-6 py-f-8">
      <slot />
    </main>
  </div>
</template>
```

Zwei Änderungen über die Farbe hinaus: `flex-wrap` an der `<nav>`, weil sechs Einträge plus Abmelden auf
einem schmalen Schirm sonst hinausragen; und der `max-w-5xl`-Wrapper wandert nach außen, damit die Karte
nicht über die ganze Breite läuft.

**Kein HTML-Kommentar im `<template>`.** Am Wurzelknoten macht er zwei Wurzelknoten, Vue schaltet den
Attribute-Fallthrough ab, und `wrapper.classes()` ist im Test leer — ohne jede Fehlermeldung.
Erklärungen gehören ins `<script setup>`.

- [ ] **Schritt 4: `app/app.vue` prüfen**

Run: `sed -n '1,40p' app/app.vue`

`app.vue` enthält heute keinen Rahmen und keinen Radius. Wenn dort nur `<NuxtLayout><NuxtPage /></NuxtLayout>`
steht, ist **nichts zu tun** — dann diesen Schritt abhaken und weiter. Falls dort eine Hintergrundfarbe
oder ein Rahmen steht, gilt dieselbe Regel wie überall: Fläche statt Rahmen.

- [ ] **Schritt 5: Gegenprobe und Testlauf**

```bash
grep -nE 'rounded(-sm)?[" ]|line-soft|font-display' app/app.vue app/layouts/default.vue
```

Erwartet: keine Ausgabe. Insbesondere muss `font-display` in `default.vue:21` durch `display` ersetzt
sein — sonst trägt der Markenname in der Navigationsleiste die Schrift ohne die Verengung.

Run: `yarn test`

Erwartet: PASS, 527 Tests.

**Und die Gegenprobe, die Task 1 noch nicht führen konnte.** Dieser Task ist der erste Verbraucher von
`rounded-card`, also erscheint die Klasse jetzt zum ersten Mal im erzeugten CSS:

```bash
yarn dev            # erst mit einem HTTP-Aufruf belegen, WELCHE App antwortet
curl -s http://localhost:3000/_nuxt/assets/css/main.css | grep -oE '\.rounded-card\b' | sort -u
```

Erwartet: `.rounded-card` kommt vor. **Fehlt sie, ist der Task nicht fertig** — eine Klasse, die es
nicht gibt, fällt wortlos auf den geerbten Wert zurück, und die Kopfleiste hätte dann gar keine Ecke,
ohne dass irgendetwas kaputt aussieht. `rounded-field` und `rounded-btn` kommen in Task 6 dazu und
werden dort genauso belegt.

- [ ] **Schritt 6: Im Browser ansehen**

`yarn dev`, dann `/` öffnen. Die Leiste muss als abgesetzte Karte auf dem Grund stehen. Der Markenname
„Rigmate" muss **schmaler** stehen als vorher — wenn nicht, ist die `display`-Utility nicht angekommen.
Fenster auf ~400px verengen: die Navigation darf umbrechen, aber nichts darf abgeschnitten werden.

- [ ] **Schritt 7: Committen**

```bash
git add app/layouts/default.vue tests/component/layout.test.ts
git commit -m "feat(design): Navigationsleiste als schwebende Karte

Die Leiste hatte keinen Radius und trennte sich mit border-b vom Inhalt.
Jetzt eine Flaeche mit rounded-card auf bg-bg; die Flaechenstufe leistet
die Trennung, eine Linie obendrauf waere die doppelte Auszeichnung.

Dazu flex-wrap an der nav: sechs Eintraege plus Abmelden ragten auf einem
schmalen Schirm hinaus.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Profil — Kopf, Panel und Feed

**Dateien:**
- Ändern: `app/pages/profile/[id].vue`, `app/components/ProfileHeader.vue`,
  `app/components/GearPanel.vue`, `app/components/GearList.vue`, `app/components/RarityPip.vue`,
  `app/components/FeedItem.vue`
- Test: `tests/component/profileHeader.test.ts`, `tests/component/gearPanel.test.ts`,
  `tests/component/gearList.test.ts`, `tests/component/feedItem.test.ts`, `tests/component/profile.test.ts`

**Schnittstellen:**
- Konsumiert: alles aus Tasks 1–2.
- Liefert: die beiden Spalten als Karten auf dem Grund. Der Profilkopf ist eine Karte, das
  Equipment-Panel eine, der Feed eine. `GearPanel` stellt die Reiter als Pillen (P3).

### Urteil pro Vorkommen

| Stelle | Heute | Neu | Warum |
|---|---|---|---|
| `ProfileHeader.vue:121` | `border-b border-line-soft pb-f-6` am `<header>` | `rounded-card bg-surface p-f-6` | Der Kopf wird eine Karte. Die Linie unter ihm entfällt — die Fläche trennt. |
| `ProfileHeader.vue:127` | `rounded-full border border-line` (Avatarbild) | `rounded-full` | Der Rahmen um ein rundes Foto ist ein Kasten. |
| `ProfileHeader.vue:133` | `rounded-full border border-line bg-surface-2` (Initialen) | `rounded-full bg-accent-wash text-accent` | Fläche statt Rahmen, und der Avatar ist die Stelle, für die `accent-wash` in der Spec ausdrücklich vorgesehen ist. `text-muted` wird zu `text-accent`. |
| `ProfileHeader.vue:117` | `rounded-sm border border-line` (`actionClass`) | `rounded-btn bg-surface-2` | Schaltflächen-Radius, gefüllte Mulde. Der Hover behält `hover:border-accent` **nicht** — stattdessen `hover:text-accent`; ohne Ruherahmen gibt es keinen, dessen Farbe wechseln könnte. |
| `ProfileHeader.vue:164` | `border-b border-line` am `<a>` | **unverändert** | Unterstreichung, kein Kasten. Ausnahme aus der Rahmen-Regel. |
| `GearPanel.vue:172` | `flex gap-5 border-b border-line-soft` (Reiterzeile) | `flex gap-2` | P3: die Reiter werden Pillen, der Unterstrich entfällt. Aktiv: `rounded-full bg-accent-wash px-3 py-1 text-accent`. Inaktiv: `rounded-full bg-surface-2 px-3 py-1 text-muted`. |
| `GearPanel.vue:250` | `rounded-sm border border-dashed border-line` (Leerzustand) | `rounded-card border border-dashed border-line` | Gestrichelt **bleibt** — es bedeutet „hier ist nichts". Nur der Radius wächst. |
| `GearPanel.vue:278`, `:286` | `rounded-sm border border-line` | `rounded-btn bg-surface-2` | Wie `actionClass`. |
| `GearPanel.vue:299` | `border-t border-line-soft pt-3` (Legende) | `border-t border-line pt-3` | **Innere** Trennlinie in derselben Fläche — bleibt, nur das Token wird eins. |
| `GearPanel.vue:308` | `rounded-sm border border-current` | `rounded-btn border border-current` | `border-current` ist Zustand, bleibt. |
| `GearList.vue:64` | `border-b border-line-soft pb-1` (Gruppenkopf) | `border-b border-line pb-1` | Innere Trennlinie zwischen Kategoriegruppen — genau der Fall, für den `--rm-line` überlebt. |
| `GearList.vue:93` | `border-t border-line-soft pt-[.9rem]` (Legende) | `border-t border-line pt-[.9rem]` | Dito. |
| `FeedItem.vue:62` | `border-b border-line-soft pb-4 last:border-b-0` | `rounded-card bg-surface p-4` | Jeder Feed-Eintrag wird eine eigene Karte. Muster „Liste aus Karten". Das `<ul>` in `profile/[id].vue` bekommt `flex flex-col gap-2`. |
| `FeedItem.vue:92` | `rounded-sm border-l-2 border-rare bg-rare-wash` | `rounded-card border-l-2 border-rare bg-rare-wash` | Der Seltenheitsbalken ist Auszeichnung, bleibt. Radius wächst zu `card` (Hinweiskasten). |
| `RarityPip.vue:34` | `rounded-full border-[1.5px] border-transparent` | **unverändert** | `border-transparent` ist der Platzhalter, der den Sprung beim Wechsel auf `border-special` verhindert. |
| `profile/[id].vue` | 0 Radien, 0 Rahmen | Die beiden Spalten werden Karten: `rounded-card bg-surface p-f-6` je Spalte | Die Seite hat heute nichts davon. |

- [ ] **Schritt 1: Die fehlschlagenden Tests schreiben**

In `tests/component/feedItem.test.ts` ergänzen:

```ts
  it('ist eine eigene Karte, keine Zeile mit Trennlinie', () => {
    const wrapper = mount(FeedItem, { /* dieselben Props wie in den bestehenden
      Faellen dieser Datei uebernehmen, nicht neu erfinden */ })

    const root = wrapper.get('[data-event]')
    expect(root.classes()).toContain('rounded-card')
    expect(root.classes()).toContain('bg-surface')
    expect(root.classes()).not.toContain('border-b')
  })
```

Falls `FeedItem.vue` heute kein `data-event` am Wurzelknoten trägt, in diesem Schritt eines ergänzen —
über ein Tag zu selektieren zählt jedes künftige Element mit, über eine Klasse koppelt den Test ans
Styling.

In `tests/component/gearPanel.test.ts` ergänzen:

```ts
  it('zeigt den aktiven Reiter als Pille mit Akzentflaeche', () => {
    const wrapper = mount(GearPanel, { /* Props aus den bestehenden Faellen */ })

    const tabs = wrapper.findAll('[role="tab"]')
    expect(tabs.length).toBe(2)

    const active = tabs.find((tab) => tab.attributes('aria-selected') === 'true')
    expect(active).toBeTruthy()
    // Positive Zusicherung: die Pille IST eine Akzentflaeche.
    expect(active!.classes()).toContain('rounded-full')
    expect(active!.classes()).toContain('bg-accent-wash')

    const inactive = tabs.find((tab) => tab.attributes('aria-selected') !== 'true')
    expect(inactive!.classes()).toContain('bg-surface-2')
    // Der Unterstrich unter der Reiterzeile ist weg (P3): eine Pille, die
    // durch ihre Flaeche aktiv ist, braucht keine zweite Auszeichnung.
    expect(wrapper.get('[role="tablist"]').classes()).not.toContain('border-b')
  })
```

- [ ] **Schritt 2: Tests laufen lassen, Fehlschlag prüfen**

Run: `yarn vitest run tests/component/feedItem.test.ts tests/component/gearPanel.test.ts`

Erwartet: **FAIL** in beiden neuen Fällen — `to contain 'rounded-card'` bzw. `to contain 'rounded-full'`.

- [ ] **Schritt 3: Die sechs Dateien nach der Urteilstabelle umstellen**

Die Tabelle oben Zeile für Zeile abarbeiten. Kein `rounded`, kein `rounded-sm`, kein `line-soft` darf in
den sechs Dateien übrig bleiben.

Gegenprobe nach dem Umbau:

```bash
grep -nE 'rounded(-sm)?[" ]|line-soft|font-display' app/pages/profile/\[id\].vue app/components/{ProfileHeader,GearPanel,GearList,RarityPip,FeedItem}.vue
```

Erwartet: keine Ausgabe.

- [ ] **Schritt 4: Tests laufen lassen, grün prüfen**

Run: `yarn test`

Erwartet: PASS, 529 Tests.

- [ ] **Schritt 5: Im Browser ansehen**

`/profile/<id>` von **Röhrenglut Rüdiger** (über die Suche) — vier Geräte, eine Rarität, zwei
Besonderheiten, null Rig-Kollegen. Der einzige Datensatz, der alle vier Kennzahlen und beide
Seltenheitsstufen gleichzeitig zeigt. Prüfen:

- Heben sich die drei Karten (Kopf, Equipment, Feed) vom Grund ab, ohne Rahmen?
- Ist der aktive Reiter als Pille erkennbar?
- Leuchtet Bernstein **nur** an White Falcon (gefüllt), JTM45 und CE-2 Chorus (hohl)? 1960B muss still bleiben.
- Steht bei „Rig-Kollegen" eine **0** und kein Fragezeichen? Ein Fragezeichen heißt, die Abfrage ist
  gescheitert — nicht dass er keine hat.

- [ ] **Schritt 6: Committen**

```bash
git add app/pages/profile/ app/components/ tests/component/
git commit -m "feat(design): Profilseite auf Flaechen statt Rahmen

Kopf, Equipment-Panel und Feed werden drei Karten auf dem Grund. Jeder
Feed-Eintrag ist eine eigene Karte statt einer Zeile mit Trennlinie.
Die Reiter werden Pillen, der Unterstrich unter der Reiterzeile entfaellt
(P3 des Plans): eine Pille, die durch ihre Flaeche aktiv ist, braucht
keine zweite Auszeichnung.

Der Avatar bekommt accent-wash - die Stelle, fuer die die Spec diese
Flaeche ausdruecklich vorsieht.

Vier Rahmen bleiben mit Begruendung: die gestrichelte Linie am
Leerzustand (sie BEDEUTET "hier ist nichts"), das border-b an einem Link
(Unterstreichung, kein Kasten), border-current am Chip und
border-transparent an RarityPip (Platzhalter gegen den Sprung beim
Wechsel auf border-special).

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Profil — Signalkette

Der heikelste Task. Hier hängt eine Absturzfalle und eine SSR-Einschränkung.

**Dateien:**
- Ändern: `app/components/SignalChain.vue`, `app/components/SignalChainEditor.vue`,
  `app/components/GearPool.vue`
- Test: `tests/component/signalChain.test.ts`, `tests/component/signalChainEditor.test.ts`,
  `tests/component/gearPool.test.ts`, `tests/unit/draggableItemSlot.test.ts` (nur laufen lassen)

**Schnittstellen:**
- Konsumiert: alles aus Tasks 1–2 sowie `rarityNodeClass()` aus `shared/utils/rarityStyle.ts` —
  **unverändert**. Sie gibt `bg-rare border-rare`, `border-special` und `bg-surface border-line` zurück.
  **Voraussetzung ist Task 2b:** vor ihm existierten `bg-rare` und `border-special` im ausgelieferten
  CSS überhaupt nicht, weil Tailwind `shared/` nicht scannte. Wenn Task 2b nicht erledigt ist, arbeitet
  dieser Task auf einer unsichtbaren Seltenheitsauszeichnung.

### Urteil pro Vorkommen

| Stelle | Heute | Neu | Warum |
|---|---|---|---|
| `SignalChain.vue:50` | `rounded-full border-[1.5px]` + `rarityNodeClass()` | **unverändert** | Der Kabelknoten. Seine Rahmen sind Seltenheitsauszeichnung. |
| `SignalChain.vue:106` | `border-t border-line-soft pt-[.9rem]` | `border-t border-line pt-[.9rem]` | Innere Trennlinie über der „Nicht in der Kette"-Zeile. |
| `SignalChain.vue:120` | `rounded-sm border border-dashed border-line` | `rounded-card border border-dashed border-line` | Leerzustand, gestrichelt bleibt. |
| `SignalChainEditor.vue:88` | `rounded-sm` (Knopf im `buttonClass`) | `rounded-btn` | |
| `SignalChainEditor.vue:139` | `rounded-full border-[1.5px]` + `rarityNodeClass()` | **unverändert** | Knoten. |
| `SignalChainEditor.vue:143` | `rounded-sm bg-surface-2` (Station) | `rounded-btn bg-surface-2` | Hat schon eine Fläche, braucht nur die richtige Ecke. |
| `SignalChainEditor.vue:232` | `border-l border-line-soft` | `border-l border-line` | Trenner **innerhalb** einer Knopfgruppe — kein Kasten, bleibt. |
| `GearPool.vue:51` | `rounded-sm` (Knopf) | `rounded-btn` | |
| `GearPool.vue:76` | `rounded-sm border border-line-soft bg-surface-2` | `rounded-btn bg-surface-2` | Die Kachel hat eine eigene Fläche; der Rahmen darum ist ein Kasten und fällt. |
| `GearPool.vue:137` | `rounded-sm border border-dashed border-line` | `rounded-card border border-dashed border-line` | Leerzustand. |

- [ ] **Schritt 1: Den fehlschlagenden Test schreiben**

In `tests/component/gearPool.test.ts` ergänzen:

```ts
  it('zeigt Geraetekacheln als Flaeche ohne Rahmen', () => {
    const wrapper = mount(GearPool, { /* Props aus den bestehenden Faellen */ })

    const tile = wrapper.get('[data-gear]')
    expect(tile.classes()).toContain('rounded-btn')
    expect(tile.classes()).toContain('bg-surface-2')
    // Die Kachel hat eine eigene Flaeche. Ein Rahmen darum waere der
    // Kasten, den die Rahmen-Regel verbietet.
    expect(tile.classes()).not.toContain('border')
    expect(tile.classes()).not.toContain('border-line-soft')
  })
```

- [ ] **Schritt 2: Test laufen lassen, Fehlschlag prüfen**

Run: `yarn vitest run tests/component/gearPool.test.ts -t "Geraetekacheln"`

Erwartet: **FAIL** — `expected [ 'rounded-sm', 'border', 'border-line-soft', 'bg-surface-2' ] to contain 'rounded-btn'`.

- [ ] **Schritt 3: Die drei Dateien nach der Urteilstabelle umstellen**

**Zwei Fallstricke, die hier schon einmal Zeit gekostet haben:**

1. **Kein HTML-Kommentar im `#item`-Slot von `vuedraggable`.** Das ist ein **Absturz** — „Item slot must
   have only one child" — und zwar erst, sobald die Liste ihr erstes Element bekommt. Die
   Komponententests sehen es nicht, weil sie `draggable` durch eine Attrappe ersetzen.
   `tests/unit/draggableItemSlot.test.ts` ist der Wächter dagegen. Erklärungen ins `<script setup>`.
2. **`vuedraggable` verträgt kein SSR.** Alles, was es enthält, bleibt in `<ClientOnly>`. Nicht
   versehentlich beim Umsortieren von Klassen herausziehen.

Gegenprobe:

```bash
grep -nE 'rounded(-sm)?[" ]|line-soft|font-display' app/components/{SignalChain,SignalChainEditor,GearPool}.vue
```

Erwartet: keine Ausgabe.

- [ ] **Schritt 4: Tests laufen lassen, grün prüfen**

Run: `yarn test`

Erwartet: PASS, 530 Tests. `draggableItemSlot` muss dabei grün sein — wenn nicht, steht ein Kommentar im
`#item`-Slot.

- [ ] **Schritt 5: Im Browser ansehen — und zwar die Kette bedienen**

Halbtakt-Hanno hat auf der geteilten Instanz eine Signalkette (Strat → DS-1 → TS9). Anmelden als
`demo-halbtakt-hanno@rigmate.invalid` (Passwort in `scripts/seed-users.ts`), auf das eigene Profil, Reiter
„Signal Chain", „Kette bearbeiten":

- Ziehen, „Anhängen", die Pfeile, „Aus der Kette nehmen" — alles muss weiter gehen.
- Die Patchkabel müssen **zwischen** zwei Stationen sitzen, nie hinter der letzten.
- Während des Ziehens müssen die Kabel zurücktreten (~20 % Deckkraft).
- Dann Fenster auf ~400px: Ziehen entfällt, „Anhängen" und die Pfeile tragen die Bedienung.

- [ ] **Schritt 6: Committen**

```bash
git add app/components/ tests/component/
git commit -m "feat(design): Signalkette und Geraetepool auf Flaechen

Kacheln und Stationen bekommen rounded-btn und behalten ihre Flaeche; der
Rahmen darum faellt. Die Leerzustaende behalten ihre gestrichelte Linie -
sie BEDEUTET "hier hin ziehen" - und bekommen rounded-card.

Unveraendert bleiben die Kabelknoten samt rarityNodeClass(): ihre Rahmen
sind Seltenheitsauszeichnung, kein Kasten. Ebenso der border-l zwischen
den Knoepfen einer Gruppe.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Rig, Formulare und Onboarding

Die größte Gruppe: 16 Eingabefelder und 2 Listen. Hier greift das Muster „Eingabefeld als gefüllte Mulde"
(P2) das erste Mal in Serie.

**Dateien:**
- Ändern: `app/pages/rig.vue:249,268`, `app/components/GearItemForm.vue:38,42,53,57,61,65,69,76,77`,
  `app/components/CatalogPicker.vue:125,128,138,158,161,165,169,174`, `app/pages/onboarding.vue:73,80,83`
- Test: `tests/component/rig.test.ts`, `tests/component/catalogPicker.test.ts`,
  `tests/component/onboarding.test.ts`

**Schnittstellen:**
- Konsumiert: alles aus Tasks 1–2.
- Liefert: die drei Muster in ihrer Serienform. Tasks 7 und 8 wenden dieselben Ersetzungen an.

### Ersetzungen

| Heute | Neu |
|---|---|
| `rounded border border-line px-3 py-2` (Feld) | `rounded-field bg-surface-2 px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-accent` |
| `rounded border border-line px-2 py-1` (kleines Feld) | `rounded-field bg-surface-2 px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-accent` |
| `rounded bg-accent px-4 py-2 text-accent-ink` | `rounded-btn bg-accent px-4 py-2 text-accent-ink outline-none focus-visible:ring-2 focus-visible:ring-accent` |
| `rounded bg-accent px-3 py-1 text-accent-ink` | `rounded-btn bg-accent px-3 py-1 text-accent-ink outline-none focus-visible:ring-2 focus-visible:ring-accent` |
| `rounded border border-line px-4 py-2` (Knopf) | `rounded-btn bg-surface-2 px-4 py-2 outline-none focus-visible:ring-2 focus-visible:ring-accent` |
| `rounded border border-line p-4` (Formularkasten) | `rounded-card bg-surface p-4` |
| `rounded border border-line p-3` (Formularkasten) | `rounded-card bg-surface p-3` |
| `rounded bg-surface-2 p-2` (Hinweis) | `rounded-card bg-surface-2 p-2` |
| `rounded border border-line px-1` (Chip „ungeprüft") | `rounded-btn bg-surface-2 px-1` |
| `mt-1 divide-y divide-line-soft rounded border border-line bg-surface` (Vorschlagsliste) | `mt-1 rounded-field bg-surface`, kein `divide`. **Der Innenabstand bleibt am `<button>` darin, die `<li>` bekommt keinen** — sonst ist die Hover-Fläche kleiner als der Bereich, der sich wie ein Treffer anfühlt. Der `<button>` wird `w-full text-left`. |
| `divide-y divide-line-soft rounded border border-line` (Liste) | `flex flex-col gap-2`, die `<li>` bekommen `rounded-card bg-surface px-4 py-3` — **aber siehe die Regel darunter, wenn der Eintrag ein anklickbares Kind hat** |

**Der Fokusring ist Pflicht, nicht Zierde.** Ohne Ruherahmen trägt er allein die Tastaturbedienung. Jedes
Feld, jeder Knopf und jeder Reiter, der seinen Rahmen verliert, bekommt ihn.

**Ausnahme bei der Vorschlagsliste im `CatalogPicker`:** Sie ist eine **einzige** Fläche mit Zeilen darin,
keine Liste aus Karten — Karten mit 8px Abstand in einem Auswahlmenü lesen sich als Kacheln, nicht als
Treffer. Also Fläche behalten, `divide` weg, Zeilen über Innenabstand trennen, `bg-surface-2` beim Hover.

- [ ] **Schritt 1: Den fehlschlagenden Test schreiben**

In `tests/component/catalogPicker.test.ts` ergänzen:

```ts
  it('gibt dem Eingabefeld eine gefuellte Mulde und einen Fokusring', () => {
    const wrapper = mount(CatalogPicker, { /* Props und Stubs aus den bestehenden
      Faellen dieser Datei uebernehmen */ })

    const input = wrapper.get('input')
    expect(input.classes()).toContain('rounded-field')
    expect(input.classes()).toContain('bg-surface-2')
    // Ohne Ruherahmen traegt der Fokusring allein die Tastaturbedienung.
    // Ein Feld ohne ihn ist mit der Tastatur unbenutzbar, und zwar
    // lautlos - genau die Art Fehlschlag, die hier oefter vorkam.
    expect(input.classes()).toContain('focus-visible:ring-accent')
    expect(input.classes()).not.toContain('border-line')
  })
```

- [ ] **Schritt 2: Test laufen lassen, Fehlschlag prüfen**

Run: `yarn vitest run tests/component/catalogPicker.test.ts -t "gefuellte Mulde"`

Erwartet: **FAIL** — `to contain 'rounded-field'`.

- [ ] **Schritt 3: Die vier Dateien nach der Ersetzungstabelle umstellen**

Gegenprobe:

```bash
grep -nE 'rounded(-sm)?[" ]|line-soft|font-display' app/pages/{rig,onboarding}.vue app/components/{GearItemForm,CatalogPicker}.vue
```

Erwartet: keine Ausgabe.

- [ ] **Schritt 4: Tests laufen lassen, grün prüfen**

Run: `yarn test`

Erwartet: PASS, 531 Tests.

- [ ] **Schritt 5: Im Browser ansehen — die Seite, die noch niemand gesehen hat**

`/rig` als Halbtakt-Hanno. **Diese Seite hat mit ihren neuen Kategoriegruppen noch kein Mensch im
Browser geöffnet** — Task 6 der Katalogerweiterung war nur per curl verifiziert. Also gründlich:

- Sind die Gruppen (Gitarre, Amp, Pedal, Saiten, Plektrum, Wunschliste) sauber getrennt und beschriftet?
- Ein Gerät über das **einzige** Eingabefeld eintragen — die Kategorie kommt aus dem Katalogeintrag,
  nicht aus einer Auswahl.
- Ein Gerät entfernen.
- Saiten eintragen: dürfen **nicht** als Equipment landen.
- Mit der **Tastatur** durch das Formular: jedes Feld muss einen sichtbaren Fokus haben.

- [ ] **Schritt 6: Committen**

```bash
git add app/pages/ app/components/ tests/component/
git commit -m "feat(design): Rig, Formulare und Onboarding auf Mulden und Karten

16 Eingabefelder verlieren ihren Rahmen und bekommen eine gefuellte Mulde
(bg-surface-2) plus Fokusring. Auf dunklem Grund liest sich eine Mulde
eindeutig als Eingabe - ein Vorteil, den es nur gibt, weil es kein
Hellthema gibt. Der Fokusring ist Pflicht: ohne Ruherahmen traegt er
allein die Tastaturbedienung.

Die Listen in rig.vue und onboarding.vue werden Karten mit Abstand statt
einer Tabelle mit Linien. Die Vorschlagsliste im CatalogPicker bleibt
bewusst EINE Flaeche mit Zeilen - Karten mit Abstand lesen sich in einem
Auswahlmenue als Kacheln, nicht als Treffer.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Konto — Anmelden, Registrieren, Einstellungen

**Dateien:**
- Ändern: `app/pages/login.vue:33,37,40`, `app/pages/register.vue:48,53,57,60`,
  `app/pages/confirm.vue:9`, `app/pages/settings.vue:169,174,178,182,186,194,201`
- Test: `tests/component/settings.test.ts`

**Schnittstellen:**
- Konsumiert: die Ersetzungstabelle aus Task 6, unverändert. Zusätzlich wird jedes Formular selbst eine
  Karte: `rounded-card bg-surface p-f-6` um die Feldergruppe.

### Ersetzungen

| Heute | Neu |
|---|---|
| `rounded border border-line px-3 py-2` (Feld) | `rounded-field bg-surface-2 px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-accent` |
| `rounded bg-accent px-4 py-2 text-accent-ink` | `rounded-btn bg-accent px-4 py-2 text-accent-ink outline-none focus-visible:ring-2 focus-visible:ring-accent` |
| `rounded border border-line px-4 py-2` (Knopf) | `rounded-btn bg-surface-2 px-4 py-2 outline-none focus-visible:ring-2 focus-visible:ring-accent` |
| `<form>` ohne Fläche | `rounded-card bg-surface p-f-6` |
| `rounded-full` am Avatarbild | bleibt |
| `font-display` | `display` |

Je Datei:

| Datei | Stellen |
|---|---|
| `login.vue` | 2 Felder → Mulde, 1 gefüllter Knopf → `rounded-btn`, das `<form>` → `rounded-card bg-surface p-f-6` |
| `register.vue` | 3 Felder → Mulde, 1 gefüllter Knopf, das `<form>` → Karte |
| `confirm.vue` | 1 gefüllter Knopf → `rounded-btn` |
| `settings.vue` | 3 Felder + 2 Textfelder → Mulde, `rounded-full` am Avatarbild bleibt, 1 gefüllter Knopf, das `<form>` → Karte |

- [ ] **Schritt 1: Den fehlschlagenden Test schreiben**

In `tests/component/settings.test.ts` ergänzen:

```ts
  it('gibt jedem Feld eine Mulde mit Fokusring und dem Formular eine Karte', () => {
    const wrapper = mount(SettingsPage, { /* Stubs aus den bestehenden Faellen */ })

    const fields = [...wrapper.findAll('input[type="text"]'), ...wrapper.findAll('textarea')]
    expect(fields.length).toBeGreaterThanOrEqual(5)

    // Jedes Feld einzeln pruefen, nicht nur das erste: eine Schleife ueber
    // alle ist der Unterschied zwischen "ein Feld stimmt" und "alle
    // stimmen". Vier von fuenf umgestellt zu haben faellt sonst nicht auf.
    const offenses: string[] = []
    for (const field of fields) {
      const classes = field.classes()
      if (!classes.includes('rounded-field')) offenses.push(`${field.html().slice(0, 60)}: rounded-field fehlt`)
      if (!classes.includes('bg-surface-2')) offenses.push(`${field.html().slice(0, 60)}: bg-surface-2 fehlt`)
      if (!classes.includes('focus-visible:ring-accent')) offenses.push(`${field.html().slice(0, 60)}: Fokusring fehlt`)
      if (classes.includes('border-line')) offenses.push(`${field.html().slice(0, 60)}: border-line steht noch da`)
    }
    expect(offenses, offenses.join('\n')).toEqual([])

    expect(wrapper.get('form').classes()).toContain('rounded-card')
  })
```

- [ ] **Schritt 2: Test laufen lassen, Fehlschlag prüfen**

Run: `yarn vitest run tests/component/settings.test.ts -t "Mulde mit Fokusring"`

Erwartet: **FAIL** mit fünf Befunden, einem je Feld.

- [ ] **Schritt 3: Die vier Dateien umstellen**

Gegenprobe:

```bash
grep -nE 'rounded(-sm)?[" ]|line-soft|font-display' app/pages/{login,register,confirm,settings}.vue
```

Erwartet: keine Ausgabe.

- [ ] **Schritt 4: Tests laufen lassen, grün prüfen**

Run: `yarn test`

Erwartet: PASS, 532 Tests.

- [ ] **Schritt 5: Im Browser ansehen — samt der unbestätigten Meldung**

`/login`, `/register`, `/settings`.

**Ein gemeldeter, unbestätigter Befund gehört hierher:** `login.vue` navigiert womöglich nach dem
Anmelden nicht weiter. Der Code sieht richtig aus, der Befund stammt aus einer headless-Umgebung.
**Jetzt reproduzieren**, weil ohnehin ein Mensch davor sitzt: als Halbtakt-Hanno anmelden und sehen, ob
die Seite wechselt. Wenn ja, ist der Befund erledigt und wird in `CLAUDE.md` gestrichen (Task 11). Wenn
nein, ist das ein eigener Bug-Task — **nicht** in diesem Design-Task mitreparieren.

- [ ] **Schritt 6: Committen**

```bash
git add app/pages/ tests/component/settings.test.ts
git commit -m "feat(design): Anmelden, Registrieren und Einstellungen auf Karten

Jedes Formular wird eine Karte, jedes Feld eine gefuellte Mulde mit
Fokusring. Der Test geht per Schleife ueber ALLE Felder statt nur das
erste zu pruefen - vier von fuenf umgestellt zu haben faellt sonst nicht
auf.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Entdecken — Start, Suche, Gear-Seite

Die letzte Konvertierungsgruppe. `gear/[slug].vue` ist laut Abschnitt 10 der Hauptspec **öffentlich** und
suchmaschinen-auffindbar — sie muss auch ohne Anmeldung gut aussehen.

**Dateien:**
- Ändern: `app/pages/index.vue:25,28`, `app/pages/search.vue:101,113,125`,
  `app/pages/gear/[slug].vue:73,84`, `app/components/PersonSuggestion.vue:14`
- Test: `tests/component/index.test.ts`, `tests/component/search.test.ts`, `tests/component/gear.test.ts`

**Schnittstellen:**
- Konsumiert: die Ersetzungstabelle aus Task 6, unverändert.

### Urteil pro Vorkommen

| Stelle | Heute | Neu |
|---|---|---|
| `index.vue:25` | `rounded border border-dashed border-line p-4` | `rounded-card border border-dashed border-line p-4` — gestrichelt bleibt (Leerzustand „Zufällig ausgewählt") |
| `index.vue:28` | `rounded bg-accent px-4 py-2 text-accent-ink` | `rounded-btn bg-accent px-4 py-2 text-accent-ink outline-none focus-visible:ring-2 focus-visible:ring-accent` |
| `search.vue:101` | `w-full rounded border border-line px-3 py-2` | `w-full rounded-field bg-surface-2 px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-accent` |
| `search.vue:113`, `:125` | `divide-y divide-line-soft rounded border border-line`, `<li class="px-3 py-2">` mit `<NuxtLink class="underline">` darin | **Navigationsziel — der Link IST die Karte.** `<ul>` → `flex flex-col gap-2`, `<li>` ohne Klassen, `<NuxtLink>` → `block rounded-card bg-surface px-4 py-3 transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent`, **ohne `underline`** |
| `gear/[slug].vue:73` (Ausführungen) | dito | **Navigationsziel**, dieselbe Behandlung wie `search.vue`. Das `text-accent` am Link **bleibt** — auf dieser öffentlichen Seite ist der Akzent die Orientierung |
| `gear/[slug].vue:84` (Spielerliste) | `<li class="flex gap-2 px-3 py-2">` mit `<NuxtLink>` **plus** zwei Metadaten-Spans (Baujahr, Finish) | **Datenzeile, kein Navigationsziel.** Die `<li>` wird die Karte: `flex gap-2 rounded-card bg-surface px-4 py-3`. Der Link bleibt ein Link **mit** `underline` und `text-accent` — er muss sich von den Spans daneben unterscheiden. Die Karte darf **nicht** anklickbar aussehen, denn sie ist es nicht |
| `PersonSuggestion.vue:14` | `flex flex-col gap-1 rounded border border-line p-4` | `flex flex-col gap-1 rounded-card bg-surface p-4 transition-colors hover:bg-surface-2` |

`PersonSuggestion` ist ein `NuxtLink` und damit anklickbar — der Hover-Wechsel auf `surface-2` ersetzt den
Rahmen als Hinweis darauf. Ohne ihn sähe die Karte aus wie ein Textblock.

- [ ] **Schritt 1: Den fehlschlagenden Test schreiben**

In `tests/component/search.test.ts` ergänzen:

```ts
  it('zeigt Treffer als Karten mit Abstand, nicht als Tabelle mit Linien', async () => {
    const wrapper = mount(SearchPage, { /* Stubs und Treffer-Daten aus den
      bestehenden Faellen dieser Datei uebernehmen */ })
    await flushPromises()

    const list = wrapper.get('ul')
    expect(list.classes()).toContain('gap-2')
    expect(list.classes()).not.toContain('divide-y')
    expect(list.classes()).not.toContain('border-line')

    const items = wrapper.findAll('li')
    expect(items.length).toBeGreaterThan(0)
    // Wieder alle, nicht nur das erste.
    const offenses = items
      .filter((item) => !item.classes().includes('rounded-card'))
      .map((item) => item.html().slice(0, 60))
    expect(offenses, offenses.join('\n')).toEqual([])
  })
```

- [ ] **Schritt 2: Test laufen lassen, Fehlschlag prüfen**

Run: `yarn vitest run tests/component/search.test.ts -t "Karten mit Abstand"`

Erwartet: **FAIL** — `expected [ 'divide-y', 'divide-line-soft', 'rounded', 'border', 'border-line' ] to contain 'gap-2'`.

- [ ] **Schritt 3: Die vier Dateien nach der Urteilstabelle umstellen**

Gegenprobe:

```bash
grep -nE 'rounded(-sm)?[" ]|line-soft|font-display' app/pages/{index,search}.vue app/pages/gear/\[slug\].vue app/components/PersonSuggestion.vue
```

Erwartet: keine Ausgabe.

- [ ] **Schritt 4: Tests laufen lassen, grün prüfen**

Run: `yarn test`

Erwartet: PASS, 533 Tests.

Dann die API-Tests, weil `search` und `gear` Server-Routen befragen:

```bash
curl -s http://localhost:3000/ | grep -o '<title>[^<]*</title>'   # belegt, WELCHE App auf 3000 antwortet
yarn test:api
```

Erwartet: 38 Tests grün. Falls dort eine andere Anwendung antwortet:
`TEST_BASE_URL=http://localhost:3001 yarn test:api`.

- [ ] **Schritt 5: Im Browser ansehen, angemeldet und abgemeldet**

- `/` als Halbtakt-Hanno: echte Vorschläge mit Begründung.
- `/search`: nach „AC30" suchen, dann nach einem Namen.
- `/gear/<slug>` **abgemeldet** (privates Fenster) — laut Abschnitt 10 der Hauptspec öffentlich. Statt
  der Spielerliste muss der Hinweis „Melde dich an, um zu sehen, wer das spielt." stehen, nicht
  „Spieler: 0".

- [ ] **Schritt 6: Committen**

```bash
git add app/pages/ app/components/PersonSuggestion.vue tests/component/
git commit -m "feat(design): Startseite, Suche und Gear-Seite auf Karten

Treffer- und Spielerlisten werden Karten mit Abstand statt einer Tabelle
mit Linien. PersonSuggestion ist ein Link und bekommt einen Hover-Wechsel
auf surface-2 - ohne ihn saehe die Karte aus wie ein Textblock, seit der
Rahmen weg ist.

Die Tests pruefen per Schleife alle Listeneintraege, nicht nur den
ersten.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Aufräumen und der Vollständigkeits-Wächter

Jetzt sind alle Aufrufstellen umgestellt, also kann `--rm-line-soft` fallen — und erst jetzt kann der
Wächter greifen, der die alten Werte verbietet.

**Dateien:**
- Erstellen: `tests/unit/designUtilities.test.ts`
- Ändern: `app/assets/css/main.css` (`--rm-line-soft` und `--color-line-soft` entfernen)

**Schnittstellen:**
- Konsumiert: nichts Neues.
- Liefert: den Wächter, der verhindert, dass ein späterer Task oder eine spätere Ausbaustufe die alten
  Muster wieder einschleppt.

### Eine Regel für alle Wächter dieses Plans

**Die Gegenprobe muss denselben Code aufrufen wie die Prüfung.** Der Review von Task 2b hat gezeigt,
dass die Gegenproben in `tailwindSources.test.ts` die Logik der Prüfung **handschriftlich duplizieren**,
statt sie zu benutzen — mit eigenen, verkürzten Regexen und hartkodierten Werten. Damit beweisen sie nur,
dass *ein Regex dieser Bauart* den schlechten Fall trifft, nicht dass *der tatsächlich benutzte* ihn
trifft. Ein Fehler, der künftig in der echten Logik entsteht, bliebe unentdeckt. Dazu war eine Zusicherung
tautologisch: `expect(declared.has('server')).toBe(false)` kann bei einer Eingabe, die nur `"shared"`
enthält, nicht anders ausgehen.

Das ist dieselbe Familie wie der Fehler, der diesen Plan ausgelöst hat: ein Test, der aus dem falschen
Grund grün ist.

**Deshalb gilt ab hier, und rückwirkend für die beiden vorhandenen Wächter:** jede Prüffunktion steht
**einmal** auf Modulebene, und die Gegenprobe ruft **sie** auf, mit einem konstruierten schlechten Fall
als Eingabe. Kein zweiter Regex, keine zweite Ableitung, keine hartkodierte Kopie.

Dieser Task zieht das nach:

- **`tests/unit/tailwindSources.test.ts`:** die Utility-Regex und die `@source`-Ableitung aus dem ersten
  Test in je eine Funktion auf Modulebene heben (`carriesProjectUtility(content, names)` und
  `declaredSourceDirs(css)`). Beide Tests rufen sie auf. Die tautologische `server`-Zusicherung durch eine
  ersetzen, die etwas aussagt — etwa dass `declaredSourceDirs('@source "../../../shared";')` genau
  `['shared']` ergibt.
- **`tests/unit/designTokens.test.ts`:** `contrast()` steht dort schon auf Modulebene und wird von beiden
  Tests benutzt — hier ist nur das unnötige `export` zu entfernen (siehe Schritt 3).
- **Der neue Wächter unten** ist von Anfang an so gebaut: `paletteOffenses`, `radiusOffenses` und
  `legacyOffenses` stehen auf Modulebene, und der vierte Test füttert sie mit konstruierten schlechten
  Eingaben.

- [ ] **Schritt 1: Den Wächter schreiben**

`tests/unit/designUtilities.test.ts` — **jede Prüfung als Funktion auf Modulebene**, damit der
Gegenprobe-Test sie aufrufen kann statt sie zu doppeln:

```ts
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

export function paletteOffenses(file: string, content: string): string[] {
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

export function radiusOffenses(file: string, content: string): string[] {
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

export function legacyOffenses(file: string, content: string): string[] {
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
```

**Die alte Fassung dieses Blocks ist ersetzt.** Wer den Plan in einer früheren Version gelesen hat: die
drei Prüfungen standen dort inline in ihren Tests, und der vierte Test baute die Regexe nach. Das war der
Befund aus dem Review von Task 2b.

- [ ] **Schritt 2: Wächter laufen lassen**

Run: `yarn vitest run tests/unit/designUtilities.test.ts`

Erwartet: die ersten drei Tests **PASS** (Tasks 3–8 haben aufgeräumt), der vierte **PASS**.

**Wenn einer der ersten drei fehlschlägt, ist eine Stelle aus den Tasks 3–8 übersehen worden.** Die
Meldung nennt Datei und Klasse. Nachtragen, nicht den Wächter aufweichen.

- [ ] **Schritt 3: `--rm-line-soft` entfernen und zwei Kleinigkeiten aufräumen**

In `app/assets/css/main.css`:
- die Zeile `--rm-line-soft: #3c4447;` samt dem dreizeiligen Kommentar darüber löschen
- die Zeile `--color-line-soft: var(--rm-line-soft);` im `@theme inline`-Block löschen

Dazu zwei Befunde aus dem Review von Task 1, beide kosmetisch und beide aus dem Plantext selbst
stammend — sie liegen in Dateien, die dieser Task ohnehin anfasst:

- **`app/assets/css/main.css`:** im Kommentar über `:root` steht „Petrol fuehrt durch die **Oberfläche**"
  mit echtem Umlaut, während die ganze Datei sonst transliteriert ist (`Verstaerkerfrontplatte`,
  `gehoert`, `Flaechenleiter`). Zu `Oberflaeche` ändern. Der Sprachtest scannt nur `.vue` und fängt das
  nicht.
- **`tests/unit/designTokens.test.ts`:** `export function contrast(...)` hat keinen Verbraucher außerhalb
  der Datei. Das `export` entfernen, die Funktion selbst bleibt — sie wird in zwei Tests benutzt.

Und ein drittes, das beim Umbau entstanden ist: **die App hat jetzt zwei Fokusmuster.**
`ProfileHeader.vue` benutzt `focus-visible:outline-2 focus-visible:outline-offset-2
focus-visible:outline-accent` — das stammt aus der Zeit vor diesem Plan. Die Felder und Knöpfe aus den
Tasks 6 bis 8 benutzen `outline-none focus-visible:ring-2 focus-visible:ring-accent`. Beide
funktionieren, aber es ist ein Muster zu viel, und es ist dieselbe Art Duplikat, die zu
`shared/utils/rarityStyle.ts` und zur `display`-Utility geführt hat: eine Regel, die an zwei Orten
verschieden ausgedrückt ist, läuft auseinander.

**Auf das Ring-Muster vereinheitlichen** und die `outline-`-Variante in `ProfileHeader.vue` ersetzen. Der
Ring ist die bessere Wahl, weil `ring-*` eine Farbe aus den Tokens nimmt und `outline-offset` auf einer
gefüllten Mulde eine Lücke in der Fläche reißt.

**Danach zählen, nicht schätzen:** jedes interaktive Element in `app/` — `<button>`, `<a>`, `<input>`,
`<select>`, `<textarea>`, `<NuxtLink>` — trägt genau ein Fokusmuster, und es ist dasselbe. Ein Element
ohne jedes ist ein Befund.

- [ ] **Schritt 4: Beide Wächter laufen lassen, grün prüfen**

Run: `yarn vitest run tests/unit/designTokens.test.ts tests/unit/designUtilities.test.ts`

Erwartet: PASS. `designTokens` prüft dabei die Gegenrichtung mit: wäre `--color-line-soft`
stehengeblieben, würde es melden, dass die Utility auf ein Token zeigt, das es nicht mehr gibt.

- [ ] **Schritt 5: Voller Testlauf**

Run: `yarn test`

Erwartet: PASS, 537 Tests.

- [ ] **Schritt 6: Belegen, dass die Klasse wirklich verschwunden ist**

```bash
# Erst belegen, WELCHE App antwortet - Port 3000 ist auf diesem Rechner fremdbelegt,
# Nuxt weicht auf 3001 aus.
curl -s http://localhost:3001/ | grep -o '<title>[^<]*</title>'
curl -s http://localhost:3001/_nuxt/assets/css/main.css > css-probe.txt

grep -cE 'line-soft' css-probe.txt       # erwartet: 0
grep -cE 'rounded-card' css-probe.txt    # erwartet: mindestens 1
```

Der zweite Befehl ist die **Kontrollprobe**, und er ist nicht optional: ohne ihn belegt eine Null beim
ersten Befehl nur, dass irgendetwas nichts gefunden hat — eine leere Datei, eine falsche URL, ein
vertipptes Muster. Erst wenn `rounded-card` **trifft**, heißt die Null beim ersten, dass `line-soft`
wirklich weg ist.

**Genau hier stand vorher ein Defekt**, und er ist lehrreich genug, um dokumentiert zu bleiben: der
Befehl lautete `grep -c 'line-soft|font-display'` — **ohne `-E`**. In der Grundsyntax von `grep` ist das
`|` ein wörtliches Zeichen, das Muster hätte also nach der Zeichenfolge `line-soft|font-display` gesucht
und nie etwas gefunden. `grep -c` hätte `0` zurückgegeben, und `0` war das erwartete Ergebnis. **Die
Prüfung hätte immer bestanden, ohne etwas zu prüfen** — derselbe Fehler, gegen den die Wächter dieses
Plans gebaut sind, in der Prüfvorschrift des Plans selbst. Er kam von einer unvorsichtigen globalen
Ersetzung, die `line-soft'` in mehreren Zusammenhängen traf, auch in String-Literalen.

**`font-display` wird hier bewusst nicht am CSS geprüft:** das Token `--font-display` existiert in
`@theme inline` weiter und wird von der `display`-Utility benutzt, ein Treffer wäre also richtig und
sagte nichts. Die Abwesenheit der **Klasse** `font-display` prüft `designUtilities.test.ts` am Quelltext.

**Und noch ein Fallstrick:** `divide-*` bekommt einen Kindselektor
(`.divide-line-soft > :not(:last-child)`) — ein Muster auf `.divide-line-soft {` findet das nicht und
meldet fälschlich „schon weg". Deshalb steht oben `line-soft` ohne Punkt und ohne Klammer.

- [ ] **Schritt 7: Committen**

```bash
git add app/assets/css/main.css tests/unit/designUtilities.test.ts
git commit -m "chore(design): line-soft entfernt, Vollstaendigkeits-Waechter dazu

designUtilities.test.ts verbietet drei Dinge: fest verdrahtete
Tailwind-Palettenfarben, die alten Radius-Schreibweisen und line-soft
sowie jeden Schatten.

Der Farb-Scan geht ueber ALLE 22 Familien und zusaetzlich white/black -
nicht ueber eine Handvoll ausgedachter Muster. Genau daran ist die
Farbtoken-Umstellung einmal gescheitert: das damalige Muster meldete
"sauber", waehrend text-amber-700, text-green-700 und text-neutral-400
unangetastet dastanden. Und er scannt shared/ mit, weil
rarityStyle.ts Klassennamen als Strings zurueckgibt.

Der vierte Test belegt an kaputten Beispielen, dass alle drei Muster
ueberhaupt greifen koennen.

--rm-line-soft fiel erst jetzt, nachdem seine 17 Benutzungen weg sind.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Der Durchgang von Hand

**Kein Test kann sagen, ob es gut aussieht.** Dieser Task ist Pflicht, nicht Kür: beim Profilumbau ist
genau so ein fehlender Profil-Link in der Navigation aufgefallen, den kein Test gefunden hätte.

**Dateien:**
- Erstellen: `docs/superpowers/plans/2026-09-12-durchgang-befunde.md` (die Befundliste)
- Ändern: nur, was der Durchgang an echten Fehlern findet

- [ ] **Schritt 1: Ausgangslage herstellen**

```bash
yarn seed:catalog
yarn seed:users
yarn dev
curl -s http://localhost:3000/ | grep -o '<title>[^<]*</title>'
```

Der letzte Befehl belegt, **welche** App auf 3000 antwortet. `yarn seed:users` räumt Halbtakt-Hannos
Signalkette weg — für Task 5 muss sie wieder angelegt werden (Strat → DS-1 → TS9), sonst ist die halbe
Profilseite nicht anzusehen.

- [ ] **Schritt 2: Alle zehn Seiten durchgehen**

Als `demo-halbtakt-hanno@rigmate.invalid` (Passwort in `scripts/seed-users.ts`). Je Seite notieren:
stimmt die Flächenleiter, sitzt jeder Radius in seiner Rolle, ist jeder Fokus sichtbar?

- [ ] `/login` — und den unbestätigten Navigations-Befund aus Task 7 endgültig klären
- [ ] `/register`
- [ ] `/confirm`
- [ ] `/` — echte Vorschläge mit Begründung
- [ ] `/search` — Gerät, Marke, Name
- [ ] `/gear/<slug>` — **auch abgemeldet**, im privaten Fenster
- [ ] `/rig` — die gruppierte Fassung, eintragen und entfernen
- [ ] `/onboarding`
- [ ] `/settings`
- [ ] `/profile/<id>` — eigenes Profil **und** Röhrenglut Rüdiger

- [ ] **Schritt 3: Auf ~400px verengen und alles wiederholen**

Die Signalkette ist auf einem echten Handy nie erprobt worden. Gebaut ist sie dafür: Ziehen entfällt,
„Anhängen" und die Pfeile tragen die Bedienung. Prüfen, dass nichts abgeschnitten wird und nichts
seitlich hinausläuft.

- [ ] **Schritt 4: Den offenen Hydrations-Befund prüfen**

Ein ernster, unbestätigter Verdacht, der **seit Stufe 1** auf `main` liegt: `gearLoadError` und
Geschwister werden als Seiteneffekt **im** `useAsyncData`-Handler gesetzt. Beim SSR läuft der Handler
serverseitig, auf dem Client aber nicht erneut — der `ref` stünde dort wieder auf `false`. Dann erschiene
die Fehlermeldung im ausgelieferten HTML und verschwände beim Hydrieren.

So prüfen: `/rig` mit unterbrochener Verbindung zur Supabase-Instanz laden (im Netzwerk-Reiter die
Supabase-Domain blocken) und sehen, ob die rote Zeile nach dem Hydrieren stehen bleibt.

**Wenn sie verschwindet, ist das der wiederkehrende Projektfehler an sechs Stellen gleichzeitig** — in
`rig.vue` und `profile/[id].vue`. Dann gehört der Fehlerzustand in den Rückgabewert des Handlers statt in
einen `ref` daneben. Das ist ein **eigener Task**, nicht Teil dieses Plans: als Befund notieren.

- [ ] **Schritt 5: Die Befunde aufschreiben**

`docs/superpowers/plans/2026-09-12-durchgang-befunde.md` anlegen, je Befund: Seite, was falsch aussieht,
und die Einordnung — **Designfehler dieses Plans** (jetzt reparieren), **Altlast** (eigener Task) oder
**Inhaltsproblem** (wartet auf Stufe 2).

Drei Befunde stehen schon fest und gehören mit hinein, weil sie gemeldet und nie entschieden wurden:
- `GearPool`-Karten kürzen auch im Normalfall
- Name und Detail teilen sich in `GearList` eine Zeile und brechen um
- die linke Spalte wird im Bearbeitungsmodus breiter (~22rem statt 15,5rem) — entschieden, nie gebaut

- [ ] **Schritt 6: Nur die Designfehler reparieren**

Was in die Kategorie „Designfehler dieses Plans" fällt, jetzt beheben. Nach jeder Reparatur `yarn test`.
Altlasten und Inhaltsprobleme bleiben stehen — sie kommen in Task 11 nach `CLAUDE.md`.

- [ ] **Schritt 7: Committen**

```bash
git add docs/superpowers/plans/2026-09-12-durchgang-befunde.md app/
git commit -m "fix(design): Befunde aus dem Durchgang von Hand

Erster vollstaendiger Durchgang durch alle zehn Seiten, hell entfaellt.
Darin enthalten: die gruppierte /rig-Seite, die vorher noch niemand im
Browser gesehen hatte, und die Signalkette in einem 400px-Fenster.

Die Befundliste trennt Designfehler dieses Plans von Altlasten und
Inhaltsproblemen. Repariert wurde nur die erste Kategorie.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Dokumente nachziehen

Ein Dokument, das eine abgeschaffte Regel behauptet, ist schlimmer als kein Dokument.

**Dateien:**
- Ändern: `CLAUDE.md`, `docs/superpowers/specs/2026-09-07-rigmate-profil-design.md`

- [ ] **Schritt 1: `CLAUDE.md`, Architekturregeln**

Die Regel „Die Tokens stehen dreifach: heller Grund vollständig in `:root`, dunkel als Überschreibung in
`@media (prefers-color-scheme: dark)` **und** `[data-theme="dark"]`" ersetzen durch:

> **Rigmate hat ein Thema: dunkel.** Ein `:root`-Block, `color-scheme: dark`, kein
> `prefers-color-scheme`, kein `data-theme`. Begründung in Abschnitt 3.1 der
> [Designsprache-Spec](docs/superpowers/specs/2026-09-12-rigmate-designsprache-design.md).
> `tests/unit/designTokens.test.ts` hält das fest.
>
> **Ein Wert wird erst durch seine Utility wahr.** Jedes Token gehört in `:root` **und** in
> `@theme inline`. Ein Token nur in `:root` erzeugt keine Klasse, und eine Klasse, die es nicht gibt,
> fällt wortlos auf den geerbten Wert zurück. Derselbe Test prüft beide Richtungen.
>
> **Vier Radien mit Rollenbezug:** `rounded-card` (16px), `rounded-field` (10px), `rounded-btn` (8px),
> `rounded-full`. Blankes `rounded` und Tailwinds Größen-Skala sind verboten —
> `tests/unit/designUtilities.test.ts` hält das fest.
>
> **Ein Rahmen nur dort, wo keine Flächenstufe ist.** Im Zweifel fällt er weg. Die vier Ausnahmen
> (gestrichelte Leerzustände, Unterstreichung an Links, Seltenheitsrahmen, Zustandsrahmen) stehen in
> Abschnitt 3.3 der Spec. **Kein Schatten.**

- [ ] **Schritt 2: `CLAUDE.md`, Fallstricke**

- Den Absatz über die beiden Dunkel-Blöcke **streichen** — die Regel existiert nicht mehr.
- Den Tailwind-v4-Rahmenfarben-Absatz **behalten** und um die Radius-Umbenennung ergänzen:
  `rounded-sm` ist in v4 `0.25rem`, v3s 2px heißt `rounded-xs`, und blankes `rounded` ist ebenfalls
  `0.25rem`. Zwei Schreibweisen für einen Wert.
- Den `divide-*`-Kindselektor-Absatz **behalten** — er gilt weiter.
- Die Befehle-Tabelle: `yarn test` hat **537** Tests, nicht 514.

- [ ] **Schritt 3: `CLAUDE.md`, „Was noch aussteht"**

- Den ganzen Wiedereinstiegs-Block „Zuerst: die visuelle Ueberarbeitung" **ersetzen** durch das Ergebnis
  samt Verweis auf Spec und Plan.
- Die offene `--rm-muted`-Kontrastfrage **streichen** — erledigt, jedes Textpaar liegt über 4,6:1.
- Den ausstehenden visuellen Durchgang **streichen** — erledigt in Task 10.
- „Die gruppierte Rig-Seite hat noch niemand gesehen" **streichen** — erledigt in Task 6.
- Den `login.vue`-Navigations-Befund **streichen oder bestätigen**, je nach Ergebnis aus Task 7.
- Die drei Befunde aus Task 10, die keine Designfehler waren, **eintragen**.
- Den Hydrations-Verdacht nach dem Ergebnis aus Task 10 Schritt 4 **auflösen**: bestätigt und als eigener
  Task notiert, oder entwarnt.

- [ ] **Schritt 4: Profil-Spec, Abschnitt 3**

`docs/superpowers/specs/2026-09-07-rigmate-profil-design.md`, Abschnitt 3 („Die Designsprache") samt
Unterabschnitten 3.1 und 3.2 ersetzen durch:

> ## 3. Die Designsprache
>
> **Überholt.** Farbe, Schrift und Flächen regelt seit dem 12. September 2026 die
> [Designsprache-Spec](2026-09-12-rigmate-designsprache-design.md). Insbesondere: Rigmate hat nur einen
> Dunkelmodus, die Farbwerte sind andere, und Rahmen sind durch Flächenkontrast ersetzt.
>
> **Was aus diesem Abschnitt weitergilt**, weil es keine Werte sind, sondern Regeln:
>
> - Zwei Akzente mit strikt getrennten Rollen. Petrol führt, **Bernstein gehört ausschließlich der
>   Seltenheit.**
> - Nur zwei der vier Seltenheitsstufen werden ausgezeichnet. `mass` und `common` bleiben still.
> - Gear-Daten lesen sich wie technische Angaben und stehen deshalb in Mono, mit `tabular-nums`.

Der **Anhang** der Profil-Spec behält seine Begründungen und bekommt einen Nachtrag am Kopf: welche
Einträge die neue Spec überholt hat.

- [ ] **Schritt 5: Testlauf und Gegenprobe**

Run: `yarn test`

Erwartet: PASS, 537 Tests. Dann prüfen, dass in `CLAUDE.md` keine abgeschaffte Regel mehr steht:

```bash
grep -n "dreifach\|prefers-color-scheme\|data-theme\|rounded-sm\|line-soft\|514" CLAUDE.md
```

Jeder Treffer muss entweder im neuen Sinn stehen (etwa „verboten") oder gelöscht sein.

- [ ] **Schritt 6: Committen**

```bash
git add CLAUDE.md docs/superpowers/specs/2026-09-07-rigmate-profil-design.md
git commit -m "docs: CLAUDE.md und Profil-Spec auf die neue Designsprache

Die dreifache Token-Regel ist abgeschafft, nicht umgangen - sie faellt
aus den Architekturregeln, und der zugehoerige Fallstrick-Absatz faellt
mit. An ihre Stelle treten: ein Thema, die Radien-Staffel, die
Rahmen-Regel und der Verweis auf die beiden Waechter.

Abschnitt 3 der Profil-Spec wird ein Verweis. Was daran keine Werte
waren, sondern Regeln - die Rollentrennung der Akzente, die zwei
ausgezeichneten Seltenheitsstufen, Mono fuer Gear-Daten - bleibt
ausdruecklich stehen.

Erledigt und gestrichen: die offene --rm-muted-Kontrastfrage, der
ausstehende visuelle Durchgang, die nie gesehene gruppierte Rig-Seite.
Die Befehle-Tabelle sagt jetzt 537 Tests statt 514.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Abschluss

Nach Task 11:

- [ ] `yarn test` — 537 grün
- [ ] `yarn test:api` — 38 grün, mit belegter Basis-URL
- [ ] `yarn build && grep -r "service_role" .output/public/` — **muss leer bleiben**
- [ ] `git log --oneline main..development` durchlesen: erzählt die Reihe eine nachvollziehbare Geschichte?
- [ ] Fast-forward auf `main` (`main` hat bisher keinen einzigen Merge-Commit)

---

## Selbstdurchgang dieses Plans

**Spec-Abdeckung.** Jeder Abschnitt der Spec hat einen Task:

| Spec | Task |
|---|---|
| §3.1 Ein Thema | 1 (Wächter + `:root`), 11 (Dokumente) |
| §3.2 Farbe, 12 Tokens | 1 |
| §3.3 Flächenleiter, Rahmen-Regel, v4-Fallstrick | 1 (Leiter), 3–8 (Regel je Datei), 9 (Wächter) |
| §3.4 Vier Radien, `@theme inline` | 1 (Tokens), 3–8 (Anwendung), 9 (Wächter) |
| §3.5 Schrift, Breitenachse, Display-Rolle an einer Stelle | 2 |
| §3.6 Profilaufbau bleibt zweispaltig | 4 (keine Strukturänderung, nur Flächen) |
| §4 Dokumente nachziehen | 11 |
| §5 Was nicht geändert wird | Als globale Randbedingung und in den Urteilstabellen 4, 5 |
| §6.1 Maschinelle Prüfung | 1, 9 |
| §6.2 Prüfung von Hand | 10 |
| §7 Zurückgestellt | Kein Task — ausdrücklich außerhalb |

**Lücke, bewusst gelassen:** Die Spec nennt in §6.1 „jede benutzte Utility existiert im generierten CSS".
Das ist **kein** automatisierter Test geworden, sondern ein `curl`-Schritt in den Tasks 1, 2 und 9 — ein
Test dafür bräuchte einen laufenden Dev-Server und würde `yarn test` an einen Port binden. Der
automatisierte Ersatz ist die Spiegelungsprüfung in `designTokens.test.ts`, die beide Richtungen zwischen
`:root` und `@theme inline` abdeckt. Das ist die Ursache des Problems; der `curl` ist die Gegenprobe am
Ergebnis.

**Namenskonsistenz.** Durchgehend benutzt und nirgends anders geschrieben: `rounded-card`,
`rounded-field`, `rounded-btn`, `rounded-full`, `bg-bg`, `bg-surface`, `bg-surface-2`, `border-line`,
`bg-accent-wash`, `text-accent`, `text-rare`, `text-special`, `text-danger`, `display`,
`focus-visible:ring-accent`. `--radius-chip` kommt **nicht** vor (P1). `rarityNameClass()`,
`rarityPipClass()` und `rarityNodeClass()` bleiben unverändert.

**Testzahlen.** 519 heute → 523 (T1) → 524 (T2) → **526 (T2b)** → 527 (T3) → 529 (T4) → 530 (T5) →
531 (T6) → 532 (T7) → 533 (T8) → 537 (T9). Wer eine andere Zahl sieht, hat einen Test übersehen oder
einen zu viel geschrieben — beides ist ein Befund, kein Rundungsfehler.

**Belegte Vorhersagen.** Vier Behauptungen dieses Plans sind am 12. September 2026 gegen den Bestand
geprüft, nicht geschätzt:

| Behauptung | Belegt |
|---|---|
| Tailwind 4.3.3: `rounded` und `rounded-sm` sind **beide** `0.25rem` | `node_modules/tailwindcss` — `--radius-sm: 0.25rem`, `--radius: 0.25rem`. v3s 2px heißt hier `rounded-xs`. |
| 56 Radien zu konvertieren, 6 schon erlaubt | 44× `rounded`, 12× `rounded-sm`, 6× `rounded-full` über `app/` und `shared/`. |
| Task 9 Test 1 („keine Fremdpalette") ist sofort grün | Scan über alle 22 Familien plus `white`/`black`: **kein Treffer**. |
| Task 9 Test 3 („kein Schatten") ist sofort grün | Scan über `shadow-*`: **kein Treffer**. |

**Die Radius-Wächter-Regex ist an ihren Grenzfällen geprüft.** Sie meldet `rounded`, `rounded-sm`,
`rounded-2xl` **und** die drei Fälle, die eine Aufzählung der verbotenen Namen übersehen hätte —
`rounded-t-lg`, `rounded-l-sm`, `rounded-[4px]`. Sie meldet `rounded-card`, `rounded-field`,
`rounded-btn`, `rounded-full` nicht, auch nicht mit Variantenpräfix (`md:`, `hover:`). Deshalb sammelt
sie ein und prüft gegen eine Erlaubnisliste, statt Verbote aufzuzählen: eine Aufzählung ist immer
lückenhaft, und eine Lücke in einem Wächter ist ein Wächter, der grün ist, ohne zu prüfen.
