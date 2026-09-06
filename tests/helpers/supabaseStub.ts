import { vi } from 'vitest'

export interface QueryResult {
  data?: unknown
  error?: { message: string } | null
}

const CHAIN_METHODS = ['select', 'eq', 'order', 'insert', 'update', 'delete'] as const

/**
 * Bildet ein Supabase-Query-Objekt so weit nach, wie rig.vue es braucht:
 * verkettbare Methoden (select/eq/order/insert/delete/...), die alle
 * dasselbe Objekt zurueckgeben, und ein .then(), damit sowohl
 * `await supabase.from(t).insert(x)` als auch
 * `await supabase.from(t).insert(x).select('id').single()` funktionieren -
 * genau wie beim echten Client.
 */
function createQueryStub(result: QueryResult) {
  const resolved = { data: result.data ?? null, error: result.error ?? null }
  const chain: Record<string, unknown> = {}
  for (const method of CHAIN_METHODS) {
    chain[method] = vi.fn(() => chain)
  }
  chain.single = vi.fn(() => Promise.resolve(resolved))
  chain.maybeSingle = vi.fn(() => Promise.resolve(resolved))
  chain.then = (onFulfilled: (value: QueryResult) => unknown, onRejected?: (reason: unknown) => unknown) =>
    Promise.resolve(resolved).then(onFulfilled, onRejected)
  return chain
}

export interface SupabaseStubConfig {
  /** Ergebnis fuer den ERSTEN Aufruf von .from(table) je Tabelle - bei rig.vue immer der initiale Read in useAsyncData. */
  initialReads?: Record<string, QueryResult>
  /** Ergebnisse fuer JEDEN WEITEREN Aufruf von .from(table), der Reihe nach abgearbeitet - ein Eintrag pro erwartetem Schreibzugriff. */
  writes?: Record<string, QueryResult[]>
}

/** Minimaler Ersatz fuer useSupabaseClient() in Komponenten-Tests. */
export function createSupabaseStub(config: SupabaseStubConfig = {}) {
  const callCounts: Record<string, number> = {}
  const writeQueues: Record<string, QueryResult[]> = {}
  for (const [table, queue] of Object.entries(config.writes ?? {})) {
    writeQueues[table] = [...queue]
  }

  const from = vi.fn((table: string) => {
    callCounts[table] = (callCounts[table] ?? 0) + 1
    if (callCounts[table] === 1 && config.initialReads?.[table]) {
      return createQueryStub(config.initialReads[table])
    }
    const next = writeQueues[table]?.shift() ?? { data: null, error: null }
    return createQueryStub(next)
  })

  return { from }
}
