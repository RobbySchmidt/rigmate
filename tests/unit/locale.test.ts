import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { parse as parseSFC } from '@vue/compiler-sfc'
import { parse as parseTemplate, NodeTypes, type TemplateChildNode } from '@vue/compiler-dom'
import { de } from '../../app/locales/de'

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

// Nur ein Buchstabe zaehlt als Prosa. Whitespace, Zahlen und reine
// Interpunktion/Symbole (z.B. ein "·"-Trenner) sollen den Check nicht
// ausloesen - es geht um Text, nicht um jedes Zeichen.
function hasLetter(text: string): boolean {
  return /\p{L}/u.test(text.trim())
}

const STATIC_LABEL_ATTRS = new Set(['placeholder', 'title', 'aria-label', 'alt'])

interface TemplateOffense {
  file: string
  text: string
}

// Faengt, was der Umlaut-Test verpasst: die meisten deutschen Woerter
// (z.B. "Anmelden", "Suche") haben gar keinen Umlaut. Diese Funktion geht
// stattdessen ueber den echten Template-AST (vor jeder Transformation) und
// meldet jeden statischen Textknoten sowie jedes statische, ungebundene
// placeholder/title/aria-label/alt-Attribut mit Buchstaben darin. Ein
// :placeholder="t.x" ist gebunden (DIRECTIVE-Knoten) und wird bewusst nicht
// angefasst - nur ein woertlicher Wert im Template ist ein Defekt.
function collectTemplateOffenses(file: string): TemplateOffense[] {
  const source = readFileSync(file, 'utf8')
  const { descriptor, errors } = parseSFC(source, { filename: file })

  // An unparseable template is not "no offences" - that is exactly the
  // failure mode this guard exists to prevent. A broken <template> (e.g. a
  // missing end tag) makes descriptor.template.content come back empty,
  // which would otherwise let the file pass silently. Surface the parse
  // errors as offences of their own instead.
  if (errors.length > 0) {
    return errors.map((error) => ({ file, text: `parse error: ${error.message}` }))
  }

  // Deliberate choice: a .vue file with no <template> block at all (e.g. a
  // pure logic / renderless component) is legitimate and has nothing to
  // check here - that is different from a template block that exists but
  // failed to parse, which is handled above.
  if (!descriptor.template) return []

  const root = parseTemplate(descriptor.template.content, {})
  const offenses: TemplateOffense[] = []

  function visit(node: TemplateChildNode): void {
    if (node.type === NodeTypes.TEXT && hasLetter(node.content)) {
      offenses.push({ file, text: node.content.trim() })
    }

    if (node.type === NodeTypes.ELEMENT) {
      for (const prop of node.props) {
        if (
          prop.type === NodeTypes.ATTRIBUTE &&
          STATIC_LABEL_ATTRS.has(prop.name) &&
          prop.value &&
          hasLetter(prop.value.content)
        ) {
          offenses.push({ file, text: `${prop.name}="${prop.value.content.trim()}"` })
        }
      }
      for (const child of node.children) visit(child)
    }
  }

  for (const child of root.children) visit(child)
  return offenses
}

describe('Textschicht', () => {
  it('kennt die Kategorien-Labels', () => {
    expect(de.categories.guitar).toBe('Gitarre')
    expect(de.categories.strings).toBe('Saiten')
    expect(de.categories.pick).toBe('Plektrum')
  })

  it('hat für jede Kategorie aus dem Schema ein Label', () => {
    // Diese Liste ist eine bewusste, handgepflegte Kopie der categories-Zeilen
    // aus den Migrationen (zuletzt 20260906100512_catalog.sql und
    // 20260911061253_digital_categories.sql) — kein Copy-paste-Unfall. Ein
    // Offline-Test kann das Schema nicht selbst befragen, ohne von der
    // Datenbank abhängig zu werden, und genau das soll dieser Test nicht
    // sein: tests/db/catalog.test.ts ("hat für jede Kategorie in der
    // Datenbank ein deutsches Label") prüft dieselbe Frage bereits live
    // gegen die Instanz und ist die eigentliche Autorität. Dieser Test bleibt
    // trotzdem als Offline-Netz stehen, das schon vor jedem `yarn db:push`
    // greift. Wer eine Kategorie ergänzt: diese Liste UND den Migrationen
    // beide nachziehen, sonst veraltet sie wieder unbemerkt wie mit
    // modeller/loadbox/plugin geschehen.
    const schemaCategories = [
      'guitar', 'bass', 'amp', 'modeller', 'cabinet', 'loadbox', 'plugin', 'pedal',
      'pickup', 'preamp', 'accessory', 'strings', 'pick',
    ]
    for (const id of schemaCategories) {
      expect(de.categories[id as keyof typeof de.categories]).toBeTruthy()
    }
  })

  it('lässt keinen Umlaut in einer .vue-Datei stehen', () => {
    // Alle sichtbaren Texte gehören nach app/locales/de.ts. Umlaute sind der
    // billigste Indikator für einen deutschen String im Template.
    const offenders = walk('app')
      .filter((file) => file.endsWith('.vue'))
      .filter((file) => /[äöüÄÖÜß]/.test(readFileSync(file, 'utf8')))
    expect(offenders).toEqual([])
  })

  it('lässt keinen statischen Text oder Label-Attribut-Wert im Template stehen', () => {
    // AST-Check statt Umlaut-Suche: trifft auch "Anmelden", "Suche" & Co,
    // die ohne Umlaut auskommen und den obigen Test unbemerkt durchrutschen.
    const offenses = walk('app')
      .filter((file) => file.endsWith('.vue'))
      .flatMap((file) => collectTemplateOffenses(file))
    const messages = offenses.map((o) => `${o.file}: "${o.text}"`)
    expect(messages, messages.join('\n')).toEqual([])
  })
})
