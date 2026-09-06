// Einziger Ort fuer den TypeScript-Typ der Seltenheitsstufen. Die Wahrheit
// ist das Postgres-Enum `rarity_base`, angelegt in
// supabase/migrations/20260906100512_catalog.sql ("create type rarity_base
// as enum ('mass', 'common', 'special', 'rare')") - dieser Typ bildet es nur
// nach. Bei einer Abweichung gewinnt immer die Datenbank; wer das Enum
// erweitert, muss diese Zeile von Hand nachziehen.
//
// Vorher gab es diese Werte-Liste dreifach in TypeScript (scripts/data/catalog.ts,
// server/utils/catalogMatch.ts, server/utils/rarity.ts) - alle drei importieren
// jetzt von hier statt eine eigene Kopie zu pflegen.
export type RarityBase = 'mass' | 'common' | 'special' | 'rare'
