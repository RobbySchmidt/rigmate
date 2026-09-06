import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { de } from '../../app/locales/de'

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

describe('Textschicht', () => {
  it('kennt die Kategorien-Labels', () => {
    expect(de.categories.guitar).toBe('Gitarre')
    expect(de.categories.strings).toBe('Saiten')
    expect(de.categories.pick).toBe('Plektrum')
  })

  it('hat für jede Kategorie aus dem Schema ein Label', () => {
    const schemaCategories = [
      'guitar', 'bass', 'amp', 'cabinet', 'pedal',
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
})
