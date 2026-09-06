-- Fix round 1 fuer das Profile-Schema (siehe Review):
--   1. handle_new_user ist SECURITY DEFINER, Postgres vergibt EXECUTE auf
--      neue Funktionen per Default an PUBLIC. Kaum ausnutzbar, da eine
--      Trigger-Funktion ausserhalb des Trigger-Kontexts abbricht - aber der
--      Security-Advisor soll leer bleiben, aus demselben Grund wie beim
--      search_path-Fix: mehrere weitere Datenbank-Aufgaben laufen denselben
--      Check, eine echte fehlende RLS-Policy darf sich nicht im Rauschen
--      verstecken koennen.
--   2. handle_new_user nahm raw_user_meta_data->>'display_name' ungeprueft
--      entgegen. Ein Wert ausserhalb von 2-40 Zeichen verletzt den
--      Check-Constraint von profiles innerhalb des Triggers und reisst damit
--      den kompletten auth.users-Insert mit - Registrierung schlaegt mit
--      einem rohen Postgres-Fehler fehl. Das Formular begrenzt auf 40
--      Zeichen, laesst sich aber per direktem API-Aufruf umgehen.
--
-- Alles hier per "create or replace" bzw. gezieltem "revoke", die bereits
-- gepushte Migration 20260906115314_profiles.sql bleibt unveraendert.

-- (2) handle_new_user: eingehenden Anzeigenamen trimmen, auf 40 Zeichen
-- kappen und erneut trimmen (das Kappen kann ein Leerzeichen am Ende
-- hinterlassen). Bleiben weniger als 2 Zeichen uebrig, greift wie zuvor der
-- Ersatzname.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  candidate_name text;
begin
  candidate_name := trim(coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  candidate_name := trim(left(candidate_name, 40));

  insert into public.profiles (id, display_name)
  values (
    new.id,
    case
      when char_length(candidate_name) >= 2 then candidate_name
      else 'Rigmate ' || left(new.id::text, 8)
    end
  );
  return new;
end;
$fn$;

-- (1) Muss nach dem "create or replace" stehen: das Ersetzen der Funktion
-- setzt ihre Rechte auf den Default (EXECUTE fuer PUBLIC) zurueck.
revoke execute on function public.handle_new_user() from anon, authenticated, public;
