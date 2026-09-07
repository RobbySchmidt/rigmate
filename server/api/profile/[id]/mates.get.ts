import { serverSupabaseServiceRole } from '#supabase/server'
import { requireUserId } from '../../../utils/authUser'

export interface MatesResponse {
  /** Personen, die mindestens ein Geraet mit diesem Profil teilen. */
  mateCount: number
}

/**
 * Anzahl Personen, die mindestens einen Katalogeintrag mit dieser Person
 * teilen. Aggregiert ueber alle Nutzer, gehoert deshalb auf den Server
 * (Architekturregel in CLAUDE.md) - und braucht service_role, weil ein
 * angemeldeter Client zwar gear_items lesen darf, die Zahl aber ueber
 * fremde Rigs laeuft und der Browser dafuer den halben Bestand ziehen
 * muesste.
 *
 * Achtung, Datenschutz: diese Zahl erlaubt bei ungewoehnlichem Equipment
 * Rueckschluesse darauf, wie klein die Plattform ist - dasselbe Problem,
 * das Abschnitt 15 der Hauptspec fuer die oeffentliche Gear-Seite notiert
 * (siehe Abschnitt 8 der Profil-Spec, der es ausdruecklich auf dieselbe
 * Liste setzt). Deshalb nur fuer Angemeldete: requireUserId() wirft 401,
 * bevor irgendetwas gerechnet wird.
 *
 * Gezaehlt wird ausschliesslich ueber gear_items, nicht ueber die View
 * user_catalog_entries: Wunschliste ist kein geteiltes Geraet, und bei den
 * Verbrauchsmaterialien teilen sich fast alle denselben Saitensatz - beides
 * wuerde die Kennzahl zu einer Konstanten machen, statt zu zeigen, ob der
 * Gear-Graph fuer jemanden traegt.
 */
export default defineEventHandler(async (event): Promise<MatesResponse> => {
  await requireUserId(event)

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Profil fehlt' })

  const admin = serverSupabaseServiceRole(event)

  // Erst pruefen, dass es das Profil ueberhaupt gibt. Ohne diesen Schritt
  // beantwortet eine vertippte Id die Frage mit einer glaubwuerdigen 0 -
  // genau der wiederkehrende Fehler dieses Projekts: ein Fehlschlag, der
  // aussieht, als sei nichts passiert. Abschnitt 7 der Profil-Spec verlangt
  // ausdruecklich, dass "0 Rig-Kollegen" und "Kollegenzahl nicht
  // berechenbar" unterscheidbar bleiben.
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id')
    .eq('id', id)
    .maybeSingle()
  if (profileError) {
    throw createError({ statusCode: 502, statusMessage: `Profil nicht ladbar: ${profileError.message}` })
  }
  if (!profile) throw createError({ statusCode: 404, statusMessage: 'Nicht gefunden' })

  const { data: own, error: ownError } = await admin
    .from('gear_items')
    .select('catalog_item_id')
    .eq('owner_id', id)
  if (ownError) {
    throw createError({ statusCode: 502, statusMessage: `Eigenes Rig nicht ladbar: ${ownError.message}` })
  }

  const catalogIds = [...new Set((own ?? []).map((row) => row.catalog_item_id as string))]
  // .in('catalog_item_id', []) waere eine leere IN-Klausel - PostgREST
  // beantwortet das mit einem Syntaxfehler statt einem leeren Ergebnis
  // (dieselbe Falle wie in server/api/recommendations.get.ts). Wer nichts
  // besitzt, teilt auch nichts - das ist eine echte Null, kein Fehlschlag.
  if (catalogIds.length === 0) return { mateCount: 0 }

  const { data: others, error: othersError, count } = await admin
    .from('gear_items')
    .select('owner_id', { count: 'exact' })
    .in('catalog_item_id', catalogIds)
    .neq('owner_id', id)
  if (othersError) {
    throw createError({ statusCode: 502, statusMessage: `Kollegen nicht ladbar: ${othersError.message}` })
  }

  // PostgREST deckelt Ergebnismengen (Supabase-Standard: 1000 Zeilen). Ohne
  // diesen Abgleich lieferte ein gedeckeltes Ergebnis eine zu kleine Zahl,
  // die wie eine echte Auskunft aussieht - der wiederkehrende Fehler dieses
  // Projekts. Heute unerreichbar (78 Zeilen in gear_items), aber die Zahl
  // waechst mit der Plattform; dann lieber laut scheitern als leise luegen.
  // Der Fix waere dann Blaettern per .range() oder eine Aggregation in SQL.
  const rows = others ?? []
  if (count !== null && count > rows.length) {
    throw createError({
      statusCode: 502,
      statusMessage: `Kollegen nicht vollstaendig ladbar: ${rows.length} von ${count} Zeilen`,
    })
  }

  return { mateCount: new Set(rows.map((row) => row.owner_id as string)).size }
})
