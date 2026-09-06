// Deciding WHAT the seed would delete, separated from actually deleting it.
//
// Two machines work against the same hosted Supabase instance (see CLAUDE.md
// -- that is the whole reason there is no local Docker stack). So rows that
// this checkout does not know about are not necessarily junk: they may be
// entries the other machine added minutes ago with a newer catalog.ts. A brand
// new entry has no references yet, so no foreign key stands in the way and a
// silent prune would take all of it. That is why the seed only ever previews
// this and deletes on an explicit --prune.
//
// Pure functions, no client, no environment: importable from tests without
// running a seed.

import type { SeedLine } from './data/catalog'

/** A seeded catalog row, reduced to what the prune decision needs. */
export interface SeededRow {
  id: string
  name: string
  parentId: string | null
  brand: string
}

export interface PruneBlocker {
  line: SeededRow
  survivors: SeededRow[]
}

export function label(row: SeededRow): string {
  return `${row.brand} ${row.name}`
}

function keyOf(brand: string, name: string): string {
  return `${brand}::${name}`
}

/** Every (brand, name) pair the catalog file currently declares. */
export function catalogKeys(catalog: SeedLine[]): Set<string> {
  const keys = new Set<string>()
  for (const line of catalog) {
    for (const name of [line.name, ...(line.variants?.map((v) => v.name) ?? [])]) {
      keys.add(keyOf(line.brand, name))
    }
  }
  return keys
}

/** Seeded rows the catalog file no longer declares. */
export function selectOrphans(rows: SeededRow[], catalog: SeedLine[]): SeededRow[] {
  const keys = catalogKeys(catalog)
  return rows.filter((row) => !keys.has(keyOf(row.brand, row.name)))
}

/**
 * A stale model line that still carries children the catalog DOES declare.
 * `parent_id` is "on delete restrict", so deleting such a line aborts the loop
 * halfway and leaves a partial prune behind. Better to refuse the whole prune
 * than to do half of it.
 */
export function findPruneBlockers(rows: SeededRow[], orphans: SeededRow[]): PruneBlocker[] {
  const orphanIds = new Set(orphans.map((row) => row.id))
  return orphans
    .filter((row) => row.parentId === null)
    .map((line) => ({
      line,
      survivors: rows.filter((row) => row.parentId === line.id && !orphanIds.has(row.id)),
    }))
    .filter((blocker) => blocker.survivors.length > 0)
}

/** Variants before their model lines, so "on delete restrict" holds. */
export function orderForDeletion(orphans: SeededRow[]): SeededRow[] {
  return [...orphans].sort((a, b) => Number(a.parentId === null) - Number(b.parentId === null))
}
