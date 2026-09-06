-- Fix round 1 fuer das Katalog-Schema (siehe Review):
--   1. enforce_catalog_hierarchy pruefte beim Umhaengen nur die neue
--      Elternzeile, nicht die eigenen Kinder. Ein Umhaengen einer
--      Modell-Linie mit Ausfuehrungen unter eine andere Linie erzeugte so
--      unbemerkt eine dritte Ebene.
--   2. brands.normalized_name kam ungeprueft vom Client - die
--      Dublettenpruefung liess sich also durch einen falschen Wert einfach
--      umgehen.
--   3. Alle drei Funktionen (und die zwei neuen) bekommen ein festes
--      search_path, damit der function_search_path_mutable-Hinweis des
--      Security-Advisors verschwindet, bevor er in spaeteren Migrationen
--      als Rauschen jede echte RLS-Luecke verdeckt.
--
-- Alles hier per "create or replace", die zwei bereits gepushten
-- Migrationen bleiben unveraendert.

-- (3) slugify: unveraendertes Verhalten, nur search_path ergaenzt.
create or replace function slugify(input text)
returns text
language sql
immutable
set search_path = public
as $fn$
  select trim(both '-' from regexp_replace(
    lower(translate(replace(input, 'ß', 'ss'), 'äöüÄÖÜ', 'aouAOU')),
    '[^a-z0-9]+', '-', 'g'
  ));
$fn$;

-- (3) set_catalog_slug: unveraendertes Verhalten, nur search_path ergaenzt.
create or replace function set_catalog_slug()
returns trigger
language plpgsql
set search_path = public
as $fn$
declare
  brand_name text;
  base_slug  text;
  candidate  text;
begin
  select name into brand_name from brands where id = new.brand_id;
  base_slug := slugify(coalesce(brand_name, '') || ' ' || new.name);
  candidate := base_slug;

  if exists (select 1 from catalog_items where slug = candidate and id <> new.id) then
    candidate := base_slug || '-' || left(replace(new.id::text, '-', ''), 6);
  end if;

  new.slug := candidate;
  return new;
end;
$fn$;

-- (1) + (3): enforce_catalog_hierarchy bekommt zusaetzlich die
-- Kinder-Pruefung beim Umhaengen, plus search_path.
create or replace function enforce_catalog_hierarchy()
returns trigger
language plpgsql
set search_path = public
as $fn$
declare
  parent_row catalog_items%rowtype;
begin
  if new.parent_id is not null then
    if new.parent_id = new.id then
      raise exception 'a catalog item cannot be its own parent';
    end if;

    select * into parent_row from catalog_items where id = new.parent_id;

    if not found then
      raise exception 'parent catalog item % not found', new.parent_id;
    end if;

    if parent_row.parent_id is not null then
      raise exception 'the catalog is limited to two levels: % is already a variant', new.parent_id;
    end if;

    if parent_row.brand_id <> new.brand_id then
      raise exception 'a variant must share the brand of its model line';
    end if;

    if parent_row.category_id <> new.category_id then
      raise exception 'a variant must share the category of its model line';
    end if;

    -- Umhaengen einer Linie mit eigenen Ausfuehrungen wuerde eine dritte
    -- Ebene erzeugen: die unveraenderten Kinder zeigen weiter auf eine
    -- Zeile, die selbst gerade zur Ausfuehrung wird.
    if exists (select 1 from catalog_items where parent_id = new.id) then
      raise exception 'the catalog is limited to two levels: % already has children', new.id;
    end if;
  end if;

  return new;
end;
$fn$;

-- (2) Serverseitige Markennormalisierung: der Client darf normalized_name
-- vorschlagen, das letzte Wort hat aber immer der Server. Die Zeichenkette
-- muss exakt zu der JS-Implementierung im Seed-Skript passen, das dieselbe
-- Normalisierung fuer die Marken-Suche benutzt (Kleinschreibung, ss statt
-- ss, Diakritika auf den Grundbuchstaben, Leerzeichen statt Bindestrich).
create or replace function normalize_brand_name(input text)
returns text
language sql
immutable
set search_path = public
as $fn$
  select trim(both ' ' from regexp_replace(
    lower(translate(replace(input, 'ß', 'ss'),
                    'äöüÄÖÜáàâãåéèêëíìîïóòôõúùûüñçÁÀÂÃÅÉÈÊËÍÌÎÏÓÒÔÕÚÙÛÑÇ',
                    'aouAOUaaaaaeeeeiiiioooouuuuncAAAAAEEEEIIIIOOOOUUUNC')),
    '[^a-z0-9]+', ' ', 'g'
  ));
$fn$;

create or replace function set_brand_normalized_name()
returns trigger
language plpgsql
set search_path = public
as $fn$
begin
  new.normalized_name := normalize_brand_name(new.name);
  return new;
end;
$fn$;

create trigger brands_normalize_name
before insert or update on brands
for each row execute function set_brand_normalized_name();
