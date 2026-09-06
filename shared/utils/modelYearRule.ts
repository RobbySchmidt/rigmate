// Einziger Ort fuer die Regel "ein Modellname enthaelt nie ein Baujahr"
// (Design-Spec Abschnitt 4.1): ohne sie wuerden "Stratocaster 1963" und
// "63er Strat" zwei Katalog-Eintraege fuer dieselbe Gitarre, und der ganze
// Sinn eines gemeinsamen Katalogs - keine Dubletten - bricht.
//
// Beide Seiten pruefen von hier aus dieselbe Regel statt ihre eigene Kopie
// zu pflegen: der Client (CatalogPicker.vue) prueft schon, bevor er eine
// Anlegen-Anfrage abschickt, und der Server (POST /api/catalog/items) prueft
// erneut, weil der Client nie die einzige Waechterin sein darf.
//
// Bewusst weiter gefasst als ein reiner Vierstellig-Check, damit auch die
// deutsche Kurzform "63er" und die englische Kurzform "'63" erfasst werden -
// aber eng genug, um echte Katalognamen mit blossen Ziffern zuzulassen
// (AC30, DS-1, 4003, EXL110, TS808, ...). Eine vierstellige Zahl zaehlt nur
// als eigenstaendiges Baujahr, wenn sie ein ganzes Wort bildet - "1960A"
// (ein echtes Marshall-Cabinet) passt nicht, weil das "A" direkt anschliesst.
const YEAR_IN_NAME_PATTERN = /\b(19|20)\d{2}\b|\b\d{2}er\b|['’]\d{2}\b/

export function nameContainsYear(name: string): boolean {
  return YEAR_IN_NAME_PATTERN.test(name)
}
