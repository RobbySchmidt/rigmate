-- Politur an set_chain_order(), drei Punkte.
--
-- (1) Alle fuenf Ausnahmen kamen als P0001 an und waren nur ueber den
--     englischen Meldungstext unterscheidbar. Wer daraus deutsche Texte
--     macht, haenge damit an Formulierungen, die beim naechsten Fix jemand
--     umschreibt. Jede Ausnahme bekommt daher einen eigenen, stabilen
--     SQLSTATE:
--
--       RG001  nicht angemeldet (auth.uid() ist null)
--       RG002  item_ids ist null
--       RG003  item_ids enthaelt null als Element
--       RG004  ein Geraet steht zweimal in der Kette
--       RG005  Geraet unbekannt oder nicht im Besitz des Aufrufers
--
--     Die Codes sind ab jetzt die Schnittstelle, die Texte nicht. Wer eine
--     Meldung umformuliert, darf den Code nicht mitaendern.
--
-- (2) Die Meldungen nannten kein konkretes Geraet. Bei einer Kette aus
--     fuenfzehn Geraeten ist "chain contains 2 item(s) not owned by caller"
--     eine Meldung fuer den, der sie geschrieben hat. Jetzt steht die Id
--     drin. Sie leakt nichts: der Aufrufer hat sie selbst geschickt.
--
--     Dazu die Formulierung geoeffnet. Eine schlicht nicht existierende Id
--     landete bisher ebenfalls in "not owned by caller" - eine Meldung, die
--     eine Ursache behauptet, die nicht stimmen muss. "unknown or not owned"
--     sagt, was die Pruefung wirklich weiss.
--
-- (3) Zur Rechtevergabe unten, weil sich zwei aeltere Kommentare dazu
--     widersprechen: "create or replace function" laesst den ACL einer
--     bestehenden Funktion UNVERAENDERT. Das Replace war also nie das
--     Problem. Das Problem war Supabase' "alter default privileges", das
--     beim ersten Anlegen einen expliziten Grant an anon gesetzt hat - und
--     den entfernt ein "revoke ... from public" nicht, weil es nur den
--     PUBLIC-Eintrag anfasst. Deshalb muessen die Rollen einzeln genannt
--     werden. Der Kommentar in 20260906120155_profiles_fix_round_1.sql, von
--     dem die Formulierung geerbt ist, behauptet an dieser Stelle eine
--     Rechte-Ruecksetzung durch das Replace, die es nicht gibt.
create or replace function set_chain_order(item_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = public
as $fn$
declare
  caller  uuid := auth.uid();
  dup_id  uuid;
  bad_id  uuid;
begin
  if caller is null then
    raise exception 'not authenticated' using errcode = 'RG001';
  end if;

  -- NULL ist ein Fehler, das leere Array ausdruecklich NICHT: wer '{}'
  -- schickt, will seine Kette leeren, und das ist ein legitimer Wunsch.
  -- Diese beiden Faelle also bitte nicht zu einem Waechter zusammenziehen.
  if item_ids is null then
    raise exception 'item_ids must not be null' using errcode = 'RG002';
  end if;

  -- Muss VOR dem Dubletten-Waechter stehen, sonst meldet der eine Dublette,
  -- wo in Wahrheit ein NULL-Element steckt: count(distinct) zaehlt NULL
  -- nicht mit.
  if exists (select 1 from unnest(item_ids) as t(id) where t.id is null) then
    raise exception 'item_ids must not contain null' using errcode = 'RG003';
  end if;

  -- Eine Signalkette kann ein Geraet nicht zweimal enthalten - das Signal
  -- laeuft nicht zweimal durch dasselbe Pedal. Doppelte Ids sind daher ein
  -- Fehler des Aufrufers und gehoeren gemeldet, nicht heimlich gefaltet.
  select t.id into dup_id
    from unnest(item_ids) as t(id)
   group by t.id
  having count(*) > 1
   limit 1;

  if dup_id is not null then
    raise exception 'chain contains item % twice', dup_id using errcode = 'RG004';
  end if;

  -- Fremde und unbekannte Geraete nicht stillschweigend uebergehen. RLS
  -- wuerde das Update auf sie ohnehin verhindern, aber das Ergebnis waere
  -- eine lueckenhafte Kette ohne jede Meldung.
  select wanted.id into bad_id
  from unnest(item_ids) as wanted(id)
  where not exists (
    select 1 from gear_items g where g.id = wanted.id and g.owner_id = caller
  )
  limit 1;

  if bad_id is not null then
    raise exception 'chain item % is unknown or not owned by caller', bad_id
      using errcode = 'RG005';
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

-- Drei Migrationen definieren diese Funktion inzwischen. Wer sie im
-- Dashboard oder ueber pg_proc findet, hatte bisher keinen Weg zurueck zur
-- gueltigen Definition - obj_description war leer, und der Zweck-Kommentar
-- aus der ersten Datei ist unterwegs verloren gegangen.
comment on function public.set_chain_order(uuid[]) is
  'Setzt die komplette Signalkette des Aufrufers: item_ids bekommen Position 1..n, '
  'alle uebrigen Geraete des Aufrufers fallen aus der Kette. Leeres Array leert die '
  'Kette, null ist ein Fehler. Fehlercodes RG001..RG005, Zuordnung im Kopf der '
  'Migration. Aktuelle Definition: 20260907070458_chain_order_docs.sql. Begruendung '
  'der Entwuerfe: 20260907063536_chain_order.sql (warum kein Unique-Index, warum die '
  'ganze Kette auf einmal), 20260907064102_chain_order_guards.sql (null und Dubletten), '
  '20260907065326_chain_order_grants.sql (Rechtevergabe).';

comment on column gear_items.chain_position is
  'Position im Signalweg, null = nicht in der Kette. Nur ueber set_chain_order() '
  'schreiben - die haelt die Positionen luecken- und dublettenfrei. Bewusst ohne '
  'Unique-Index, siehe 20260907063536_chain_order.sql.';

-- anon ausdruecklich nennen, siehe (3) oben. Wiederholt, damit die Datei
-- allein steht; harmlos, falls die Rechte ohnehin schon so stehen.
revoke execute on function public.set_chain_order(uuid[]) from anon, authenticated, public;
grant execute on function public.set_chain_order(uuid[]) to authenticated;
