import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { CATALOG, type SeedLine, type SeedVariant } from './data/catalog'

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} fehlt in .env`)
  return value
}

const supabase = createClient(required('SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
})

// Fallback only. The database owns brand normalization: normalize_brand_name()
// plus the brands_normalize_name trigger overwrite whatever the client sends,
// so a second implementation here would be a second source of truth — and the
// two provably diverge for diacritics outside the fixed Latin-1 table the SQL
// side translates. This copy exists purely so the seed still runs when
// PostgREST has not reloaded its schema cache and cannot see the function yet.
function normalizeBrandLocally(name: string): string {
  return name
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

let useRpc = true

async function normalizeBrand(name: string): Promise<string> {
  if (useRpc) {
    const { data, error } = await supabase.rpc('normalize_brand_name', { input: name })
    if (!error && typeof data === 'string') return data
    useRpc = false
    console.warn(
      `\nnormalize_brand_name ist über PostgREST nicht erreichbar (${
        error?.message ?? 'unerwartete Antwort'
      }). Der Seed fällt auf die lokale Normalisierung zurück.`,
    )
  }
  return normalizeBrandLocally(name)
}

// Most brands carry several model lines, so without this cache the seed would
// look the same brand up dozens of times.
const brandIds = new Map<string, string>()

async function ensureBrand(name: string): Promise<string> {
  const cached = brandIds.get(name)
  if (cached) return cached

  const normalized = await normalizeBrand(name)
  const { data: existing } = await supabase
    .from('brands')
    .select('id')
    .eq('normalized_name', normalized)
    .maybeSingle()

  if (existing) {
    brandIds.set(name, existing.id)
    return existing.id
  }

  const { data, error } = await supabase
    .from('brands')
    .insert({ name, normalized_name: normalized })
    .select('id')
    .single()
  if (error) throw new Error(`Marke "${name}": ${error.message}`)

  brandIds.set(name, data.id)
  return data.id
}

async function ensureItem(input: {
  brandId: string
  categoryId: string
  name: string
  parentId: string | null
  synonyms: string[]
  rarity: string
}): Promise<string> {
  const { data: existing } = await supabase
    .from('catalog_items')
    .select('id')
    .eq('brand_id', input.brandId)
    .eq('name', input.name)
    .maybeSingle()

  const payload = {
    brand_id: input.brandId,
    category_id: input.categoryId,
    name: input.name,
    parent_id: input.parentId,
    synonyms: input.synonyms,
    rarity_base: input.rarity,
    is_verified: true,
  }

  if (existing) {
    const { error } = await supabase.from('catalog_items').update(payload).eq('id', existing.id)
    if (error) throw new Error(`Eintrag "${input.name}": ${error.message}`)
    return existing.id
  }

  const { data, error } = await supabase.from('catalog_items').insert(payload).select('id').single()
  if (error) throw new Error(`Eintrag "${input.name}": ${error.message}`)
  return data.id
}

async function seedLine(line: SeedLine): Promise<number> {
  const brandId = await ensureBrand(line.brand)
  const lineId = await ensureItem({
    brandId,
    categoryId: line.category,
    name: line.name,
    parentId: null,
    synonyms: line.synonyms ?? [],
    rarity: line.rarity,
  })

  let count = 1
  for (const variant of line.variants ?? ([] as SeedVariant[])) {
    await ensureItem({
      brandId,
      categoryId: line.category,
      name: variant.name,
      parentId: lineId,
      synonyms: variant.synonyms ?? [],
      rarity: variant.rarity,
    })
    count += 1
  }
  return count
}

// Renaming an entry in catalog.ts would otherwise leave the old row behind
// forever, because the seed only ever inserts and updates. Only seeded rows
// are touched (created_by is null) -- anything a user added stays.
async function pruneRemovedItems(): Promise<number> {
  const expected = new Set<string>()
  for (const line of CATALOG) {
    for (const name of [line.name, ...(line.variants?.map((v) => v.name) ?? [])]) {
      expected.add(`${line.brand}::${name}`)
    }
  }

  const { data, error } = await supabase
    .from('catalog_items')
    .select('id, name, parent_id, brands (name)')
    .is('created_by', null)
  if (error) throw new Error(`Aufräumen: ${error.message}`)

  const stale = (data ?? []).filter(
    (row: any) => !expected.has(`${row.brands?.name}::${row.name}`),
  )
  if (stale.length === 0) return 0

  // Variants first: parent_id is "on delete restrict", so a model line can
  // only go once nothing hangs off it.
  const ordered = [...stale].sort((a: any, b: any) => (a.parent_id ? 0 : 1) - (b.parent_id ? 0 : 1))
  for (const row of ordered as any[]) {
    const { error: deleteError } = await supabase.from('catalog_items').delete().eq('id', row.id)
    if (deleteError) throw new Error(`Aufräumen "${row.name}": ${deleteError.message}`)
    console.log(`entfernt: ${row.brands?.name} ${row.name}`)
  }
  return stale.length
}

async function main() {
  let total = 0
  for (const line of CATALOG) {
    total += await seedLine(line)
    process.stdout.write('.')
  }
  process.stdout.write('\n')

  const pruned = await pruneRemovedItems()
  if (pruned > 0) console.log(`${pruned} nicht mehr im Katalog geführte Einträge entfernt.`)

  console.log(`${total} Katalog-Einträge eingespielt oder aktualisiert.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
