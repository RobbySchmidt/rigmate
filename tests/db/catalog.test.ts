import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { adminClient, anonClient } from '../helpers/supabase'

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
