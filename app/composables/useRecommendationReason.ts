// Einzige Deklaration in shared/utils/suggestionReason.ts - dieselbe Form,
// die server/api/recommendations.get.ts erzeugt und exportiert. Vorher gab
// es hier eine eigene, unabhaengige Kopie; zwei Deklarationen eines
// Vertrags sind, wie sie auseinanderdriften.
import type { SuggestionReason } from '#shared/utils/suggestionReason'

/**
 * Bewusst ohne Artikel: das Geschlecht eines beliebigen Geraetenamens
 * kennt niemand, und "einen AC30" laesst sich nicht generieren.
 */
export function useRecommendationReason(reason: SuggestionReason | null, matchCount: number): string {
  const t = useText()
  if (!reason) return t.suggestions.fallbackBadge

  const label = `${reason.brandName} ${reason.name}`.trim()
  const depth = t.suggestions.reasonDepth[reason.depth]
  const head = `${t.suggestions.reasonKind[reason.kind]}: ${label}`
  const withDepth = depth === '' ? head : `${head} — ${depth}`
  return matchCount > 1
    ? `${withDepth}. ${t.suggestions.reasonMore.replace('{count}', String(matchCount - 1))}`
    : withDepth
}
