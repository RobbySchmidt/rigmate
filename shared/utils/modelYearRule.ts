// Single home for the rule "a model name never contains a year" (design
// spec section 4.1): without it, "Stratocaster 1963" and "63er Strat" would
// become two catalog entries for the same guitar, and the whole point of a
// shared catalog - no duplicates - breaks.
//
// Both sides enforce the same rule from here instead of keeping their own
// copy: the client (CatalogPicker.vue) checks before it even sends a create
// request, and the server (POST /api/catalog/items) checks again because
// the client can never be trusted to be the only guard.
//
// Deliberately broader than a plain four-digit check so it also catches the
// German "63er" shorthand and the English "'63" reissue shorthand, while
// staying narrow enough to accept real catalog names that merely contain
// digits (AC30, DS-1, 4003, EXL110, TS808, ...). A four-digit run is only
// treated as a year when it forms a whole word - "1960A" (a real Marshall
// cabinet name) does not match, because "A" is directly attached.
const YEAR_IN_NAME_PATTERN = /\b(19|20)\d{2}\b|\b\d{2}er\b|['’]\d{2}\b/

export function nameContainsYear(name: string): boolean {
  return YEAR_IN_NAME_PATTERN.test(name)
}
