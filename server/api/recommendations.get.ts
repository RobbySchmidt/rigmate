import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import type { RarityBase } from '#shared/utils/rarityBase'
import type { SuggestionReason } from '#shared/utils/suggestionReason'
import { normalizeUserId } from '../utils/authUser'
import { rarityWeight } from '../utils/rarity'
import { comparePair, type OwnedEntry, type UserRig, type WishEntry } from '../utils/scoring'

// Re-exportiert, damit `Consumes/Produces: export interface SuggestionReason`
// (siehe Task-Brief) weiterhin von dieser Route aus importierbar bleibt -
// die einzige Deklaration liegt jetzt aber in shared/utils/suggestionReason.ts,
// gemeinsam mit app/composables/useRecommendationReason.ts genutzt statt
// zweimal unabhaengig gepflegt (siehe dortiger Kommentar).
export type { SuggestionReason }

export interface Suggestion {
  userId: string
  displayName: string
  avatarPath: string | null
  score: number
  matchCount: number
  reason: SuggestionReason | null
}

interface EntryRow {
  user_id: string
  catalog_item_id: string
  year: number | null
  kind: 'gear' | 'consumable' | 'wish'
}

/**
 * @nuxtjs/supabase liest den angemeldeten Nutzer serverseitig nur aus dem
 * Session-Cookie (siehe serverSupabaseClient) - fuer echte Browser-Aufrufe
 * von index.vue reicht das, weil derselbe Nitro-Server die Cookies der
 * Anfrage kennt. Ein Aufrufer, der stattdessen ein Bearer-Token mitschickt
 * (dieser Test hier, oder ein zukuenftiger Nicht-Browser-Client), hat kein
 * Cookie zu bieten - getUser(jwt) prueft ein explizit uebergebenes Token
 * unabhaengig von Cookies und deckt genau diesen Fall ab. Diese Route ist
 * bislang die einzige mit einem echten HTTP-Test unter Bearer-Auth, deshalb
 * bleibt der Bearer-Zweig hier lokal statt im gemeinsamen Server-Helper
 * server/utils/authUser.ts.
 *
 * Die Id-Normalisierung selbst (sub vs. id - siehe authUser.ts fuer die
 * ausfuehrliche Begruendung) kommt aus genau diesem einen gemeinsamen
 * Helfer, damit es dafuer nur eine Regel im Projekt gibt, nicht zwei.
 */
async function resolveUserId(
  event: Parameters<typeof serverSupabaseUser>[0],
  admin: ReturnType<typeof serverSupabaseServiceRole>,
): Promise<string | null> {
  const authHeader = getHeader(event, 'authorization')
  const bearerToken = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (bearerToken) {
    const { data, error } = await admin.auth.getUser(bearerToken)
    if (error || !data.user) return null
    return normalizeUserId(data.user)
  }
  const claims = await serverSupabaseUser(event)
  return normalizeUserId(claims as { id?: string; sub?: string } | null)
}

export default defineEventHandler(async (event) => {
  // Aggregation ueber alle Nutzer - das rechnet der Browser nicht.
  const admin = serverSupabaseServiceRole(event)

  const userId = await resolveUserId(event, admin)
  if (!userId) throw createError({ statusCode: 401, statusMessage: 'Nicht angemeldet' })

  const limit = Math.min(50, Math.max(1, Number(getQuery(event).limit) || 12))

  const [usersResult, catalogResult, entriesResult] = await Promise.all([
    admin.from('profiles').select('id', { count: 'exact', head: true }),
    admin.from('catalog_items').select('id, name, line_id, rarity_base, brands ( name )'),
    admin.from('user_catalog_entries').select('user_id, catalog_item_id, year, kind'),
  ])
  // Ein verschlucktes { error } ist laut frueheren Tasks der haeufigste
  // Fehler in diesem Projekt gewesen - hier drei Lesezugriffe mit
  // service_role, die alle scheitern koennen.
  if (usersResult.error) {
    throw createError({ statusCode: 502, statusMessage: `Nutzerzahl nicht ladbar: ${usersResult.error.message}` })
  }
  if (catalogResult.error) {
    throw createError({ statusCode: 502, statusMessage: `Katalog nicht ladbar: ${catalogResult.error.message}` })
  }
  if (entriesResult.error) {
    throw createError({ statusCode: 502, statusMessage: `Eintraege nicht ladbar: ${entriesResult.error.message}` })
  }

  const totalUsers = usersResult.count
  const catalog = catalogResult.data
  const entries = entriesResult.data

  const catalogById = new Map(
    (catalog ?? []).map((row: any) => [
      row.id,
      {
        id: row.id as string,
        name: row.name as string,
        lineId: row.line_id as string,
        rarityBase: row.rarity_base as RarityBase,
        brandName: (row.brands?.name ?? '') as string,
      },
    ]),
  )

  const ownerCounts = new Map<string, Set<string>>()
  for (const row of (entries ?? []) as EntryRow[]) {
    if (row.kind === 'wish') continue
    const owners = ownerCounts.get(row.catalog_item_id) ?? new Set<string>()
    owners.add(row.user_id)
    ownerCounts.set(row.catalog_item_id, owners)
  }

  const rarityCache = new Map<string, number>()
  function rarityOf(catalogItemId: string): number {
    const cached = rarityCache.get(catalogItemId)
    if (cached !== undefined) return cached
    const item = catalogById.get(catalogItemId)
    const weight = rarityWeight(
      item?.rarityBase ?? 'common',
      ownerCounts.get(catalogItemId)?.size ?? 0,
      totalUsers ?? 0,
    )
    rarityCache.set(catalogItemId, weight)
    return weight
  }

  const rigs = new Map<string, UserRig>()
  for (const row of (entries ?? []) as EntryRow[]) {
    // Ein referenzierter Katalog-Eintrag kann in der Theorie fehlen (die
    // Fremdschluessel verbieten das Loeschen zwar per "on delete restrict",
    // aber diese Aggregation soll sich nicht blind darauf verlassen) - ein
    // verwaister Eintrag zaehlt dann fuer niemanden mit, statt den ganzen
    // Request mit einem TypeError abzuschiessen.
    const item = catalogById.get(row.catalog_item_id)
    if (!item) continue
    const rig = rigs.get(row.user_id) ?? { userId: row.user_id, owned: [], wished: [] }
    if (row.kind === 'wish') {
      rig.wished.push({ catalogItemId: row.catalog_item_id, lineId: item.lineId } satisfies WishEntry)
    } else {
      rig.owned.push({
        catalogItemId: row.catalog_item_id,
        lineId: item.lineId,
        year: row.year,
        kind: row.kind,
      } satisfies OwnedEntry)
    }
    rigs.set(row.user_id, rig)
  }

  const me = rigs.get(userId) ?? { userId, owned: [], wished: [] }
  const hasRig = me.owned.length > 0 || me.wished.length > 0

  const scored: { userId: string; score: number; matchCount: number; reason: SuggestionReason | null }[] = []
  if (hasRig) {
    for (const [otherId, otherRig] of rigs) {
      if (otherId === userId) continue
      const { score, matches } = comparePair(me, otherRig, rarityOf)
      if (score <= 0) continue
      const top = matches[0]!
      const item = catalogById.get(top.catalogItemId)
      scored.push({
        userId: otherId,
        score,
        matchCount: matches.length,
        // Jeder Vorschlag nennt seinen Grund.
        reason: {
          kind: top.kind,
          depth: top.depth,
          catalogItemId: top.catalogItemId,
          brandName: item?.brandName ?? '',
          name: item?.name ?? '',
        },
      })
    }
    scored.sort((a, b) => b.score - a.score)
  }

  // Wird es duenn (kein eigenes Rig, oder niemand teilt etwas), fuellt die
  // Seite mit Zufall auf - immer gekennzeichnet, nie stillschweigend.
  const fallback = scored.length === 0
  if (fallback) {
    const { data: others, error: othersError } = await admin
      .from('profiles')
      .select('id')
      .neq('id', userId)
      .limit(limit * 3)
    if (othersError) {
      throw createError({ statusCode: 502, statusMessage: `Profile nicht ladbar: ${othersError.message}` })
    }
    // Kann leer sein, wenn ausser einem selbst niemand registriert ist -
    // dann bleibt scored leer und die Antwort liefert einfach keine
    // Vorschlaege statt abzustuerzen.
    const shuffled = (others ?? []).sort(() => Math.random() - 0.5).slice(0, limit)
    for (const row of shuffled) {
      scored.push({ userId: row.id, score: 0, matchCount: 0, reason: null })
    }
  }

  const top = scored.slice(0, limit)

  // .in('id', []) waere eine leere IN-Klausel - PostgREST beantwortet das
  // mit einem Syntaxfehler statt einem leeren Ergebnis. Deshalb nur fragen,
  // wenn ueberhaupt jemand uebrig geblieben ist.
  const profileById = new Map<string, { display_name: string; avatar_path: string | null }>()
  if (top.length > 0) {
    const { data: profiles, error: profilesError } = await admin
      .from('profiles')
      .select('id, display_name, avatar_path')
      .in('id', top.map((row) => row.userId))
    if (profilesError) {
      throw createError({ statusCode: 502, statusMessage: `Profile nicht ladbar: ${profilesError.message}` })
    }
    for (const row of (profiles ?? []) as any[]) {
      profileById.set(row.id, row)
    }
  }

  const suggestions: Suggestion[] = top.map((row) => ({
    userId: row.userId,
    displayName: profileById.get(row.userId)?.display_name ?? '',
    avatarPath: profileById.get(row.userId)?.avatar_path ?? null,
    score: row.score,
    matchCount: row.matchCount,
    reason: row.reason,
  }))

  return { fallback, suggestions }
})
