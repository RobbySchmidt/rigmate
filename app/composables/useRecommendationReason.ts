interface SuggestionReason {
  kind: 'gear' | 'consumable' | 'wish'
  depth: 'line' | 'variant' | 'variant_year'
  brandName: string
  name: string
}

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
