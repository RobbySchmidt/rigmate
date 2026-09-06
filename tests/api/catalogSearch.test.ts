import { describe, it, expect, beforeAll } from 'vitest'

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3000'

async function search(query: string, extra = ''): Promise<any> {
  const response = await fetch(`${BASE}/api/catalog/search?q=${encodeURIComponent(query)}${extra}`)
  expect(response.ok).toBe(true)
  return response.json()
}

beforeAll(async () => {
  try {
    await fetch(`${BASE}/api/catalog/search?q=strat`)
  } catch {
    throw new Error(`Kein Dev-Server unter ${BASE}. Vorher "yarn dev" starten.`)
  }
})

describe('GET /api/catalog/search', () => {
  it('findet die Stratocaster über das Synonym', async () => {
    const body = await search('strat')
    expect(body.results.length).toBeGreaterThan(0)
    expect(body.results[0].name).toBe('Stratocaster')
    expect(body.results[0].brandName).toBe('Fender')
    expect(body.results[0].level).toBe('line')
  })

  it('liefert Ausführungen neben der Modell-Linie', async () => {
    const body = await search('strat')
    expect(body.results.some((r: any) => r.level === 'variant')).toBe(true)
  })

  it('markiert die Stratocaster als rückfragewürdig', async () => {
    const body = await search('strat')
    const line = body.results.find((r: any) => r.level === 'line')
    expect(line.needsPrecisionHint).toBe(true)
  })

  it('markiert den DS-1 nicht als rückfragewürdig', async () => {
    const body = await search('ds1')
    expect(body.results[0].needsPrecisionHint).toBe(false)
  })

  it('verarbeitet eine ganze Frage', async () => {
    const body = await search('Wer hat hier einen AC30?')
    expect(body.results[0].name).toBe('AC30')
  })

  it('filtert auf eine Kategorie', async () => {
    const body = await search('slinky', '&category=strings')
    expect(body.results.every((r: any) => r.categoryId === 'strings')).toBe(true)
  })

  it('liefert bei leerer Eingabe ein leeres Ergebnis statt eines Fehlers', async () => {
    const body = await search('')
    expect(body.results).toEqual([])
  })

  it('nennt zu einer Ausführung den Namen ihrer Modell-Linie', async () => {
    const body = await search('strat')
    const variant = body.results.find((r: any) => r.level === 'variant')
    expect(variant.lineName).toBe('Stratocaster')
  })
})
