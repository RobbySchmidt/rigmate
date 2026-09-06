import { describe, it, expect } from 'vitest'

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3000'

async function search(query: string, extra = ''): Promise<any> {
  const response = await fetch(`${BASE}/api/catalog/search?q=${encodeURIComponent(query)}${extra}`)
  return response.json()
}

describe('Vertrag fuer das Auswahlfeld', () => {
  it('liefert alle Felder, die die Liste anzeigt', async () => {
    const body = await search('strat')
    const first = body.results[0]
    expect(Object.keys(first).sort()).toEqual(
      [
        'brandName', 'categoryId', 'id', 'isVerified', 'level',
        'lineId', 'lineName', 'name', 'needsPrecisionHint', 'rarityBase', 'slug',
      ].sort(),
    )
  })

  it('kommt mit einem einzelnen Buchstaben zurecht', async () => {
    // Bei jedem Tastendruck - der erste Buchstabe darf nichts umbringen.
    const body = await search('s')
    expect(Array.isArray(body.results)).toBe(true)
  })

  it('begrenzt die Liste auf acht Eintraege', async () => {
    const body = await search('a')
    expect(body.results.length).toBeLessThanOrEqual(8)
  })

  it('liefert fuer Saiten nur Saiten', async () => {
    const body = await search('slinky', '&category=strings')
    expect(body.results.every((r: any) => r.categoryId === 'strings')).toBe(true)
  })
})
