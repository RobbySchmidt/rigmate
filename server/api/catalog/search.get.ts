import { matchCatalog, needsPrecisionHint, type SearchableEntry } from '../../utils/catalogMatch'
import { getCatalogSnapshot } from '../../utils/catalogSnapshot'

export interface CatalogSearchResult {
  id: string
  name: string
  slug: string
  brandName: string
  categoryId: string
  level: 'line' | 'variant'
  lineId: string
  lineName: string
  rarityBase: string
  isVerified: boolean
  needsPrecisionHint: boolean
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const term = typeof query.q === 'string' ? query.q : ''
  const categoryId = typeof query.category === 'string' ? query.category : undefined
  const limit = Math.min(20, Math.max(1, Number(query.limit) || 8))

  const snapshot = await getCatalogSnapshot(event)
  const matches = matchCatalog(term, snapshot, { limit, categoryId })

  const byId = new Map<string, SearchableEntry>(snapshot.map((entry) => [entry.id, entry]))
  const childrenByLine = new Map<string, SearchableEntry[]>()
  for (const entry of snapshot) {
    if (entry.level !== 'variant') continue
    const siblings = childrenByLine.get(entry.lineId) ?? []
    siblings.push(entry)
    childrenByLine.set(entry.lineId, siblings)
  }

  const results: CatalogSearchResult[] = matches.map(({ entry }) => {
    const line = byId.get(entry.lineId)
    return {
      id: entry.id,
      name: entry.name,
      slug: entry.slug,
      brandName: entry.brandName,
      categoryId: entry.categoryId,
      level: entry.level,
      lineId: entry.lineId,
      lineName: line?.name ?? entry.name,
      rarityBase: entry.rarityBase,
      isVerified: entry.isVerified,
      // Nur bei der Modell-Linie sinnvoll: wer schon die Ausführung gewählt
      // hat, ist genau genug.
      needsPrecisionHint:
        entry.level === 'line' && line
          ? needsPrecisionHint(line, childrenByLine.get(entry.id) ?? [])
          : false,
    }
  })

  return { query: term, results }
})
