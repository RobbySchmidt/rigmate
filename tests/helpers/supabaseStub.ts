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
 *
 * `onInsert` zeichnet das Argument jedes .insert()-Aufrufs auf - unabhaengig
 * davon, ob der konfigurierte Ausgang Erfolg oder Fehler ist. Ohne das kann
 * kein Test pruefen, WAS tatsaechlich geschrieben wurde (siehe Fix-Runde 1
 * im Task-14-Report: genau diese Luecke liess acht Stellen im Projekt
 * unbemerkt undefined statt der echten Nutzer-Id schreiben).
 */
function createQueryStub(result: QueryResult, onInsert?: (payload: unknown) => void) {
  const resolved = { data: result.data ?? null, error: result.error ?? null }
  const chain: Record<string, unknown> = {}
  for (const method of CHAIN_METHODS) {
    chain[method] = vi.fn((payload?: unknown) => {
      if (method === 'insert') onInsert?.(payload)
      return chain
    })
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
  // Ein Eintrag je .insert()-Aufruf, gruppiert nach Tabelle - so kann ein
  // Test nach dem Schreiben pruefen, welche owner_id/user_id tatsaechlich
  // uebergeben wurde, statt nur den Erfolg/Fehlschlag zu sehen.
  const inserts: Record<string, unknown[]> = {}

  const from = vi.fn((table: string) => {
    callCounts[table] = (callCounts[table] ?? 0) + 1
    const result =
      callCounts[table] === 1 && config.initialReads?.[table]
        ? config.initialReads[table]
        : (writeQueues[table]?.shift() ?? { data: null, error: null })
    return createQueryStub(result, (payload) => {
      const rows = inserts[table] ?? []
      rows.push(payload)
      inserts[table] = rows
    })
  })

  return { from, inserts }
}
