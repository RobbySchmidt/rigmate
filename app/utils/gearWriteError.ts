// Ordnet einen abgelehnten Schreibversuch auf gear_items/preferences/
// wishlist_items einer von zwei Kategorien zu. Der eine vorhersehbare Fall:
// jemand bietet Verbrauchsmaterial (Saiten, Plektren) als Equipment an -
// das lehnt der DB-Trigger enforce_gear_item_rules() mit einer Meldung ab,
// die "consumable" enthaelt (siehe supabase/migrations/..._rig.sql). Alles
// andere ist ein generischer Fehler, der keine eigene Erklaerung verdient.
export type GearWriteErrorKind = 'consumable' | 'generic'

export function classifyGearWriteError(error: { message?: string } | null | undefined): GearWriteErrorKind {
  if (error?.message && /consumable/i.test(error.message)) return 'consumable'
  return 'generic'
}
