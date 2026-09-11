-- Die Saitenstaerke gehoert an den Namen (Abschnitt 7 der Spec vom
-- 11.09.2026): ein EXL140 IST 10-52, das ist Produkteigenschaft und keine
-- Besitzinformation. Die Regel "kein Baujahr im Modellnamen" bleibt
-- unberuehrt, sie zielt auf Besitzdetails.
--
-- Warum das hier steht und nicht im Seed: ensureItem() in
-- scripts/seed-catalog.ts sucht per (brand_id, name). Unter dem neuen Namen
-- faende es nichts, legte einen ZWEITEN Eintrag an und liesse den alten als
-- Waise stehen -- referenziert von fuenf Demo-Praeferenzen, und
-- catalog_items traegt ueberall on delete restrict. Ein --prune liefe damit
-- ins Messer. Ein update behaelt die id und alle Referenzen.
--
-- Nebenwirkung, bewusst in Kauf genommen: der Trigger regeneriert bei
-- Namensaenderung den slug, die drei oeffentlichen Gear-Seiten bekommen
-- also neue URLs.
update catalog_items ci
set name = v.neu
from (values
  ('EXL110',   'EXL110 (10-46)'),
  ('EXL120',   'EXL120 (9-42)'),
  ('NYXL1046', 'NYXL1046 (10-46)')
) as v (alt, neu)
join brands b on b.name = 'D''Addario'
where ci.name = v.alt and ci.brand_id = b.id;
