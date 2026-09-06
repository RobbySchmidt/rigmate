import { levenshtein } from './levenshtein'
import { meaningfulTokens, tokenize } from './normalize'
import type { RarityBase } from '#shared/utils/rarityBase'

export type CatalogLevel = 'line' | 'variant'

export interface CatalogEntry {
  id: string
  name: string
  slug: string
  brandName: string
  categoryId: string
  parentId: string | null
  lineId: string
  synonyms: string[]
  rarityBase: RarityBase
  isVerified: boolean
}

export interface SearchableEntry extends CatalogEntry {
  level: CatalogLevel
  /** Vorzerlegte Vergleichsziele: Name, Marke plus Name, jedes Synonym. */
  haystacks: string[][]
}

export interface CatalogMatch {
  entry: SearchableEntry
  score: number
}

export const MATCH_THRESHOLD = 0.45
export const DEFAULT_MATCH_LIMIT = 8

const RARITY_RANK: Record<RarityBase, number> = { mass: 0, common: 1, special: 2, rare: 3 }

/** Ab dieser Spanne zwischen den Ausführungen lohnt die Rückfrage. */
const PRECISION_HINT_SPREAD = 2

export function buildSearchable(entries: CatalogEntry[]): SearchableEntry[] {
  return entries.map((entry) => {
    const targets = [
      entry.name,
      `${entry.brandName} ${entry.name}`,
      ...entry.synonyms,
      ...entry.synonyms.map((synonym) => `${entry.brandName} ${synonym}`),
    ]
    return {
      ...entry,
      level: entry.parentId === null ? 'line' : 'variant',
      haystacks: targets.map((target) => tokenize(target)).filter((tokens) => tokens.length > 0),
    }
  })
}

function tokenScore(query: string, target: string): number {
  if (query === target) return 1
  // Unter drei Buchstaben ist ein Präfix kein Signal mehr: "p" ist Präfix von
  // fast jedem Wort, das mit p beginnt (auch "professional"). Kürzere
  // Suchwörter sind ohnehin Synonyme und treffen exakt.
  if (query.length >= 3 && target.startsWith(query)) return 0.85
  // Kurze Wörter nicht unscharf vergleichen: bei drei Buchstaben ist jedes
  // andere Wort einen Schritt entfernt.
  const tolerance = query.length >= 5 ? 2 : query.length >= 4 ? 1 : 0
  // Zusätzlich die Längendifferenz begrenzen: sonst frisst sich "strat" per
  // Löschungen in das kürzere, unverwandte "rat" hinein.
  if (
    tolerance > 0 &&
    Math.abs(query.length - target.length) <= 1 &&
    levenshtein(query, target) <= tolerance
  ) {
    return 0.6
  }
  return 0
}

function haystackScore(queryTokens: string[], haystack: string[]): number {
  const used = new Set<number>()
  let sum = 0

  for (const queryToken of queryTokens) {
    let best = 0
    let bestIndex = -1
    haystack.forEach((target, index) => {
      if (used.has(index)) return
      const score = tokenScore(queryToken, target)
      if (score > best) {
        best = score
        bestIndex = index
      }
    })
    // Jedes Suchwort muss irgendwo landen, sonst ist es kein Treffer.
    if (best === 0) return 0
    used.add(bestIndex)
    sum += best
  }

  const average = sum / queryTokens.length
  // Kurze, präzise Ziele gewinnen: "strat" trifft das Synonym "strat" besser
  // als den langen Namen "american professional ii stratocaster". So steht
  // die Modell-Linie oben und der Gelegenheitsnutzer ist mit einem Klick fertig.
  const coverage = Math.min(1, queryTokens.length / haystack.length)
  return average * (0.7 + 0.3 * coverage)
}

export function matchCatalog(
  query: string,
  entries: SearchableEntry[],
  options: { limit?: number; categoryId?: string } = {},
): CatalogMatch[] {
  const queryTokens = meaningfulTokens(query)
  if (queryTokens.length === 0) return []

  const candidates = options.categoryId
    ? entries.filter((entry) => entry.categoryId === options.categoryId)
    : entries

  const matches: CatalogMatch[] = []
  for (const entry of candidates) {
    let best = 0
    for (const haystack of entry.haystacks) {
      const score = haystackScore(queryTokens, haystack)
      if (score > best) best = score
    }
    if (best >= MATCH_THRESHOLD) matches.push({ entry, score: best })
  }

  matches.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    // Bei Gleichstand die gröbere Ebene zuerst - sie ist die risikolose Wahl.
    if (a.entry.level !== b.entry.level) return a.entry.level === 'line' ? -1 : 1
    if (a.entry.isVerified !== b.entry.isVerified) return a.entry.isVerified ? -1 : 1
    return a.entry.name.localeCompare(b.entry.name)
  })

  return matches.slice(0, options.limit ?? DEFAULT_MATCH_LIMIT)
}

/**
 * Der Checker fragt nur dort nach, wo die Antwort etwas ändert: wenn die
 * Seltenheit innerhalb einer Modell-Linie stark streut. Ein DS-1 ist ein DS-1.
 */
export function needsPrecisionHint(line: CatalogEntry, children: CatalogEntry[]): boolean {
  if (children.length === 0) return false
  const ranks = [line, ...children].map((entry) => RARITY_RANK[entry.rarityBase])
  return Math.max(...ranks) - Math.min(...ranks) >= PRECISION_HINT_SPREAD
}
