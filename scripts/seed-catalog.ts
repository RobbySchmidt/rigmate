import { config as loadEnv } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { CATALOG, type SeedLine, type SeedVariant } from './data/catalog'
import {
  findPruneBlockers,
  label,
  orderForDeletion,
  selectOrphans,
  type SeededRow,
} from './prune-plan'

// "import 'dotenv/config'" laedt dotenv 17 mit seinen Standardeinstellungen,
// und die geben beim Laden eine zufaellige Werbezeile auf stdout aus (siehe
// _getRandomTip in node_modules/dotenv/lib/main.js) - das Skript hier gibt
// aber Zahlen maschinenlesbar auf stdout aus, und eine Werbezeile dazwischen
// macht das unzuverlaessig. `quiet: true` unterdrueckt genau diese Ausgabe.
loadEnv({ quiet: true })

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

/** Every row the seed itself owns. Anything a user created stays untouched. */
async function loadSeededRows(): Promise<SeededRow[]> {
  const { data, error } = await supabase
    .from('catalog_items')
    .select('id, name, parent_id, brands (name)')
    .is('created_by', null)
  if (error) throw new Error(`Katalog lesen: ${error.message}`)

  return (data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    parentId: row.parent_id,
    brand: row.brands?.name ?? '',
  }))
}

async function deleteOrphans(orphans: SeededRow[]): Promise<void> {
  for (const row of orderForDeletion(orphans)) {
    const { error } = await supabase.from('catalog_items').delete().eq('id', row.id)
    if (error) throw new Error(`Entfernen "${label(row)}": ${error.message}`)
    console.log(`entfernt: ${label(row)}`)
  }
  console.log(`${orphans.length} nicht mehr im Katalog geführte Einträge entfernt.`)
}

async function main() {
  const shouldPrune = process.argv.slice(2).includes('--prune')

  let total = 0
  for (const line of CATALOG) {
    total += await seedLine(line)
    process.stdout.write('.')
  }
  process.stdout.write('\n')
  console.log(`${total} Katalog-Einträge eingespielt oder aktualisiert.`)

  // Renaming an entry in catalog.ts leaves the old row behind, because the
  // seed only inserts and updates. Deleting it is a separate decision though:
  // the operator asked for a seed, not for a delete, and on a shared instance
  // an unknown row may simply be newer than this checkout.
  const rows = await loadSeededRows()
  const orphans = selectOrphans(rows, CATALOG)
  if (orphans.length === 0) return

  console.error('')
  console.error(`${orphans.length} Einträge stehen in der Datenbank, aber nicht mehr im Katalog:`)
  for (const row of orderForDeletion(orphans)) console.error(`  ${label(row)}`)

  const blockers = findPruneBlockers(rows, orphans)
  if (blockers.length > 0) {
    console.error('')
    console.error('Aufräumen nicht möglich, es wurde nichts gelöscht:')
    for (const { line, survivors } of blockers) {
      console.error(
        `  "${label(line)}" steht nicht mehr im Katalog, trägt aber noch ` +
          `${survivors.map(label).join(', ')}.`,
      )
    }
    console.error('Erst die Ausführungen umhängen -- sonst bricht das Löschen mittendrin ab')
    console.error('und hinterlässt einen halb aufgeräumten Katalog.')
    process.exit(1)
  }

  if (!shouldPrune) {
    console.error('')
    console.error('Es wurde nichts gelöscht. Diese Zeilen können von einem anderen Rechner')
    console.error('stammen, der mit einem neueren Katalog gegen dieselbe Supabase-Instanz')
    console.error('gearbeitet hat -- beide Rechner teilen sich eine Instanz (siehe CLAUDE.md).')
    console.error('Erst den eigenen Stand prüfen (git pull), dann bei Absicht erneut aufrufen:')
    console.error('  yarn seed:catalog --prune')
    process.exit(1)
  }

  await deleteOrphans(orphans)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
