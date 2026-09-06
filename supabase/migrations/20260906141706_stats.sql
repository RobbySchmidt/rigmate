-- Eine Zeile je Nutzer und Katalog-Eintrag, ueber alle drei Arten hinweg.
-- security_invoker: die View umgeht RLS nicht. Wer aggregierte Zahlen ohne
-- Login braucht (die oeffentliche Gear-Seite), holt sie in einer
-- Server-Route mit service_role - dort, wo der Schluessel hingehoert.
create view user_catalog_entries with (security_invoker = on) as
  select owner_id as user_id, catalog_item_id, year, 'gear'::text as kind, created_at
    from gear_items
  union all
  select user_id, catalog_item_id, null::integer, 'consumable'::text, created_at
    from preferences
  union all
  select user_id, catalog_item_id, null::integer, 'wish'::text, created_at
    from wishlist_items;

create view catalog_item_stats with (security_invoker = on) as
  select
    ci.id      as catalog_item_id,
    ci.line_id as line_id,
    count(distinct uce.user_id) filter (where uce.kind <> 'wish') as owner_count,
    count(distinct uce.user_id) filter (where uce.kind =  'wish') as wish_count
  from catalog_items ci
  left join user_catalog_entries uce on uce.catalog_item_id = ci.id
  group by ci.id, ci.line_id;

-- Standing ruling: Supabase propagiert Rechte an neue Objekte in public
-- ueblicherweise ueber Default Privileges, das ist aber nicht garantiert.
-- Ohne dieses Grant waere der Fehlerfall ein stilles leeres Ergebnis statt
-- eines Permission-Fehlers - die schlechteste Art zu scheitern. Harmlos,
-- falls die Rechte ohnehin schon bestehen.
grant select on user_catalog_entries, catalog_item_stats to anon, authenticated;
