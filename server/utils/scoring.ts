export type MatchKind = 'gear' | 'consumable' | 'wish'
export type MatchDepth = 'line' | 'variant' | 'variant_year'

export interface OwnedEntry {
  catalogItemId: string
  /** parent_id ?? id - die Modell-Linie. */
  lineId: string
  year: number | null
  kind: 'gear' | 'consumable'
}

export interface WishEntry {
  catalogItemId: string
  lineId: string
}

export interface UserRig {
  userId: string
  owned: OwnedEntry[]
  wished: WishEntry[]
}

export interface SharedMatch {
  kind: MatchKind
  depth: MatchDepth
  catalogItemId: string
  lineId: string
  score: number
}

/**
 * Verbrauchsmaterial ist ein starker Identitaets-Marker, aber ein schwaches
 * Uebereinstimmungs-Signal: es gibt nur ein paar Dutzend gaengige Saitensaetze.
 */
export const KIND_WEIGHTS: Record<MatchKind, number> = {
  gear: 1,
  consumable: 0.3,
  wish: 0.7,
}

/** Der Ungenauere zieht den Treffer herunter. */
export const DEPTH_WEIGHTS: Record<MatchDepth, number> = {
  line: 0.4,
  variant: 1,
  variant_year: 1.6,
}

/**
 * Prototyp-Naeherung fuer "Kombinationen wiegen schwerer": je mehr Geraete
 * zwei Leute teilen, desto ueberproportionaler der Wert. Das echte
 * Signalketten-Matching ("Tube Screamer in Deluxe Reverb" als Paar) braucht
 * einen Vergleich ueber installed_in und ist bewusst zurueckgestellt.
 */
export const COMBO_FACTOR = 0.15

export function matchDepth(a: OwnedEntry, b: OwnedEntry): MatchDepth | null {
  if (a.catalogItemId === b.catalogItemId) {
    // Beide auf der Modell-Linie: Strat und Strat ist ein schwaches Signal,
    // auch wenn die ids gleich sind.
    const isVariant = a.lineId !== a.catalogItemId
    if (!isVariant) return 'line'
    if (a.year !== null && a.year === b.year) return 'variant_year'
    return 'variant'
  }
  if (a.lineId === b.lineId) return 'line'
  return null
}

export function matchScore(kind: MatchKind, depth: MatchDepth, rarity: number): number {
  return rarity * DEPTH_WEIGHTS[depth] * KIND_WEIGHTS[kind]
}

export function pairScore(matches: SharedMatch[]): number {
  const base = matches.reduce((sum, match) => sum + match.score, 0)
  const gearCount = matches.filter((match) => match.kind === 'gear').length
  const combo = gearCount >= 2 ? COMBO_FACTOR * base * (gearCount - 1) : 0
  return base + combo
}

/** Eine geteilte Modell-Linie zaehlt einmal, auf der tiefsten erreichten Ebene. */
function keepBest(matches: SharedMatch[]): SharedMatch[] {
  const best = new Map<string, SharedMatch>()
  for (const match of matches) {
    const key = `${match.kind}::${match.lineId}`
    const current = best.get(key)
    if (!current || match.score > current.score) best.set(key, match)
  }
  return [...best.values()]
}

export function comparePair(
  me: UserRig,
  other: UserRig,
  rarityOf: (catalogItemId: string) => number,
): { score: number; matches: SharedMatch[] } {
  const found: SharedMatch[] = []

  for (const mine of me.owned) {
    for (const theirs of other.owned) {
      const depth = matchDepth(mine, theirs)
      if (depth === null) continue
      const kind: MatchKind =
        mine.kind === 'consumable' || theirs.kind === 'consumable' ? 'consumable' : 'gear'
      const catalogItemId = depth === 'line' ? mine.lineId : mine.catalogItemId
      found.push({
        kind,
        depth,
        catalogItemId,
        lineId: mine.lineId,
        score: matchScore(kind, depth, rarityOf(catalogItemId)),
      })
    }
  }

  // Der zweite Verbindungstyp: du hast, was ich suche - in beide Richtungen.
  const wishPairs: [WishEntry, OwnedEntry][] = [
    ...me.wished.flatMap((wish) => other.owned.map((own) => [wish, own] as [WishEntry, OwnedEntry])),
    ...other.wished.flatMap((wish) => me.owned.map((own) => [wish, own] as [WishEntry, OwnedEntry])),
  ]

  for (const [wish, own] of wishPairs) {
    const asOwned: OwnedEntry = { ...wish, year: null, kind: 'gear' }
    const depth = matchDepth(asOwned, own)
    if (depth === null) continue
    const catalogItemId = depth === 'line' ? wish.lineId : wish.catalogItemId
    found.push({
      kind: 'wish',
      depth,
      catalogItemId,
      lineId: wish.lineId,
      score: matchScore('wish', depth, rarityOf(catalogItemId)),
    })
  }

  const matches = keepBest(found).sort((a, b) => b.score - a.score)
  return { score: pairScore(matches), matches }
}
