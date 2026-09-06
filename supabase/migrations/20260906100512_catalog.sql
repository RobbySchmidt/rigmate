-- Kategorien tragen bewusst kein Label: sichtbare Texte liegen in
-- app/locales/de.ts. Hier steht nur, was das Verhalten steuert.
create table categories (
  id            text primary key,
  is_consumable boolean not null default false,
  sort_order    integer not null default 0
);

-- Verbrauchsmaterial (Saiten, Plektren) hat kein Exemplar, nur eine Praeferenz.
insert into categories (id, is_consumable, sort_order) values
  ('guitar',    false,  10),
  ('bass',      false,  20),
  ('amp',       false,  30),
  ('cabinet',   false,  40),
  ('pedal',     false,  50),
  ('pickup',    false,  60),
  ('preamp',    false,  70),
  ('accessory', false,  80),
  ('strings',   true,   90),
  ('pick',      true,  100);

-- Marke als eigene Tabelle, nicht als Textspalte: eine Freitext-Marke
-- braechte genau die Dubletten zurueck, gegen die der Katalog gebaut ist.
create table brands (
  id              uuid primary key default gen_random_uuid(),
  name            text not null check (char_length(trim(name)) between 1 and 80),
  normalized_name text not null unique,
  created_at      timestamptz not null default now()
);

create type rarity_base as enum ('mass', 'common', 'special', 'rare');

create table catalog_items (
  id          uuid primary key default gen_random_uuid(),
  brand_id    uuid not null references brands (id) on delete restrict,
  category_id text not null references categories (id) on delete restrict,
  name        text not null check (char_length(trim(name)) between 1 and 120),
  parent_id   uuid references catalog_items (id) on delete restrict,
  -- Die Ebene, auf der zwei Nutzer sich mindestens treffen. Gleiche Zeile,
  -- daher als generierte Spalte erlaubt - erspart jedem Query ein coalesce.
  line_id     uuid generated always as (coalesce(parent_id, id)) stored,
  -- Sprechende URL fuer die oeffentliche Gear-Seite. Suchmaschinen sollen
  -- den Katalog finden koennen, eine UUID in der Adresse hilft dabei nicht.
  slug        text unique,
  synonyms    text[] not null default '{}',
  rarity_base rarity_base not null default 'common',
  image_path  text,
  -- Von Nutzern angelegte Eintraege starten ungeprueft.
  is_verified boolean not null default false,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (brand_id, name)
);

create index catalog_items_line_id_idx on catalog_items (line_id);
create index catalog_items_category_idx on catalog_items (category_id);

-- Ohne unaccent-Erweiterung: translate reicht fuer die paar Umlaute, die in
-- Marken- und Modellnamen vorkommen.
create or replace function slugify(input text)
returns text
language sql
immutable
as $fn$
  select trim(both '-' from regexp_replace(
    lower(translate(input, 'äöüÄÖÜß', 'aouAOUs')),
    '[^a-z0-9]+', '-', 'g'
  ));
$fn$;

create or replace function set_catalog_slug()
returns trigger
language plpgsql
as $fn$
declare
  brand_name text;
  base_slug  text;
  candidate  text;
begin
  select name into brand_name from brands where id = new.brand_id;
  base_slug := slugify(coalesce(brand_name, '') || ' ' || new.name);
  candidate := base_slug;

  -- Kollisionen sind selten, aber der Eintrag darf daran nicht scheitern.
  if exists (select 1 from catalog_items where slug = candidate and id <> new.id) then
    candidate := base_slug || '-' || left(replace(new.id::text, '-', ''), 6);
  end if;

  new.slug := candidate;
  return new;
end;
$fn$;

create trigger catalog_items_slug
before insert or update of name, brand_id on catalog_items
for each row execute function set_catalog_slug();

-- Zweistufigkeit laesst sich nicht als CHECK ausdruecken, weil sie eine
-- andere Zeile liest.
create or replace function enforce_catalog_hierarchy()
returns trigger
language plpgsql
as $fn$
declare
  parent_row catalog_items%rowtype;
begin
  if new.parent_id is null then
    return new;
  end if;

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

  return new;
end;
$fn$;

create trigger catalog_items_hierarchy
before insert or update on catalog_items
for each row execute function enforce_catalog_hierarchy();

alter table categories enable row level security;
alter table brands enable row level security;
alter table catalog_items enable row level security;

-- Der Katalog ist das Schaufenster: ohne Login lesbar, damit Gear-Seiten
-- oeffentlich und auffindbar sind (Abschnitt 10 der Spec).
create policy "categories are readable by everyone"
  on categories for select using (true);
create policy "brands are readable by everyone"
  on brands for select using (true);
create policy "catalog items are readable by everyone"
  on catalog_items for select using (true);

-- Angemeldete duerfen fehlende Eintraege anlegen - aber nur ungeprueft
-- und nur auf den eigenen Namen.
create policy "authenticated users may add brands"
  on brands for insert to authenticated with check (true);
create policy "authenticated users may add catalog items"
  on catalog_items for insert to authenticated
  with check (created_by = (select auth.uid()) and is_verified = false);

-- Kein update, kein delete: Katalogpflege laeuft ueber service_role.

insert into storage.buckets (id, name, public)
values ('catalog-images', 'catalog-images', true)
on conflict (id) do nothing;

create policy "catalog images are readable by everyone"
  on storage.objects for select
  using (bucket_id = 'catalog-images');
