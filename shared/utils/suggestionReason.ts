// Einziger Ort fuer die Form einer Empfehlungsbegruendung. Vorher gab es sie
// zweifach: einmal in server/api/recommendations.get.ts (die Route, die sie
// erzeugt) und einmal als eigene, unabhaengige Kopie in
// app/composables/useRecommendationReason.ts (die sie in einen Satz
// uebersetzt) - zwei Deklarationen eines Vertrags sind, wie sie
// auseinanderdriften. Dieselbe Behandlung wie RarityBase
// (shared/utils/rarityBase.ts) und die Baujahr-Regel
// (shared/utils/modelYearRule.ts): eine Quelle, beide Seiten importieren von
// hier. server/utils/scoring.ts bleibt die inhaltliche Herkunft von
// MatchKind/MatchDepth (dort verwendet fuer Gewichtung und Matching), re-
// exportiert sie aber nur noch von hier, statt sie selbst zu deklarieren.
export type MatchKind = 'gear' | 'consumable' | 'wish'
export type MatchDepth = 'line' | 'variant' | 'variant_year'

export interface SuggestionReason {
  kind: MatchKind
  depth: MatchDepth
  catalogItemId: string
  brandName: string
  name: string
}
