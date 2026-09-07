-- Zwei Nachbesserungen an set_chain_order().
--
-- (1) Das "revoke all ... from public" der beiden vorigen Migrationen war
--     wirkungslos. Supabase vergibt ueber "alter default privileges" einen
--     EXPLIZITEN Grant an anon, authenticated und service_role; ein revoke
--     gegen PUBLIC entfernt aber nur den PUBLIC-Eintrag. Auf der Instanz
--     stand entsprechend "anon=X/postgres" - anon durfte die Funktion
--     ausfuehren. Ausnutzbar war das nicht, weil der Waechter
--     "not authenticated" greift, aber eine Zeile, die Schutz behauptet und
--     keinen liefert, ist genau die Sorte Fehler, die hier teuer wird.
--     Richtiges Idiom siehe 20260906120155_profiles_fix_round_1.sql: die
--     Rollen ausdruecklich nennen, nicht nur PUBLIC.
--
-- (2) NULL als Element im Array meldete die falsche Ursache. count(distinct)
--     zaehlt NULL nicht mit, also schlug bei array[a, null] der
--     Dubletten-Waechter an und meldete "duplicate item(s)", obwohl nichts
--     doppelt war. Ohne diesen Zufallstreffer waere es wieder ein stiller
--     Fehlschlag gewesen: "id <> all (array[a, null])" ergibt NULL, das
--     erste UPDATE haette also keine Zeile getroffen.
--
-- Die Funktion wird erneut vollstaendig neu definiert, damit die Datei fuer
-- sich allein lesbar ist.
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

  -- Muss VOR dem Dubletten-Waechter stehen, sonst meldet der eine Dublette,
  -- wo in Wahrheit ein NULL-Element steckt.
  if exists (select 1 from unnest(item_ids) as t(id) where t.id is null) then
    raise exception 'item_ids must not contain null';
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

-- Muss nach dem "create or replace" stehen. anon ausdruecklich nennen: der
-- Grant an anon stammt aus Supabase' Default Privileges und ueberlebt jedes
-- revoke, das nur gegen PUBLIC laeuft.
revoke execute on function public.set_chain_order(uuid[]) from anon, authenticated, public;
grant execute on function public.set_chain_order(uuid[]) to authenticated;
