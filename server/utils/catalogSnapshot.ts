import type { H3Event } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import { buildSearchable, type CatalogEntry, type SearchableEntry } from './catalogMatch'

// Bei rund 200 Einträgen kostet der ganze Katalog nichts und erspart der
// Autovervollständigung einen DB-Roundtrip pro Tastendruck. Ab einigen
// tausend Einträgen gehört das in einen Trigram-Index in Postgres.
const TTL_MS = 60_000

let cache: { entries: SearchableEntry[]; loadedAt: number } | null = null

export function invalidateCatalogSnapshot(): void {
  cache = null
}

export async function getCatalogSnapshot(event: H3Event): Promise<SearchableEntry[]> {
  if (cache && Date.now() - cache.loadedAt < TTL_MS) return cache.entries

  const client = serverSupabaseServiceRole(event)
  const { data, error } = await client
    .from('catalog_items')
    .select('id, name, slug, category_id, parent_id, line_id, synonyms, rarity_base, is_verified, brands ( name )')

  if (error) {
    throw createError({ statusCode: 502, statusMessage: `Katalog nicht ladbar: ${error.message}` })
  }

  const entries: CatalogEntry[] = (data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    brandName: row.brands?.name ?? '',
    categoryId: row.category_id,
    parentId: row.parent_id,
    lineId: row.line_id,
    synonyms: row.synonyms ?? [],
    rarityBase: row.rarity_base,
    isVerified: row.is_verified,
  }))

  cache = { entries: buildSearchable(entries), loadedAt: Date.now() }
  return cache.entries
}
