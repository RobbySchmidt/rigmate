-- Exemplar: verweist auf den Katalog und traegt die Individualitaet.
create table gear_items (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references profiles (id) on delete cascade,
  catalog_item_id uuid not null references catalog_items (id) on delete restrict,
  year            integer check (year between 1900 and 2100),
  finish          text check (char_length(finish) <= 80),
  modifications   text check (char_length(modifications) <= 500),
  photo_path      text,
  notes           text check (char_length(notes) <= 1000),
  -- Bewusst nur eine Ebene tief: Tonabnehmer in Gitarre, Cabinet an Head.
  installed_in_id uuid references gear_items (id) on delete set null,
  created_at      timestamptz not null default now()
);

create index gear_items_owner_idx on gear_items (owner_id);
create index gear_items_catalog_idx on gear_items (catalog_item_id);

-- Praeferenz: Verbrauchsmaterial besitzt man nicht als Einzelstueck.
create table preferences (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles (id) on delete cascade,
  catalog_item_id uuid not null references catalog_items (id) on delete restrict,
  created_at      timestamptz not null default now(),
  unique (user_id, catalog_item_id)
);

create index preferences_catalog_idx on preferences (catalog_item_id);

-- Wunschliste: liefert den zweiten Verbindungstyp "du hast, was ich suche".
create table wishlist_items (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles (id) on delete cascade,
  catalog_item_id uuid not null references catalog_items (id) on delete restrict,
  note            text check (char_length(note) <= 300),
  created_at      timestamptz not null default now(),
  unique (user_id, catalog_item_id)
);

create index wishlist_items_catalog_idx on wishlist_items (catalog_item_id);

-- search_path gesetzt, damit der function_search_path_mutable-Hinweis des
-- Security-Advisors nicht als Rauschen wiederkommt (Praezedenzfall: Task 2
-- und Task 7 -- touch_updated_at()).
create or replace function is_consumable_item(item_id uuid)
returns boolean
language sql
stable
set search_path = public
as $fn$
  select c.is_consumable
  from catalog_items ci
  join categories c on c.id = ci.category_id
  where ci.id = item_id;
$fn$;

create or replace function enforce_gear_item_rules()
returns trigger
language plpgsql
set search_path = public
as $fn$
declare
  target gear_items%rowtype;
begin
  if is_consumable_item(new.catalog_item_id) then
    raise exception 'consumable items belong in preferences, not in gear_items';
  end if;

  if new.installed_in_id is not null then
    if new.installed_in_id = new.id then
      raise exception 'a gear item cannot be installed in itself';
    end if;

    select * into target from gear_items where id = new.installed_in_id;

    if not found then
      raise exception 'target gear item % not found', new.installed_in_id;
    end if;

    if target.owner_id <> new.owner_id then
      raise exception 'gear can only be installed in an item of the same owner';
    end if;

    if target.installed_in_id is not null then
      raise exception 'installation is one level deep only';
    end if;
  end if;

  return new;
end;
$fn$;

create trigger gear_items_rules
before insert or update on gear_items
for each row execute function enforce_gear_item_rules();

create or replace function enforce_preference_rules()
returns trigger
language plpgsql
set search_path = public
as $fn$
begin
  if not is_consumable_item(new.catalog_item_id) then
    raise exception 'only consumable items can be a preference';
  end if;
  return new;
end;
$fn$;

create trigger preferences_rules
before insert or update on preferences
for each row execute function enforce_preference_rules();

alter table gear_items enable row level security;
alter table preferences enable row level security;
alter table wishlist_items enable row level security;

-- Abschnitt 7: Die Equipment-Liste ist fuer alle Angemeldeten sichtbar.
-- Laege sie hinter Freundschaft, muesste man befreundet sein, um das
-- Equipment zu sehen, das einen ueberhaupt erst zum Vernetzen bringt.
create policy "rigs are readable by signed-in users"
  on gear_items for select to authenticated using (true);
create policy "preferences are readable by signed-in users"
  on preferences for select to authenticated using (true);
create policy "wishlists are readable by signed-in users"
  on wishlist_items for select to authenticated using (true);

create policy "users manage their own gear"
  on gear_items for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "users manage their own preferences"
  on preferences for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "users manage their own wishlist"
  on wishlist_items for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Fotos aus dem Proberaum: nur fuer Angemeldete. Die oeffentliche Gear-Seite
-- zeigt den Katalog-Eintrag, nicht fremde Wohnzimmer.
insert into storage.buckets (id, name, public)
values ('gear-photos', 'gear-photos', false)
on conflict (id) do nothing;

create policy "gear photos are readable by signed-in users"
  on storage.objects for select to authenticated
  using (bucket_id = 'gear-photos');

create policy "users may write their own gear photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'gear-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "users may delete their own gear photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'gear-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
