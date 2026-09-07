import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { parse as parseSFC } from '@vue/compiler-sfc'
import { parse as parseTemplate, NodeTypes, type TemplateChildNode } from '@vue/compiler-dom'

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

/**
 * vuedraggable zaehlt die Knoten, die sein #item-Slot je Listeneintrag
 * liefert, und wirft "Item slot must have only one child", sobald es mehr
 * als einer ist (computeComponentStructure in
 * node_modules/vuedraggable/dist/vuedraggable.umd.js). Ein HTML-Kommentar
 * zaehlt mit: Vue laesst Kommentare im Entwicklungsmodus stehen und macht
 * Comment-Knoten daraus.
 *
 * Genau das ist beim ersten Rendern der Profilseite im Browser passiert -
 * ein Erklaertext ueber dem Wurzelelement in SignalChainEditor.vue liess die
 * Kette abstuerzen, sobald sie ihre erste Station bekam. Die
 * Komponententests haben es nicht gesehen, weil sie draggable durch eine
 * Attrappe ersetzen; deshalb prueft diese Regel den Quelltext statt das
 * Rendern.
 */
function itemSlotOffenses(file: string): string[] {
  const source = readFileSync(file, 'utf8')
  const { descriptor, errors } = parseSFC(source, { filename: file })
  if (errors.length > 0) return errors.map((error) => `${file}: parse error: ${error.message}`)
  if (!descriptor.template) return []

  // comments: true - ohne das wirft der Parser die Kommentare weg, und der
  // Test koennte den Fehler, um den es hier geht, gar nicht sehen.
  const root = parseTemplate(descriptor.template.content, { comments: true })
  const offenses: string[] = []

  function isItemSlot(node: TemplateChildNode): boolean {
    if (node.type !== NodeTypes.ELEMENT || node.tag !== 'template') return false
    return node.props.some(
      (prop) =>
        prop.type === NodeTypes.DIRECTIVE &&
        prop.name === 'slot' &&
        prop.arg?.type === NodeTypes.SIMPLE_EXPRESSION &&
        prop.arg.content === 'item',
    )
  }

  function visit(node: TemplateChildNode): void {
    if (isItemSlot(node) && node.type === NodeTypes.ELEMENT) {
      const rendered = node.children.filter(
        (child) => child.type !== NodeTypes.TEXT || child.content.trim().length > 0,
      )
      const comments = rendered.filter((child) => child.type === NodeTypes.COMMENT)
      if (comments.length > 0) {
        offenses.push(`${file}: Kommentar im #item-Slot (vuedraggable zaehlt ihn als zweites Kind)`)
      }
      if (rendered.length !== 1) {
        offenses.push(`${file}: #item-Slot liefert ${rendered.length} Knoten statt genau einem`)
      }
    }

    if (node.type === NodeTypes.ELEMENT) {
      for (const child of node.children) visit(child)
    }
  }

  for (const child of root.children) visit(child)
  return offenses
}

describe('vuedraggable-#item-Slots', () => {
  it('liefert je Eintrag genau ein Element und keinen Kommentar', () => {
    const offenses = walk('app')
      .filter((file) => file.endsWith('.vue'))
      .flatMap((file) => itemSlotOffenses(file))
    expect(offenses, offenses.join('\n')).toEqual([])
  })

  it('wuerde einen Kommentar im Slot tatsaechlich melden', () => {
    // Ein Test, der nur ueber heilem Code laeuft, kann auch dann gruen sein,
    // wenn er gar nichts prueft. Deshalb einmal der kaputte Fall - ohne ihn
    // waere nicht belegt, dass die Regel ueberhaupt greifen kann.
    const root = parseTemplate(
      '<draggable><template #item="{ element }"><!-- Hinweis --><div>{{ element }}</div></template></draggable>',
      { comments: true },
    )
    const offenses: string[] = []
    for (const child of root.children) {
      if (child.type !== NodeTypes.ELEMENT) continue
      for (const slot of child.children) {
        if (slot.type !== NodeTypes.ELEMENT) continue
        const rendered = slot.children.filter(
          (node) => node.type !== NodeTypes.TEXT || node.content.trim().length > 0,
        )
        if (rendered.length !== 1) offenses.push('zwei Knoten')
      }
    }
    expect(offenses).toEqual(['zwei Knoten'])
  })
})
