import { describe, it, expect } from 'vitest'

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3000'

async function search(query: string, extra = ''): Promise<any> {
  const response = await fetch(`${BASE}/api/catalog/search?q=${encodeURIComponent(query)}${extra}`)
  return response.json()
}

describe('contract for the catalog picker', () => {
  it('returns every field the list renders', async () => {
    const body = await search('strat')
    const first = body.results[0]
    expect(Object.keys(first).sort()).toEqual(
      [
        'brandName', 'categoryId', 'id', 'isVerified', 'level',
        'lineId', 'lineName', 'name', 'needsPrecisionHint', 'rarityBase', 'slug',
      ].sort(),
    )
  })

  it('copes with a single letter', async () => {
    // Every keystroke fires a request - the first letter must not blow up.
    const body = await search('s')
    expect(Array.isArray(body.results)).toBe(true)
  })

  it('caps the list at eight entries', async () => {
    const body = await search('a')
    expect(body.results.length).toBeLessThanOrEqual(8)
  })

  it('returns only strings for a strings query', async () => {
    const body = await search('slinky', '&category=strings')
    expect(body.results.every((r: any) => r.categoryId === 'strings')).toBe(true)
  })
})
