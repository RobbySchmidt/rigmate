-- Zwei stille Fehlschlaege in set_chain_order() geschlossen. Beide sahen
-- aus, als sei nichts passiert - die Signatur des wiederkehrenden Fehlers
-- in diesem Projekt.
--
-- 1. item_ids = NULL tat schlicht nichts und meldete nichts: unnest(NULL)
--    liefert null Zeilen, also blieb foreign_count bei 0, und
--    "id <> all (NULL)" ergibt NULL statt true, also traf auch das erste
--    UPDATE keine einzige Zeile. Der Aufrufer bekam Erfolg zurueck und eine
--    unveraenderte Kette.
-- 2. Eine doppelt uebergebene Id erzeugte still eine Luecke: "update ...
--    from" mit zwei passenden Quellzeilen nimmt nicht-deterministisch eine
--    davon, aus [A, A, B] wurde also A auf 1 oder 2 und B auf 3 - eine
--    Kette ohne Position 2 respektive 1, ohne jede Meldung.
--
-- Die Funktion wird vollstaendig neu definiert statt nur ergaenzt, damit
-- diese Datei fuer sich allein lesbar ist.
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

  -- NULL ist ein Fehler, das leere Array ausdruecklich NICHT: wer '{}'
  -- schickt, will seine Kette leeren, und das ist ein legitimer Wunsch.
  -- Diese beiden Faelle also bitte nicht zu einem Waechter zusammenziehen.
  if item_ids is null then
    raise exception 'item_ids must not be null';
  end if;

  -- Eine Signalkette kann ein Geraet nicht zweimal enthalten - das Signal
  -- laeuft nicht zweimal durch dasselbe Pedal. Doppelte Ids sind daher ein
  -- Fehler des Aufrufers und gehoeren gemeldet, nicht heimlich gefaltet.
  if (select count(*) from unnest(item_ids))
     <> (select count(distinct id) from unnest(item_ids) as t(id)) then
    raise exception 'chain contains duplicate item(s)';
  end if;

  -- Fremde Geraete nicht stillschweigend uebergehen. RLS wuerde das Update
  -- auf sie ohnehin verhindern, aber das Ergebnis waere eine lueckenhafte
  -- Kette ohne jede Meldung.
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

-- Nach create or replace bleiben die Rechte der bestehenden Funktion
-- erhalten; hier trotzdem wiederholt, damit die Datei allein steht.
revoke all on function set_chain_order(uuid[]) from public;
grant execute on function set_chain_order(uuid[]) to authenticated;
