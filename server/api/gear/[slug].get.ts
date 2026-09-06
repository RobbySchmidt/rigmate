import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import type { RarityBase } from '#shared/utils/rarityBase'
import { normalizeUserId } from '../../utils/authUser'
import { rarityWeight } from '../../utils/rarity'

export interface GearItemRef {
  id: string
  slug: string
  name: string
}

export interface GearVariant {
  id: string
  slug: string
  name: string
  rarity_base: RarityBase
}

export interface GearPlayer {
  userId: string
  displayName: string
  year: number | null
  finish: string | null
}

export interface GearItemHead {
  id: string
  slug: string
  name: string
  brandName: string
  categoryId: string
  level: 'line' | 'variant'
  rarityBase: RarityBase
  imagePath: string | null
  isVerified: boolean
}

export interface GearPageData {
  item: GearItemHead
  line: GearItemRef | null
  variants: GearVariant[]
  stats: { ownerCount: number; wishCount: number; rarity: number }
  players: GearPlayer[] | null
}

/**
 * Oeffentliche Gear-Seite: Katalog-Eintrag, Ausfuehrungen und aggregierte
 * Zahlen sind das Schaufenster (Abschnitt 10) und brauchen keinen Login.
 * Die Namen der Spieler sind Profildaten und bleiben dahinter. Die
 * aggregierten Zahlen holt service_role, weil user_catalog_entries und
 * catalog_item_stats anon und authenticated entzogen sind (siehe
 * supabase/migrations/20260906143333_revoke_stats_public.sql) - ein
 * Besucher ohne Login saehe sonst ueberall 0/0.
 */
export default defineEventHandler(async (event): Promise<GearPageData> => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) throw createError({ statusCode: 400, statusMessage: 'Slug fehlt' })

  const admin = serverSupabaseServiceRole(event)

  const { data: item, error: itemError } = await admin
    .from('catalog_items')
    .select(
      'id, slug, name, category_id, parent_id, line_id, rarity_base, image_path, is_verified, brands ( name )',
    )
    .eq('slug', slug)
    .maybeSingle()

  if (itemError) {
    throw createError({ statusCode: 502, statusMessage: `Katalog-Eintrag nicht ladbar: ${itemError.message}` })
  }
  if (!item) throw createError({ statusCode: 404, statusMessage: 'Nicht gefunden' })

  const [usersResult, statsResult, variantsResult, lineResult] = await Promise.all([
    admin.from('profiles').select('id', { count: 'exact', head: true }),
    admin
      .from('catalog_item_stats')
      .select('owner_count, wish_count')
      .eq('catalog_item_id', item.id)
      .maybeSingle(),
    admin
      .from('catalog_items')
      .select('id, slug, name, rarity_base')
      .eq('parent_id', item.line_id)
      // line_id ist bei einer Ausfuehrung die eigene Elternzeile (coalesce
      // in der Schema-Definition) - ohne diesen Ausschluss traefe die
      // Abfrage auch auf das aufgerufene Item selbst, und die Seite
      // fuehrte sich unter "Ausfuehrungen" selbst auf. Fuer eine
      // Modell-Linie hat kein Kind dieselbe Id wie die Linie, der Filter
      // ist dort also folgenlos.
      .neq('id', item.id)
      .order('name'),
    item.parent_id
      ? admin.from('catalog_items').select('id, slug, name').eq('id', item.parent_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])

  // Ein verschlucktes { error } ist laut frueheren Tasks der haeufigste
  // Fehler in diesem Projekt gewesen - hier vier weitere Lesezugriffe mit
  // service_role, die alle scheitern koennen.
  if (usersResult.error) {
    throw createError({ statusCode: 502, statusMessage: `Nutzerzahl nicht ladbar: ${usersResult.error.message}` })
  }
  if (statsResult.error) {
    throw createError({ statusCode: 502, statusMessage: `Statistik nicht ladbar: ${statsResult.error.message}` })
  }
  if (variantsResult.error) {
    throw createError({
      statusCode: 502,
      statusMessage: `Ausfuehrungen nicht ladbar: ${variantsResult.error.message}`,
    })
  }
  if (lineResult.error) {
    throw createError({ statusCode: 502, statusMessage: `Modell-Linie nicht ladbar: ${lineResult.error.message}` })
  }

  const ownerCount = Number(statsResult.data?.owner_count ?? 0)
  const wishCount = Number(statsResult.data?.wish_count ?? 0)
  const totalUsers = usersResult.count ?? 0

  // Die Spielerliste ist Profildaten und bleibt hinter dem Login. Die reine
  // Zahl oben darf oeffentlich sein - sie macht die Seite als Schaufenster
  // erst gut. Hier zaehlt nur OB jemand angemeldet ist, nicht WER - trotzdem
  // ueber den gemeinsamen Helfer normalisiert, damit es dafuer nur einen
  // Weg im Projekt gibt (siehe server/utils/authUser.ts).
  const claims = await serverSupabaseUser(event).catch(() => null)
  const signedIn = normalizeUserId(claims as { id?: string; sub?: string } | null) !== null

  let players: GearPlayer[] | null = null
  if (signedIn) {
    const { data: rows, error: playersError } = await admin
      .from('gear_items')
      .select('owner_id, year, finish, profiles ( display_name )')
      .eq('catalog_item_id', item.id)
      .limit(50)
    if (playersError) {
      throw createError({ statusCode: 502, statusMessage: `Spieler nicht ladbar: ${playersError.message}` })
    }
    players = (rows ?? []).map((row: any) => ({
      userId: row.owner_id,
      displayName: row.profiles?.display_name ?? '',
      year: row.year,
      finish: row.finish,
    }))
  }

  return {
    item: {
      id: item.id,
      slug: item.slug,
      name: item.name,
      brandName: (item as any).brands?.name ?? '',
      categoryId: item.category_id,
      level: item.parent_id === null ? 'line' : 'variant',
      rarityBase: item.rarity_base as RarityBase,
      imagePath: item.image_path,
      isVerified: item.is_verified,
    },
    line: (lineResult.data as GearItemRef | null) ?? null,
    variants: (variantsResult.data as GearVariant[] | null) ?? [],
    stats: {
      ownerCount,
      wishCount,
      rarity: rarityWeight(item.rarity_base as RarityBase, ownerCount, totalUsers),
    },
    players,
  }
})
