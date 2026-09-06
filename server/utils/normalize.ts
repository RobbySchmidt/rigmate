// Füll- und Fragewörter, die in "Wer hat hier einen AC30?" stehen, aber in
// keinem Modellnamen vorkommen. Bewusst kurz gehalten: jedes Wort hier ist
// ein Wort, das nie wieder gesucht werden kann.
const FILLER_WORDS = new Set([
  // deutsch
  'wer', 'was', 'wie', 'wo', 'wen', 'hat', 'habe', 'hab', 'haben', 'hier',
  'ein', 'eine', 'einen', 'einem', 'einer', 'der', 'die', 'das', 'den', 'dem',
  'und', 'oder', 'mit', 'von', 'im', 'in', 'ich', 'du', 'suche', 'sucht',
  'spielt', 'spielst', 'spiele', 'gibt', 'es', 'gibts', 'jemand', 'noch',
  // englisch
  'who', 'what', 'has', 'have', 'a', 'an', 'the', 'is', 'are', 'any',
  'plays', 'playing', 'play', 'with', 'looking', 'for', 'anyone', 'here',
])

/**
 * Bringt beliebige Eingabe auf eine vergleichbare Form.
 * "AC30", "AC 30" und "ac-30" werden alle zu "ac 30".
 */
export function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Alles, was kein Buchstabe und keine Ziffer ist, trennt Wörter.
    .replace(/[^a-z0-9]+/g, ' ')
    // Buchstabe/Ziffer-Grenzen trennen ebenfalls, damit AC30 zu "ac 30" wird.
    .replace(/([a-z])(\d)/g, '$1 $2')
    .replace(/(\d)([a-z])/g, '$1 $2')
    .trim()
    .replace(/\s+/g, ' ')
}

export function tokenize(input: string): string[] {
  const normalized = normalize(input)
  return normalized === '' ? [] : normalized.split(' ')
}

/**
 * Wie tokenize, aber ohne Füll- und Fragewörter. Blieben nur Füllwörter
 * übrig, geben wir lieber alles zurück als nichts — sonst hätte der Nutzer
 * getippt und die Liste wäre grundlos leer.
 */
export function meaningfulTokens(input: string): string[] {
  const tokens = tokenize(input)
  const kept = tokens.filter((token) => !FILLER_WORDS.has(token))
  return kept.length > 0 ? kept : tokens
}
