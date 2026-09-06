import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { normalizeUserId } from '../utils/authUser'
import { matchCatalog } from '../utils/catalogMatch'
import { getCatalogSnapshot } from '../utils/catalogSnapshot'
import { meaningfulTokens } from '../utils/normalize'

export interface PersonHit {
  userId: string
  displayName: string
}

// Vor jeder Verarbeitung kappen: normalize()/tokenize() laufen linear ueber
// die Eingabe, und jedes Token wird unten Teil des ilike-Musters der
// Personensuche. Ohne Deckel koennte eine beliebig lange Eingabe (Kilobytes
// im Query-String) unnoetig viel Arbeit erzeugen, bevor ueberhaupt gefiltert
// wird. 200 Zeichen sind fuer "AC30" oder eine ganze Frage wie "Wer hat hier
// einen AC30?" weit mehr als genug.
const MAX_TERM_LENGTH = 200

// Anzeigenamen sind laut Schema (supabase/migrations/20260906115314_profiles.sql)
// hoechstens 40 Zeichen lang - mehr als fuenf Woerter braucht das
// ilike-Muster nie, um einen Namen zu treffen. Der Deckel haelt das Muster
// kurz und die Zahl der erzwungenen Teilstring-Treffer klein, auch wenn
// jemand zehn Woerter oder eine ganze Frage eintippt.
const MAX_PEOPLE_PATTERN_TOKENS = 5

export default defineEventHandler(async (event) => {
  const term = String(getQuery(event).q ?? '').slice(0, MAX_TERM_LENGTH)
  const tokens = meaningfulTokens(term)
  if (tokens.length === 0) return { catalog: [], people: [] }

  const snapshot = await getCatalogSnapshot(event)
  const catalog = matchCatalog(term, snapshot, { limit: 10 }).map(({ entry }) => ({
    id: entry.id,
    slug: entry.slug,
    name: entry.name,
    brandName: entry.brandName,
    categoryId: entry.categoryId,
    level: entry.level,
  }))

  // Abschnitt 10 der Spec: Profile sind nur mit Login sichtbar - auch in der
  // Suche. service_role umgeht RLS vollstaendig, deshalb ist dieser Check
  // hier die eigentliche Schranke, nicht die Datenbank. "Nur ob, nicht wer"
  // ueber den gemeinsamen Helfer (server/utils/authUser.ts), wie bereits in
  // server/api/gear/[slug].get.ts etabliert - damit es dafuer nur einen Weg
  // im Projekt gibt.
  const claims = await serverSupabaseUser(event).catch(() => null)
  const signedIn = normalizeUserId(claims as { id?: string; sub?: string } | null) !== null

  let people: PersonHit[] = []
  if (signedIn) {
    const admin = serverSupabaseServiceRole(event)

    // Wildcard-Ueberlegung: tokens kommen aus meaningfulTokens() ->
    // tokenize() -> normalize() (server/utils/normalize.ts), und normalize()
    // ersetzt alles ausser a-z/0-9 durch ein Leerzeichen. Ein Token kann
    // deshalb nie "%", "_" oder "\" enthalten - die LIKE-Sonderzeichen sind
    // schon vor dem Aufbau des Musters herausnormalisiert, kein Escaping
    // noetig (getippte "%" oder "_" landen nie im Muster, sondern werden zu
    // Wortgrenzen). Die Anzahl der verwendeten Tokens wird trotzdem
    // gedeckelt (s.o.), damit das Muster bei sehr vielen Woertern nicht
    // unbegrenzt waechst.
    const patternTokens = tokens.slice(0, MAX_PEOPLE_PATTERN_TOKENS)
    const { data, error } = await admin
      .from('profiles')
      .select('id, display_name')
      .ilike('display_name', `%${patternTokens.join('%')}%`)
      .limit(10)
    if (error) {
      throw createError({ statusCode: 502, statusMessage: `Personensuche nicht moeglich: ${error.message}` })
    }
    people = (data ?? []).map((row: any) => ({ userId: row.id, displayName: row.display_name }))
  }

  return { catalog, people }
})
