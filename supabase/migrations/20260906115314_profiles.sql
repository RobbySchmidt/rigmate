create table profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  -- Das einzige Pflichtfeld. Ein Kuenstlername genuegt vollstaendig.
  display_name text not null check (char_length(trim(display_name)) between 2 and 40),
  real_name    text check (char_length(real_name) <= 80),
  bio          text check (char_length(bio) <= 500),
  avatar_path  text,
  bands        text[] not null default '{}',
  links        jsonb  not null default '[]'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Ohne diesen Trigger gaebe es ein Rennen zwischen Registrierung und dem
-- ersten Schreibzugriff des neuen Nutzers.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      'Rigmate ' || left(new.id::text, 8)
    )
  );
  return new;
end;
$fn$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();

-- search_path gesetzt, damit der function_search_path_mutable-Hinweis des
-- Security-Advisors nicht bei jeder weiteren Migration als Rauschen
-- wiederkommt (Praezedenzfall: catalog_fixes_round_1).
create or replace function touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $fn$
begin
  new.updated_at = now();
  return new;
end;
$fn$;

create trigger profiles_touch_updated_at
before update on profiles
for each row execute function touch_updated_at();

alter table profiles enable row level security;

-- Abschnitt 10 der Spec: Profile nur mit Login.
create policy "profiles are readable by signed-in users"
  on profiles for select to authenticated using (true);

create policy "users may edit their own profile"
  on profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Kein insert: das erledigt der Trigger. Kein delete: das erledigt
-- das Loeschen des auth-Nutzers per Kaskade.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars are readable by everyone"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Jeder schreibt nur in seinen eigenen Ordner: avatars/<user-id>/...
create policy "users may write their own avatar"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "users may replace their own avatar"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "users may delete their own avatar"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
