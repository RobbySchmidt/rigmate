// Ordnet einen fehlgeschlagenen POST /api/catalog/items einer von zwei
// Kategorien zu. catalog_items ist unique auf (brand_id, name) - der
// vorhersehbare Fall ist also ein Duplikat, das Postgres mit "duplicate key
// value violates unique constraint ..." ablehnt. Alles andere bleibt ein
// generischer Fehler.
export type CatalogCreateErrorKind = 'duplicate' | 'generic'

function extractMessage(error: unknown): string {
  if (!error || typeof error !== 'object') return ''
  const err = error as { data?: { statusMessage?: string }; statusMessage?: string; message?: string }
  return err.data?.statusMessage ?? err.statusMessage ?? err.message ?? ''
}

export function classifyCatalogCreateError(error: unknown): CatalogCreateErrorKind {
  return /duplicate/i.test(extractMessage(error)) ? 'duplicate' : 'generic'
}
