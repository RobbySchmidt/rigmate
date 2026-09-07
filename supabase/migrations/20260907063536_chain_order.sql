-- Die Signalkette: in welcher Reihenfolge das Signal durch die Geraete
-- einer Person laeuft. NULL heisst "nicht in der Kette".
--
-- Bewusst KEIN eindeutiger Index auf (owner_id, chain_position): er wuerde
-- jedes Umsortieren blockieren, weil der Zwischenzustand ihn verletzt --
-- A auf 2 setzen, solange B noch auf 2 steht. "deferrable" hilft nicht, das
-- geht nur bei Constraints, und ein partieller Unique-Index kann keiner
-- sein. Stattdessen haelt set_chain_order() die Positionen geschlossen.
alter table gear_items add column chain_position smallint;

-- Setzt die komplette Kette des aufrufenden Nutzers in einem Rutsch: die
-- uebergebenen Geraete bekommen Position 1..n in Array-Reihenfolge, alle
-- uebrigen Geraete desselben Nutzers fallen aus der Kette.
--
-- Warum die ganze Kette und nicht die einzelne Verschiebung: eine
-- Verschiebung beruehrt immer mehrere Zeilen. Als Folge einzelner Updates
-- waeren das je nach Kettenlaenge zwanzig Anfragen, und ein Abbruch in der
-- Mitte hinterliesse eine halb umsortierte Kette.
create or replace function set_chain_order(item_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = public
as $fn$
declare
  caller uuid := auth.uid();
  foreign_count int;
begin
  if caller is null then
    raise exception 'not authenticated';
  end if;

  -- Fremde Geraete nicht stillschweigend uebergehen. RLS wuerde das Update
  -- auf sie ohnehin verhindern, aber das Ergebnis waere eine lueckenhafte
  -- Kette ohne jede Meldung - genau die Sorte stiller Fehlschlag, die
  -- dieses Projekt schon sechsmal hatte.
  select count(*) into foreign_count
  from unnest(item_ids) as wanted(id)
  where not exists (
    select 1 from gear_items g where g.id = wanted.id and g.owner_id = caller
  );

  if foreign_count > 0 then
    raise exception 'chain contains % item(s) not owned by caller', foreign_count;
  end if;

  update gear_items
     set chain_position = null
   where owner_id = caller
     and chain_position is not null
     and id <> all (item_ids);

  update gear_items g
     set chain_position = pos.ord
    from (
      select id, ordinality::smallint as ord
        from unnest(item_ids) with ordinality as t(id, ordinality)
    ) as pos
   where g.id = pos.id
     and g.owner_id = caller;
end;
$fn$;

revoke all on function set_chain_order(uuid[]) from public;
grant execute on function set_chain_order(uuid[]) to authenticated;
