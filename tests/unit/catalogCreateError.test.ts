import { describe, it, expect } from 'vitest'
import { classifyCatalogCreateError } from '../../app/utils/catalogCreateError'

describe('classifyCatalogCreateError', () => {
  it('erkennt ein Duplikat ueber die statusMessage im ofetch-Fehlerkoerper', () => {
    // So kommt der Fehler von POST /api/catalog/items bei einem Duplikat
    // tatsaechlich an: ofetch legt den Antwortkoerper unter .data ab.
    const error = { data: { statusMessage: 'duplicate key value violates unique constraint "catalog_items_brand_id_name_key"' } }
    expect(classifyCatalogCreateError(error)).toBe('duplicate')
  })

  it('erkennt ein Duplikat auch ueber statusMessage direkt am Fehlerobjekt', () => {
    const error = { statusMessage: 'duplicate key value violates unique constraint' }
    expect(classifyCatalogCreateError(error)).toBe('duplicate')
  })

  it('behandelt jede andere Fehlermeldung als generisch', () => {
    const error = { data: { statusMessage: 'brand, name und categoryId sind Pflicht' } }
    expect(classifyCatalogCreateError(error)).toBe('generic')
  })

  it('behandelt einen unbrauchbaren Fehlerwert als generisch', () => {
    expect(classifyCatalogCreateError(null)).toBe('generic')
    expect(classifyCatalogCreateError(new Error('kaputt'))).toBe('generic')
  })
})
