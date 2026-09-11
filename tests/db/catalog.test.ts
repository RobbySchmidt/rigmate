import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { adminClient, anonClient } from '../helpers/supabase'
import { de } from '../../app/locales/de'

const admin = adminClient()
const anon = anonClient()

let brandId: string
let lineId: string

beforeAll(async () => {
  const { data: brand, error: brandError } = await admin
    .from('brands')
    .insert({ name: 'Testmarke', normalized_name: 'testmarke' })
    .select('id')
    .single()
  expect(brandError).toBeNull()
  brandId = brand!.id

  const { data: line, error: lineError } = await admin
    .from('catalog_items')
    .insert({
      brand_id: brandId,
      category_id: 'guitar',
      name: 'Testmodell',
      synonyms: ['testmod'],
      rarity_base: 'common',
      is_verified: true,
    })
    .select('id')
    .single()
  expect(lineError).toBeNull()
  lineId = line!.id
})

afterAll(async () => {
  await admin.from('catalog_items').delete().eq('brand_id', brandId)
  await admin.from('brands').delete().eq('id', brandId)
})

describe('Kategorien', () => {
  it('kennt genau zwei Verbrauchsmaterial-Kategorien', async () => {
    const { data } = await admin.from('categories').select('id').eq('is_consumable', true)
    expect(data!.map((c) => c.id).sort()).toEqual(['pick', 'strings'])
  })
})

describe('catalog_items Hierarchie', () => {
  it('setzt line_id bei einer Modell-Linie auf die eigene id', async () => {
    const { data } = await admin.from('catalog_items').select('line_id').eq('id', lineId).single()
    expect(data!.line_id).toBe(lineId)
  })

  it('setzt line_id einer Ausführung auf die Modell-Linie', async () => {
    const { data, error } = await admin
      .from('catalog_items')
      .insert({
        brand_id: brandId,
        category_id: 'guitar',
        name: 'Testmodell Deluxe',
        parent_id: lineId,
        rarity_base: 'special',
      })
      .select('id, line_id')
      .single()
    expect(error).toBeNull()
    expect(data!.line_id).toBe(lineId)
  })

  it('lehnt eine dritte Ebene ab', async () => {
    const { data: variant } = await admin
      .from('catalog_items')
      .insert({ brand_id: brandId, category_id: 'guitar', name: 'Ebene zwei', parent_id: lineId })
      .select('id')
      .single()

    const { error } = await admin
      .from('catalog_items')
      .insert({ brand_id: brandId, category_id: 'guitar', name: 'Ebene drei', parent_id: variant!.id })
    expect(error).not.toBeNull()
    expect(error!.message).toMatch(/two levels/i)
  })

  it('lehnt eine Ausführung mit fremder Marke ab', async () => {
    const { data: other } = await admin
      .from('brands')
      .insert({ name: 'Fremdmarke', normalized_name: 'fremdmarke' })
      .select('id')
      .single()

    const { error } = await admin
      .from('catalog_items')
      .insert({ brand_id: other!.id, category_id: 'guitar', name: 'Fremd', parent_id: lineId })
    expect(error).not.toBeNull()
    expect(error!.message).toMatch(/brand/i)

    await admin.from('brands').delete().eq('id', other!.id)
  })

  it('lehnt zwei gleichnamige Einträge derselben Marke ab', async () => {
    const { error } = await admin
      .from('catalog_items')
      .insert({ brand_id: brandId, category_id: 'guitar', name: 'Testmodell' })
    expect(error).not.toBeNull()
    expect(error!.code).toBe('23505')
  })

  it('lehnt das Umhängen einer Modell-Linie mit Ausführungen ab', async () => {
    const { data: lineA } = await admin
      .from('catalog_items')
      .insert({ brand_id: brandId, category_id: 'guitar', name: 'Linie A' })
      .select('id')
      .single()
    await admin
      .from('catalog_items')
      .insert({ brand_id: brandId, category_id: 'guitar', name: 'Linie A Variante', parent_id: lineA!.id })

    const { data: lineB } = await admin
      .from('catalog_items')
      .insert({ brand_id: brandId, category_id: 'guitar', name: 'Linie B' })
      .select('id')
      .single()

    const { error } = await admin.from('catalog_items').update({ parent_id: lineB!.id }).eq('id', lineA!.id)
    expect(error).not.toBeNull()
    expect(error!.message).toMatch(/two levels/i)
  })

  it('erlaubt das Umhängen einer kinderlosen Modell-Linie', async () => {
    const { data: lineC } = await admin
      .from('catalog_items')
      .insert({ brand_id: brandId, category_id: 'guitar', name: 'Linie C' })
      .select('id')
      .single()
    const { data: lineD } = await admin
      .from('catalog_items')
      .insert({ brand_id: brandId, category_id: 'guitar', name: 'Linie D' })
      .select('id')
      .single()

    const { error } = await admin.from('catalog_items').update({ parent_id: lineD!.id }).eq('id', lineC!.id)
    expect(error).toBeNull()
  })
})

describe('Slug', () => {
  it('baut den Slug aus Marke und Modell', async () => {
    const { data } = await admin.from('catalog_items').select('slug').eq('id', lineId).single()
    expect(data!.slug).toBe('testmarke-testmodell')
  })

  it('setzt Umlaute auf Grundbuchstaben', async () => {
    const { data } = await admin
      .from('catalog_items')
      .insert({ brand_id: brandId, category_id: 'guitar', name: 'Größe Röhre' })
      .select('slug')
      .single()
    expect(data!.slug).toBe('testmarke-grosse-rohre')
  })

  it('hängt bei Kollision einen Zusatz an statt zu scheitern', async () => {
    const { data: other } = await admin
      .from('brands')
      .insert({ name: 'Testmarke Zwei', normalized_name: 'testmarke zwei' })
      .select('id')
      .single()
    // "Testmarke Zwei" + "Kollision" und "Testmarke" + "Zwei Kollision"
    // ergeben beide "testmarke-zwei-kollision".
    const { data: first } = await admin
      .from('catalog_items')
      .insert({ brand_id: other!.id, category_id: 'guitar', name: 'Kollision' })
      .select('slug')
      .single()
    const { data: second } = await admin
      .from('catalog_items')
      .insert({ brand_id: brandId, category_id: 'guitar', name: 'Zwei Kollision' })
      .select('slug')
      .single()
    expect(first!.slug).not.toBe(second!.slug)

    await admin.from('catalog_items').delete().eq('brand_id', other!.id)
    await admin.from('brands').delete().eq('id', other!.id)
  })
})

describe('Markennormalisierung', () => {
  it('überschreibt eine vom Client mitgeschickte normalized_name', async () => {
    const { data, error } = await admin
      .from('brands')
      .insert({ name: 'Fender Test', normalized_name: 'komplett-falsch' })
      .select('id, normalized_name')
      .single()
    expect(error).toBeNull()
    expect(data!.normalized_name).toBe('fender test')

    await admin.from('brands').delete().eq('id', data!.id)
  })

  it('lehnt eine zweite Marke ab, deren Name auf denselben Wert normalisiert', async () => {
    const { data: first, error: firstError } = await admin
      .from('brands')
      .insert({ name: 'Fender Test', normalized_name: 'irrelevant' })
      .select('id')
      .single()
    expect(firstError).toBeNull()

    const { error: secondError } = await admin
      .from('brands')
      .insert({ name: 'fender-test', normalized_name: 'auch-irrelevant' })
    expect(secondError).not.toBeNull()
    expect(secondError!.code).toBe('23505')

    await admin.from('brands').delete().eq('id', first!.id)
  })

  it('normalize_brand_name stimmt mit der JS-Referenzimplementierung überein', async () => {
    const cases: Array<[string, string]> = [
      ["D'Addario", 'd addario'],
      ['Electro-Harmonix', 'electro harmonix'],
      ['Thomastik-Infeld', 'thomastik infeld'],
      ['Größe', 'grosse'],
    ]

    for (const [input, expected] of cases) {
      const { data, error } = await admin.rpc('normalize_brand_name', { input })
      expect(error).toBeNull()
      expect(data).toBe(expected)
    }
  })
})

describe('Katalog-RLS', () => {
  it('ist ohne Login lesbar — die Gear-Seite ist öffentlich', async () => {
    const { data, error } = await anon.from('catalog_items').select('id, name').eq('id', lineId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('lässt ohne Login nicht schreiben', async () => {
    const { error } = await anon
      .from('catalog_items')
      .insert({ brand_id: brandId, category_id: 'guitar', name: 'Heimlich' })
    expect(error).not.toBeNull()
  })

  it('lässt ohne Login nicht löschen', async () => {
    await anon.from('catalog_items').delete().eq('id', lineId)
    const { data } = await admin.from('catalog_items').select('id').eq('id', lineId)
    expect(data).toHaveLength(1)
  })
})

describe('Digitale Kategorien', () => {
  it('kennt modeller, loadbox und plugin als nicht-verbrauchbare Kategorien', async () => {
    const { data, error } = await admin
      .from('categories')
      .select('id, is_consumable, sort_order')
      .in('id', ['modeller', 'loadbox', 'plugin'])
      .order('sort_order')

    expect(error).toBeNull()
    expect(data).toEqual([
      { id: 'modeller', is_consumable: false, sort_order: 35 },
      { id: 'loadbox', is_consumable: false, sort_order: 45 },
      { id: 'plugin', is_consumable: false, sort_order: 47 },
    ])
  })

  it('sortiert die neuen Kategorien in die Verstaerkungskette ein', async () => {
    const { data, error } = await admin.from('categories').select('id').order('sort_order')

    expect(error).toBeNull()
    expect(data?.map((row) => row.id)).toEqual([
      'guitar', 'bass', 'amp', 'modeller', 'cabinet', 'loadbox', 'plugin',
      'pedal', 'pickup', 'preamp', 'accessory', 'strings', 'pick',
    ])
  })

  it('hat fuer jede Kategorie in der Datenbank ein deutsches Label', async () => {
    const { data, error } = await admin.from('categories').select('id')

    expect(error).toBeNull()
    expect(data!.length).toBeGreaterThan(0)
    const labels = de.categories as Record<string, string>
    const ohneLabel = data!.map((row) => row.id).filter((id) => !labels[id])
    expect(ohneLabel).toEqual([])
  })
})
