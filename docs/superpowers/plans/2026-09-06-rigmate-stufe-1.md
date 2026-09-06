# Rigmate Stufe 1 — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Den Gear-Graphen beweisen — Nutzer tragen ihr Equipment über einen dublettenfreien Katalog ein und bekommen daraufhin nach Seltenheit und Trefferschärfe gewichtete Personenvorschläge mit nachvollziehbarer Begründung.

**Architecture:** Postgres bei Supabase hält Katalog, Profile und Rigs; jede Tabelle mit RLS. Der Nuxt-Client liest und schreibt einfache Daten direkt gegen Supabase, während Checker, Empfehlungen, Suche und die öffentliche Gear-Seite in Nitro-Server-Routen laufen, weil sie über alle Nutzer aggregieren. Die neuartige Logik — Normalisierung, unscharfer Katalog-Abgleich, Seltenheitsgewichtung, Paar-Scoring — steckt in reinen Funktionen ohne DB-Zugriff und ist damit vollständig unit-testbar.

**Tech Stack:** Nuxt 4 (SSR) · `@nuxtjs/supabase` · Supabase (Postgres, Auth, Storage) · Tailwind v4 · Vitest · tsx · yarn

**Spec:** [docs/superpowers/specs/2026-09-06-rigmate-design.md](../specs/2026-09-06-rigmate-design.md)

**Umfang:** Ausbaustufe 1 nach Abschnitt 13 der Spec. Feed, Posts, Kommentare, Likes, Folgen, Freundschaft, Direktnachrichten und Benachrichtigungen sind **Stufe 2** und ausdrücklich nicht Teil dieses Plans.

---

## Global Constraints

Diese Punkte gelten für **jede** Aufgabe. Sie sind Teil der Anforderungen jedes einzelnen Tasks, auch wenn sie dort nicht wiederholt werden.

- **Schema ist Code.** Jede Schemaänderung entsteht über `yarn supabase migration new <name>` und landet als Datei unter `supabase/migrations/`. Niemals von Hand im Dashboard, niemals über den Supabase-MCP — der ist `--read-only` und bleibt es.
- **RLS ist Pflicht.** Jede neue Tabelle bekommt im selben Migrationsschritt `alter table ... enable row level security` plus explizite Policies. Eine Tabelle ohne Policy ist bei Supabase offen.
- **`service_role` bleibt serverseitig.** Nur in `server/`-Code und in `scripts/`. Nie in einer `.vue`-Datei, nie in einem Composable, nie in `app/`.
- **Sprache:** Bezeichner, Tabellen, Spalten, Routen und Kommentare auf **Englisch**. Alle sichtbaren Texte auf **Deutsch**, ausschließlich über `app/locales/de.ts`. Ein deutscher String direkt im Template ist ein Fehler.
- **Katalog ist zweistufig.** Modell-Linie → Ausführung, maximal zwei Ebenen. Datenbankseitig per Trigger erzwungen.
- **Baujahr und Modifikationen gehören niemals in den Modellnamen.** Weder im Seed noch in der UI noch in Tests. Sonst entstehen „Stratocaster 1963" und „63er Strat" als zwei Einträge und die Überschneidung bricht.
- **`installed_in` ist genau eine Ebene tief** und nur innerhalb der Exemplare desselben Nutzers.
- **Anzeigename ist das einzige Pflichtfeld am Profil.** Keine Ortsdaten, kein Klarnamenzwang.
- **Sichtbarkeit:** Gear-Seiten öffentlich ohne Login. Profile, Rigs und alles Interaktive nur mit Login.
- **Nicht bauen:** Marktplatz, Ortsdaten/Karte, eigenes Audio- oder Video-Hosting. Siehe Abschnitt 2 der Spec.
- **Auth:** E-Mail/Passwort mit verpflichtender Mail-Bestätigung. Die Bestätigung wird **nicht** projektweit abgeschaltet; Testnutzer und Demo-Nutzer entstehen über die Admin-API mit `email_confirm: true`.
- **Supabase läuft gehostet** (Projekt `rigmate`, `eu-west-1`, ref `ipqrylwgdjxqmjvrarvq`). Kein lokales Docker-Supabase.
- **Tests gegen die gehostete Instanz räumen hinter sich auf.** Testnutzer tragen ausnahmslos das E-Mail-Präfix `rigmate-test-` und werden in `afterAll` gelöscht. Ein Löschvorgang ohne Präfix-Prüfung ist ein Fehler.
- **Commit nach jedem Task.** Kleine Commits, aussagekräftige Nachrichten.

---

## File Structure

### Datenbank

| Datei | Verantwortung |
|---|---|
| `supabase/migrations/*_catalog.sql` | `categories`, `brands`, `catalog_items`, Hierarchie-Trigger, RLS, Storage-Bucket `catalog-images` |
| `supabase/migrations/*_profiles.sql` | `profiles`, Trigger auf `auth.users`, RLS, Storage-Bucket `avatars` |
| `supabase/migrations/*_rig.sql` | `gear_items`, `preferences`, `wishlist_items`, Constraint-Trigger, RLS, Storage-Bucket `gear-photos` |
| `supabase/migrations/*_stats.sql` | Views `user_catalog_entries` und `catalog_item_stats` |

### Reine Logik (kein DB-Zugriff, vollständig unit-getestet)

| Datei | Verantwortung |
|---|---|
| `server/utils/normalize.ts` | Text zu vergleichbarer Form: Kleinschreibung, Diakritika, Ziffer/Buchstabe-Grenzen, Füllwörter |
| `server/utils/levenshtein.ts` | Editierdistanz für den unscharfen Abgleich |
| `server/utils/catalogMatch.ts` | Abgleich einer Eingabe gegen den Katalog-Snapshot, Ranking |
| `server/utils/rarity.ts` | Seltenheitsgewicht aus Grundwert und Messung |
| `server/utils/scoring.ts` | Treffertiefe, Einzeltreffer-Score, Paar-Score mit Kombinations-Bonus |

### Server-Routen (Aggregation über alle Nutzer)

| Datei | Verantwortung |
|---|---|
| `server/utils/catalogSnapshot.ts` | Katalog im Speicher halten, TTL, Invalidierung |
| `server/api/catalog/search.get.ts` | Checker: Auflösen während des Tippens |
| `server/api/catalog/items.post.ts` | Notausgang „Nicht dabei? Neu anlegen" |
| `server/api/recommendations.get.ts` | Personenvorschläge mit Begründung |
| `server/api/gear/[id].get.ts` | Gear-Seite: Eintrag, Ausführungen, Seltenheit, Spieler |
| `server/api/search.get.ts` | Suche über Katalog und Personen |
| `server/routes/sitemap.xml.ts` | Sitemap aller Katalog-Einträge |

### Oberfläche

| Datei | Verantwortung |
|---|---|
| `app/locales/de.ts` | **Alle** sichtbaren Texte |
| `app/composables/useText.ts` | Zugriff auf die Textschicht |
| `app/composables/useRecommendationReason.ts` | Strukturierten Begründungs-Grund zu deutschem Satz |
| `app/middleware/auth.ts` | Seitenschutz, per Seite gesetzt |
| `app/components/CatalogPicker.vue` | Autovervollständigung gegen den Checker |
| `app/components/GearItemForm.vue` | Exemplar anlegen und bearbeiten |
| `app/components/PersonSuggestion.vue` | Ein Vorschlag samt Begründung |
| `app/pages/index.vue` | Startseite: Vorschläge, bzw. erklärter Leerzustand |
| `app/pages/login.vue`, `register.vue`, `confirm.vue` | Auth |
| `app/pages/onboarding.vue` | Erster Rig-Eintrag |
| `app/pages/rig.vue` | Eigenes Rig, Präferenzen, Wunschliste |
| `app/pages/profile/[id].vue` | Profil mit Rig und Wunschliste |
| `app/pages/settings.vue` | Eigenes Profil bearbeiten |
| `app/pages/gear/[id].vue` | Öffentliche Gear-Seite |
| `app/pages/search.vue` | Suche |

### Skripte und Tests

| Datei | Verantwortung |
|---|---|
| `scripts/data/catalog.ts` | ~200 Katalog-Einträge, Handarbeit |
| `scripts/seed-catalog.ts` | Katalog einspielen, idempotent |
| `scripts/data/demoUsers.ts` | ~20 Demo-Musiker mit plausiblen Rigs |
| `scripts/seed-users.ts` | Demo-Nutzer über die Admin-API anlegen |
| `tests/setup.ts` | `.env` laden |
| `tests/helpers/testUser.ts` | Testnutzer anlegen und aufräumen |
| `tests/unit/*.test.ts` | Reine Logik |
| `tests/db/*.test.ts` | Schema, Constraints, RLS gegen die gehostete Instanz |

---

## Task 1: Fundament — Testlauf und Supabase-CLI

Ohne Testlauf gibt es keinen TDD-Zyklus, und ohne initialisierte CLI keine Migrationen. Beides gehört zusammen, weil Task 2 beides gleichzeitig braucht.

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`
- Create: `tests/helpers/supabase.ts`
- Create: `tests/db/connection.test.ts`
- Create: `supabase/config.toml` (durch `supabase init`)
- Modify: `.env.example`
- Modify: `.gitignore`
- Modify: `nuxt.config.ts`

**Interfaces:**
- Consumes: nichts
- Produces:
  - `adminClient(): SupabaseClient` aus `tests/helpers/supabase.ts` — Client mit `service_role`, umgeht RLS
  - `anonClient(): SupabaseClient` aus `tests/helpers/supabase.ts` — Client mit dem anon key, RLS greift
  - yarn-Skripte `test`, `test:watch`, `db:new`, `db:push`, `db:diff`

- [ ] **Step 1: Abhängigkeiten installieren**

```bash
yarn add @supabase/supabase-js
yarn add -D vitest dotenv tsx @types/node
```

`@supabase/supabase-js` kommt zwar als transitive Abhängigkeit von `@nuxtjs/supabase` mit, wird aber in Skripten und Tests direkt importiert — also explizit eintragen, statt sich auf einen Baum zu verlassen, der sich beim nächsten Update ändern kann.

- [ ] **Step 2: `vitest.config.ts` anlegen**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    // Integrationstests sprechen mit eu-west-1, das dauert.
    testTimeout: 30000,
    hookTimeout: 30000,
    // Testnutzer sind globaler Zustand auf einer geteilten Instanz.
    fileParallelism: false,
  },
})
```

- [ ] **Step 3: `tests/setup.ts` anlegen**

```ts
import 'dotenv/config'
```

- [ ] **Step 4: `.env.example` ergänzen**

```bash
# Supabase — aus dem Dashboard unter Project Settings > API
# SUPABASE_URL:  Project URL
# SUPABASE_KEY:  anon / public key (NICHT der service_role key)
SUPABASE_URL=
SUPABASE_KEY=

# Nur serverseitig: Seeding, Server-Routen mit Aggregation, Integrationstests.
# Umgeht RLS vollstaendig und darf nie ins Frontend-Bundle.
SUPABASE_SERVICE_ROLE_KEY=

# Datenbank-Passwort fuer `supabase db push` (Project Settings > Database)
SUPABASE_DB_PASSWORD=
```

Danach dieselben Schlüssel in der echten `.env` eintragen. **Nicht in den Chat kopieren.**

- [ ] **Step 5: `nuxt.config.ts` um den service key erweitern**

Das Modul erwartet den Service-Key standardmäßig unter `SUPABASE_SERVICE_KEY`. Wir benutzen den in CLAUDE.md festgelegten Namen und verdrahten ihn explizit:

```ts
  supabase: {
    // Standardmäßig leitet das Modul jeden Nicht-Angemeldeten auf /login um.
    // Gear-Seiten sollen laut Spec öffentlich sein, deshalb steuern wir den
    // Schutz selbst statt global umzuleiten.
    redirect: false,
    // Nur in server/ verfügbar, landet nicht im Client-Bundle.
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
```

- [ ] **Step 6: Test-Clients anlegen**

`tests/helpers/supabase.ts`:

```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} fehlt in .env — siehe .env.example`)
  }
  return value
}

/** Umgeht RLS. Nur für Aufbau und Aufräumen in Tests. */
export function adminClient(): SupabaseClient {
  return createClient(required('SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** Nicht angemeldet, RLS greift. Prüft, was ein Besucher ohne Login sieht. */
export function anonClient(): SupabaseClient {
  return createClient(required('SUPABASE_URL'), required('SUPABASE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
```

- [ ] **Step 7: Den fehlschlagenden Test schreiben**

`tests/db/connection.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { adminClient, anonClient } from '../helpers/supabase'

describe('Supabase-Verbindung', () => {
  it('erreicht die gehostete Instanz mit dem service_role key', async () => {
    const { error } = await adminClient().auth.admin.listUsers({ page: 1, perPage: 1 })
    expect(error).toBeNull()
  })

  it('erreicht die Instanz mit dem anon key', async () => {
    const { error } = await anonClient().auth.getSession()
    expect(error).toBeNull()
  })
})
```

- [ ] **Step 8: yarn-Skripte eintragen**

In `package.json` unter `scripts`:

```json
    "test": "vitest run",
    "test:watch": "vitest",
    "db:new": "supabase migration new",
    "db:push": "supabase db push",
    "db:diff": "supabase db diff --linked"
```

- [ ] **Step 9: Test laufen lassen — er muss fehlschlagen**

Run: `yarn test`
Expected: FAIL — `SUPABASE_SERVICE_ROLE_KEY fehlt in .env`, solange der Schlüssel noch nicht eingetragen ist.

- [ ] **Step 10: Schlüssel eintragen, Test muss bestehen**

Den `service_role` key aus dem Supabase-Dashboard in die lokale `.env` schreiben.

Run: `yarn test`
Expected: PASS, 2 Tests.

- [ ] **Step 11: Supabase-CLI initialisieren und verbinden**

```bash
yarn supabase init
yarn supabase link --project-ref ipqrylwgdjxqmjvrarvq
```

`link` fragt nach dem Datenbank-Passwort. `supabase init` legt `supabase/config.toml` und `supabase/migrations/` an.

- [ ] **Step 12: `.gitignore` ergänzen**

`supabase link` legt lokalen Zustand unter `supabase/.temp/` ab, der nicht ins Repo gehört:

```
# Supabase CLI - lokaler Verbindungszustand, gehoert nicht ins Repo
supabase/.temp
supabase/.branches
```

- [ ] **Step 13: Prüfen, dass die Verbindung steht**

Run: `yarn supabase migration list --linked`
Expected: Leere Liste ohne Fehler — die Verbindung steht, es gibt noch keine Migrationen.

- [ ] **Step 14: Commit**

```bash
git add package.json yarn.lock vitest.config.ts tests/ supabase/ .env.example .gitignore nuxt.config.ts
git commit -m "chore: Vitest, Supabase-CLI und Test-Clients einrichten"
```

---

## Task 2: Katalog-Schema

Das Fundament der ganzen App. Zweistufig, dublettenfrei, öffentlich lesbar.

**Files:**
- Create: `supabase/migrations/<timestamp>_catalog.sql`
- Create: `tests/db/catalog.test.ts`

**Interfaces:**
- Consumes: `adminClient()`, `anonClient()` aus Task 1
- Produces:
  - Tabelle `categories` — `id text pk` (Slug), `is_consumable boolean`, `sort_order int`
  - Tabelle `brands` — `id uuid pk`, `name text`, `normalized_name text unique`
  - Tabelle `catalog_items` — `id uuid pk`, `brand_id`, `category_id`, `name`, `parent_id`, `line_id` (generiert), `slug text unique` (per Trigger), `synonyms text[]`, `rarity_base` (Enum `mass|common|special|rare`), `image_path`, `is_verified`, `created_by`
  - `slugify(input text) returns text`
  - Storage-Bucket `catalog-images` (öffentlich lesbar)

- [ ] **Step 1: Migration anlegen**

```bash
yarn db:new catalog
```

- [ ] **Step 2: Den fehlschlagenden Test schreiben**

`tests/db/catalog.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { adminClient, anonClient } from '../helpers/supabase'

const admin = adminClient()
const anon = anonClient()

let brandId: string
let lineId: string

beforeAll(async () => {
  const { data: brand, error: brandError } = await admin
    .from('brands')
    .insert({ name: 'Testmarke', normalized_name: 'testmarke' })
    .select('id')
    .single()
  expect(brandError).toBeNull()
  brandId = brand!.id

  const { data: line, error: lineError } = await admin
    .from('catalog_items')
    .insert({
      brand_id: brandId,
      category_id: 'guitar',
      name: 'Testmodell',
      synonyms: ['testmod'],
      rarity_base: 'common',
      is_verified: true,
    })
    .select('id')
    .single()
  expect(lineError).toBeNull()
  lineId = line!.id
})

afterAll(async () => {
  await admin.from('catalog_items').delete().eq('brand_id', brandId)
  await admin.from('brands').delete().eq('id', brandId)
})

describe('Kategorien', () => {
  it('kennt genau zwei Verbrauchsmaterial-Kategorien', async () => {
    const { data } = await admin.from('categories').select('id').eq('is_consumable', true)
    expect(data!.map((c) => c.id).sort()).toEqual(['pick', 'strings'])
  })
})

describe('catalog_items Hierarchie', () => {
  it('setzt line_id bei einer Modell-Linie auf die eigene id', async () => {
    const { data } = await admin.from('catalog_items').select('line_id').eq('id', lineId).single()
    expect(data!.line_id).toBe(lineId)
  })

  it('setzt line_id einer Ausführung auf die Modell-Linie', async () => {
    const { data, error } = await admin
      .from('catalog_items')
      .insert({
        brand_id: brandId,
        category_id: 'guitar',
        name: 'Testmodell Deluxe',
        parent_id: lineId,
        rarity_base: 'special',
      })
      .select('id, line_id')
      .single()
    expect(error).toBeNull()
    expect(data!.line_id).toBe(lineId)
  })

  it('lehnt eine dritte Ebene ab', async () => {
    const { data: variant } = await admin
      .from('catalog_items')
      .insert({ brand_id: brandId, category_id: 'guitar', name: 'Ebene zwei', parent_id: lineId })
      .select('id')
      .single()

    const { error } = await admin
      .from('catalog_items')
      .insert({ brand_id: brandId, category_id: 'guitar', name: 'Ebene drei', parent_id: variant!.id })
    expect(error).not.toBeNull()
    expect(error!.message).toMatch(/two levels/i)
  })

  it('lehnt eine Ausführung mit fremder Marke ab', async () => {
    const { data: other } = await admin
      .from('brands')
      .insert({ name: 'Fremdmarke', normalized_name: 'fremdmarke' })
      .select('id')
      .single()

    const { error } = await admin
      .from('catalog_items')
      .insert({ brand_id: other!.id, category_id: 'guitar', name: 'Fremd', parent_id: lineId })
    expect(error).not.toBeNull()
    expect(error!.message).toMatch(/brand/i)

    await admin.from('brands').delete().eq('id', other!.id)
  })

  it('lehnt zwei gleichnamige Einträge derselben Marke ab', async () => {
    const { error } = await admin
      .from('catalog_items')
      .insert({ brand_id: brandId, category_id: 'guitar', name: 'Testmodell' })
    expect(error).not.toBeNull()
    expect(error!.code).toBe('23505')
  })
})

describe('Slug', () => {
  it('baut den Slug aus Marke und Modell', async () => {
    const { data } = await admin.from('catalog_items').select('slug').eq('id', lineId).single()
    expect(data!.slug).toBe('testmarke-testmodell')
  })

  it('setzt Umlaute auf Grundbuchstaben', async () => {
    const { data } = await admin
      .from('catalog_items')
      .insert({ brand_id: brandId, category_id: 'guitar', name: 'Größe Röhre' })
      .select('slug')
      .single()
    expect(data!.slug).toBe('testmarke-grosse-rohre')
  })

  it('hängt bei Kollision einen Zusatz an statt zu scheitern', async () => {
    const { data: other } = await admin
      .from('brands')
      .insert({ name: 'Testmarke Zwei', normalized_name: 'testmarke zwei' })
      .select('id')
      .single()
    // "Testmarke Zwei" + "Kollision" und "Testmarke" + "Zwei Kollision"
    // ergeben beide "testmarke-zwei-kollision".
    const { data: first } = await admin
      .from('catalog_items')
      .insert({ brand_id: other!.id, category_id: 'guitar', name: 'Kollision' })
      .select('slug')
      .single()
    const { data: second } = await admin
      .from('catalog_items')
      .insert({ brand_id: brandId, category_id: 'guitar', name: 'Zwei Kollision' })
      .select('slug')
      .single()
    expect(first!.slug).not.toBe(second!.slug)

    await admin.from('catalog_items').delete().eq('brand_id', other!.id)
    await admin.from('brands').delete().eq('id', other!.id)
  })
})

describe('Katalog-RLS', () => {
  it('ist ohne Login lesbar — die Gear-Seite ist öffentlich', async () => {
    const { data, error } = await anon.from('catalog_items').select('id, name').eq('id', lineId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('lässt ohne Login nicht schreiben', async () => {
    const { error } = await anon
      .from('catalog_items')
      .insert({ brand_id: brandId, category_id: 'guitar', name: 'Heimlich' })
    expect(error).not.toBeNull()
  })

  it('lässt ohne Login nicht löschen', async () => {
    await anon.from('catalog_items').delete().eq('id', lineId)
    const { data } = await admin.from('catalog_items').select('id').eq('id', lineId)
    expect(data).toHaveLength(1)
  })
})
```

- [ ] **Step 3: Test laufen lassen — er muss fehlschlagen**

Run: `yarn test tests/db/catalog.test.ts`
Expected: FAIL — `relation "public.brands" does not exist`.

- [ ] **Step 4: Migration schreiben**

In die frisch angelegte `supabase/migrations/<timestamp>_catalog.sql`:

```sql
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
```

- [ ] **Step 5: Migration einspielen**

```bash
yarn db:push
```

- [ ] **Step 6: Tests laufen lassen — sie müssen bestehen**

Run: `yarn test tests/db/catalog.test.ts`
Expected: PASS, 12 Tests.

- [ ] **Step 7: Sicherheits-Hinweise von Supabase prüfen**

Über den Supabase-MCP `get_advisors` mit `type: "security"` aufrufen. Es darf **kein** Hinweis auf eine Tabelle ohne RLS erscheinen. Falls doch: fehlende Policy nachtragen, als neue Migration.

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations tests/db/catalog.test.ts
git commit -m "feat(db): zweistufiges Katalog-Schema mit RLS"
```

---

## Task 3: Katalog-Seed — rund 200 Einträge

Ohne Katalog ist der Checker nicht prüfbar und die Autovervollständigung wirkt tot. Der Seed ist Handarbeit, aber genau die Handarbeit, die den Prototyp vorführbar macht.

**Files:**
- Create: `scripts/data/catalog.ts`
- Create: `scripts/seed-catalog.ts`
- Create: `tests/db/catalogSeed.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: Tabellen `brands`, `catalog_items`, `categories` aus Task 2
- Produces:
  - `export interface SeedLine { brand: string; name: string; category: string; synonyms?: string[]; rarity: RarityBase; variants?: SeedVariant[] }`
  - `export interface SeedVariant { name: string; synonyms?: string[]; rarity: RarityBase }`
  - `export const CATALOG: SeedLine[]`
  - yarn-Skript `seed:catalog`

- [ ] **Step 1: Den fehlschlagenden Test schreiben**

`tests/db/catalogSeed.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { CATALOG } from '../../scripts/data/catalog'
import { adminClient } from '../helpers/supabase'

const admin = adminClient()

describe('Katalog-Daten', () => {
  it('enthält mindestens 200 Einträge über alle Ebenen', () => {
    const total = CATALOG.reduce((sum, line) => sum + 1 + (line.variants?.length ?? 0), 0)
    expect(total).toBeGreaterThanOrEqual(200)
  })

  it('trägt kein Baujahr im Modellnamen', () => {
    // Regel aus Abschnitt 4.1: Baujahr gehört ins Exemplar, nie in den Katalog.
    const names = CATALOG.flatMap((line) => [line.name, ...(line.variants?.map((v) => v.name) ?? [])])
    const withYear = names.filter((name) => /\b(19|20)\d{2}\b|\b\d{2}er\b/.test(name))
    expect(withYear).toEqual([])
  })

  it('trägt die Marke nicht im Modellnamen', () => {
    const offenders = CATALOG.filter((line) =>
      line.name.toLowerCase().startsWith(line.brand.toLowerCase()),
    )
    expect(offenders.map((l) => `${l.brand} / ${l.name}`)).toEqual([])
  })

  it('benutzt nur bekannte Kategorien', async () => {
    const { data } = await admin.from('categories').select('id')
    const known = new Set(data!.map((c) => c.id))
    const used = new Set(CATALOG.map((l) => l.category))
    expect([...used].filter((c) => !known.has(c))).toEqual([])
  })

  it('hat je Marke eindeutige Namen', () => {
    const seen = new Set<string>()
    const duplicates: string[] = []
    for (const line of CATALOG) {
      for (const name of [line.name, ...(line.variants?.map((v) => v.name) ?? [])]) {
        const key = `${line.brand.toLowerCase()}::${name.toLowerCase()}`
        if (seen.has(key)) duplicates.push(key)
        seen.add(key)
      }
    }
    expect(duplicates).toEqual([])
  })

  it('deckt beide Verbrauchsmaterial-Kategorien ab', () => {
    const categories = new Set(CATALOG.map((l) => l.category))
    expect(categories.has('strings')).toBe(true)
    expect(categories.has('pick')).toBe(true)
  })
})

describe('Katalog nach dem Seed', () => {
  it('ist vollständig in der Datenbank', async () => {
    const expected = CATALOG.reduce((sum, line) => sum + 1 + (line.variants?.length ?? 0), 0)
    const { count } = await admin.from('catalog_items').select('id', { count: 'exact', head: true })
    expect(count).toBeGreaterThanOrEqual(expected)
  })

  it('markiert geseedete Einträge als geprüft', async () => {
    const { count } = await admin
      .from('catalog_items')
      .select('id', { count: 'exact', head: true })
      .eq('is_verified', false)
      .is('created_by', null)
    expect(count).toBe(0)
  })

  it('hat für jede Ausführung dieselbe Marke wie die Modell-Linie', async () => {
    const { data } = await admin
      .from('catalog_items')
      .select('id, brand_id, parent:parent_id (brand_id)')
      .not('parent_id', 'is', null)
    const mismatched = (data ?? []).filter(
      (row: any) => row.parent && row.parent.brand_id !== row.brand_id,
    )
    expect(mismatched).toEqual([])
  })
})
```

- [ ] **Step 2: Test laufen lassen — er muss fehlschlagen**

Run: `yarn test tests/db/catalogSeed.test.ts`
Expected: FAIL — `Cannot find module '../../scripts/data/catalog'`.

- [ ] **Step 3: Katalogdaten schreiben**

`scripts/data/catalog.ts`. Unten steht die vollständige Struktur plus so viele echte Einträge, dass das Muster eindeutig ist. **Auf ~200 Einträge über alle Ebenen auffüllen** — der Test aus Step 1 prüft das.

Faustregeln beim Auffüllen:
- Marke immer getrennt, nie im Namen. `{ brand: 'Fender', name: 'Stratocaster' }`, niemals `name: 'Fender Stratocaster'`.
- Kein Baujahr, keine Modifikation im Namen.
- Synonyme sind das, was Leute tatsächlich tippen: `strat`, `lp`, `ac30`, `ts9`, `rat`.
- `rarity`: `mass` für alles, was in jedem Proberaum steht (DS-1, Player Strat), `common` für gängig aber nicht allgegenwärtig, `special` für Boutique und ältere Reissues, `rare` für echte Raritäten. Der Wert trägt im Prototyp die gesamte Empfehlungslogik — die Messung läuft bei 20 Nutzern leer.
- Ausführungen nur dort, wo die Seltenheit innerhalb der Linie stark streut (Stratocaster: ja; Boss DS-1: nein). Das ist zugleich das Kriterium, ab wann der Checker nachfragt.

```ts
export type RarityBase = 'mass' | 'common' | 'special' | 'rare'

export interface SeedVariant {
  name: string
  synonyms?: string[]
  rarity: RarityBase
}

export interface SeedLine {
  brand: string
  name: string
  category: string
  synonyms?: string[]
  rarity: RarityBase
  variants?: SeedVariant[]
}

export const CATALOG: SeedLine[] = [
  // ---- Gitarren ----
  {
    brand: 'Fender',
    name: 'Stratocaster',
    category: 'guitar',
    synonyms: ['strat', 'stratocaster'],
    rarity: 'mass',
    variants: [
      { name: 'American Professional II Stratocaster', synonyms: ['am pro ii strat'], rarity: 'common' },
      { name: 'Player Stratocaster', synonyms: ['player strat'], rarity: 'mass' },
      { name: 'American Vintage II 1961 Stratocaster', synonyms: ['av ii strat'], rarity: 'special' },
      { name: 'Custom Shop Stratocaster', synonyms: ['cs strat'], rarity: 'rare' },
    ],
  },
  {
    brand: 'Fender',
    name: 'Telecaster',
    category: 'guitar',
    synonyms: ['tele', 'telecaster'],
    rarity: 'mass',
    variants: [
      { name: 'American Professional II Telecaster', synonyms: ['am pro ii tele'], rarity: 'common' },
      { name: 'Player Telecaster', synonyms: ['player tele'], rarity: 'mass' },
      { name: 'Custom Shop Telecaster', synonyms: ['cs tele'], rarity: 'rare' },
    ],
  },
  {
    brand: 'Fender',
    name: 'Jazzmaster',
    category: 'guitar',
    synonyms: ['jazzmaster', 'jm'],
    rarity: 'common',
    variants: [
      { name: 'American Vintage II 1966 Jazzmaster', rarity: 'special' },
      { name: 'Player Jazzmaster', rarity: 'common' },
    ],
  },
  {
    brand: 'Gibson',
    name: 'Les Paul',
    category: 'guitar',
    synonyms: ['lp', 'les paul', 'paula'],
    rarity: 'mass',
    variants: [
      { name: 'Les Paul Standard', synonyms: ['lp standard'], rarity: 'common' },
      { name: 'Les Paul Custom', synonyms: ['lp custom'], rarity: 'special' },
      { name: 'Les Paul Junior', synonyms: ['lp junior', 'lp jr'], rarity: 'special' },
    ],
  },
  {
    brand: 'Gibson',
    name: 'SG',
    category: 'guitar',
    synonyms: ['sg'],
    rarity: 'common',
    variants: [
      { name: 'SG Standard', rarity: 'common' },
      { name: 'SG Junior', rarity: 'special' },
    ],
  },
  {
    brand: 'Gibson',
    name: 'ES-335',
    category: 'guitar',
    synonyms: ['es335', '335'],
    rarity: 'common',
  },
  {
    brand: 'Squier',
    name: 'Bullet Stratocaster',
    category: 'guitar',
    synonyms: ['bullet strat', 'squier strat'],
    rarity: 'mass',
  },
  {
    brand: 'Ibanez',
    name: 'RG',
    category: 'guitar',
    synonyms: ['rg'],
    rarity: 'mass',
  },
  {
    brand: 'Gretsch',
    name: 'White Falcon',
    category: 'guitar',
    synonyms: ['white falcon'],
    rarity: 'rare',
  },

  // ---- Bässe ----
  {
    brand: 'Fender',
    name: 'Precision Bass',
    category: 'bass',
    synonyms: ['p bass', 'precision', 'pbass'],
    rarity: 'mass',
  },
  {
    brand: 'Fender',
    name: 'Jazz Bass',
    category: 'bass',
    synonyms: ['j bass', 'jazzbass', 'jbass'],
    rarity: 'mass',
  },
  {
    brand: 'Rickenbacker',
    name: '4003',
    category: 'bass',
    synonyms: ['ricky', 'rick 4003'],
    rarity: 'special',
  },

  // ---- Amps ----
  {
    brand: 'Vox',
    name: 'AC30',
    category: 'amp',
    synonyms: ['ac30', 'ac 30'],
    rarity: 'common',
    variants: [
      { name: 'AC30C2', synonyms: ['ac30c2'], rarity: 'common' },
      { name: 'AC30 Hand-Wired', synonyms: ['ac30 hw'], rarity: 'special' },
    ],
  },
  {
    brand: 'Fender',
    name: 'Deluxe Reverb',
    category: 'amp',
    synonyms: ['deluxe reverb', 'dr'],
    rarity: 'common',
    variants: [
      { name: 'Deluxe Reverb Reissue', synonyms: ['drri'], rarity: 'common' },
      { name: 'Tone Master Deluxe Reverb', synonyms: ['tone master dr'], rarity: 'common' },
    ],
  },
  {
    brand: 'Fender',
    name: 'Twin Reverb',
    category: 'amp',
    synonyms: ['twin reverb', 'twin'],
    rarity: 'common',
  },
  {
    brand: 'Marshall',
    name: 'JCM800',
    category: 'amp',
    synonyms: ['jcm 800', 'jcm800'],
    rarity: 'common',
  },
  {
    brand: 'Marshall',
    name: 'Plexi',
    category: 'amp',
    synonyms: ['plexi', 'super lead'],
    rarity: 'special',
  },
  {
    brand: 'Orange',
    name: 'Rockerverb',
    category: 'amp',
    synonyms: ['rockerverb'],
    rarity: 'special',
  },

  // ---- Cabinets ----
  {
    brand: 'Marshall',
    name: '1960A',
    category: 'cabinet',
    synonyms: ['1960a', '4x12'],
    rarity: 'common',
  },
  {
    brand: 'Orange',
    name: 'PPC212',
    category: 'cabinet',
    synonyms: ['ppc 212'],
    rarity: 'common',
  },

  // ---- Pedale ----
  {
    brand: 'Boss',
    name: 'DS-1 Distortion',
    category: 'pedal',
    synonyms: ['ds1', 'ds 1'],
    rarity: 'mass',
  },
  {
    brand: 'Ibanez',
    name: 'Tube Screamer',
    category: 'pedal',
    synonyms: ['tube screamer', 'ts'],
    rarity: 'mass',
    variants: [
      { name: 'TS9 Tube Screamer', synonyms: ['ts9'], rarity: 'mass' },
      { name: 'TS808 Tube Screamer', synonyms: ['ts808', 'ts 808'], rarity: 'common' },
      { name: 'TS808 Handwired', synonyms: ['ts808 hw'], rarity: 'rare' },
    ],
  },
  {
    brand: 'ProCo',
    name: 'RAT',
    category: 'pedal',
    synonyms: ['rat', 'rat 2'],
    rarity: 'common',
  },
  {
    brand: 'Klon',
    name: 'Centaur',
    category: 'pedal',
    synonyms: ['klon', 'centaur'],
    rarity: 'rare',
  },
  {
    brand: 'Electro-Harmonix',
    name: 'Big Muff Pi',
    category: 'pedal',
    synonyms: ['big muff', 'muff'],
    rarity: 'mass',
  },
  {
    brand: 'Strymon',
    name: 'Timeline',
    category: 'pedal',
    synonyms: ['timeline'],
    rarity: 'special',
  },

  // ---- Tonabnehmer ----
  {
    brand: 'Seymour Duncan',
    name: 'JB',
    category: 'pickup',
    synonyms: ['jb', 'sh4'],
    rarity: 'mass',
  },
  {
    brand: 'Seymour Duncan',
    name: 'Antiquity',
    category: 'pickup',
    synonyms: ['antiquity'],
    rarity: 'special',
  },
  {
    brand: 'Lollar',
    name: 'Imperial',
    category: 'pickup',
    synonyms: ['lollar imperial'],
    rarity: 'rare',
  },

  // ---- Preamps ----
  {
    brand: 'Universal Audio',
    name: 'OX Amp Top Box',
    category: 'preamp',
    synonyms: ['ox box', 'ox'],
    rarity: 'special',
  },

  // ---- Saiten (Verbrauchsmaterial) ----
  {
    brand: 'Ernie Ball',
    name: 'Regular Slinky',
    category: 'strings',
    synonyms: ['slinky', 'regular slinky', '10 46'],
    rarity: 'mass',
  },
  {
    brand: 'Ernie Ball',
    name: 'Super Slinky',
    category: 'strings',
    synonyms: ['super slinky', '9 42'],
    rarity: 'mass',
  },
  {
    brand: "D'Addario",
    name: 'EXL110',
    category: 'strings',
    synonyms: ['exl110', 'exl 110'],
    rarity: 'mass',
  },
  {
    brand: 'Thomastik-Infeld',
    name: 'Jazz Swing',
    category: 'strings',
    synonyms: ['jazz swing', 'ti flats'],
    rarity: 'special',
  },

  // ---- Plektren (Verbrauchsmaterial) ----
  {
    brand: 'Dunlop',
    name: 'Tortex',
    category: 'pick',
    synonyms: ['tortex'],
    rarity: 'mass',
  },
  {
    brand: 'Dunlop',
    name: 'Jazz III',
    category: 'pick',
    synonyms: ['jazz 3', 'jazz iii'],
    rarity: 'mass',
  },

  // ---- Zubehör ----
  {
    brand: 'Boss',
    name: 'TU-3 Tuner',
    category: 'accessory',
    synonyms: ['tu3', 'tu 3'],
    rarity: 'mass',
  },

  // TODO beim Umsetzen: auf mindestens 200 Einträge auffüllen.
  // Der Test "enthält mindestens 200 Einträge" hält diesen Task offen,
  // bis das erledigt ist.
]
```

- [ ] **Step 4: Seed-Skript schreiben**

`scripts/seed-catalog.ts`. Idempotent: zweimal laufen lassen darf nichts kaputt machen und keine Dubletten erzeugen.

```ts
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { CATALOG, type SeedLine, type SeedVariant } from './data/catalog'

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} fehlt in .env`)
  return value
}

// Muss mit server/utils/normalize.ts übereinstimmen. Der Seed läuft vor
// dem Checker, deshalb hier bewusst die schlanke Variante nur für Marken.
function normalizeBrand(name: string): string {
  return name
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

const supabase = createClient(required('SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function ensureBrand(name: string): Promise<string> {
  const normalized = normalizeBrand(name)
  const { data: existing } = await supabase
    .from('brands')
    .select('id')
    .eq('normalized_name', normalized)
    .maybeSingle()
  if (existing) return existing.id

  const { data, error } = await supabase
    .from('brands')
    .insert({ name, normalized_name: normalized })
    .select('id')
    .single()
  if (error) throw new Error(`Marke "${name}": ${error.message}`)
  return data.id
}

async function ensureItem(input: {
  brandId: string
  categoryId: string
  name: string
  parentId: string | null
  synonyms: string[]
  rarity: string
}): Promise<string> {
  const { data: existing } = await supabase
    .from('catalog_items')
    .select('id')
    .eq('brand_id', input.brandId)
    .eq('name', input.name)
    .maybeSingle()

  const payload = {
    brand_id: input.brandId,
    category_id: input.categoryId,
    name: input.name,
    parent_id: input.parentId,
    synonyms: input.synonyms,
    rarity_base: input.rarity,
    is_verified: true,
  }

  if (existing) {
    const { error } = await supabase.from('catalog_items').update(payload).eq('id', existing.id)
    if (error) throw new Error(`Eintrag "${input.name}": ${error.message}`)
    return existing.id
  }

  const { data, error } = await supabase.from('catalog_items').insert(payload).select('id').single()
  if (error) throw new Error(`Eintrag "${input.name}": ${error.message}`)
  return data.id
}

async function seedLine(line: SeedLine): Promise<number> {
  const brandId = await ensureBrand(line.brand)
  const lineId = await ensureItem({
    brandId,
    categoryId: line.category,
    name: line.name,
    parentId: null,
    synonyms: line.synonyms ?? [],
    rarity: line.rarity,
  })

  let count = 1
  for (const variant of line.variants ?? ([] as SeedVariant[])) {
    await ensureItem({
      brandId,
      categoryId: line.category,
      name: variant.name,
      parentId: lineId,
      synonyms: variant.synonyms ?? [],
      rarity: variant.rarity,
    })
    count += 1
  }
  return count
}

async function main() {
  let total = 0
  for (const line of CATALOG) {
    total += await seedLine(line)
    process.stdout.write('.')
  }
  process.stdout.write('\n')
  console.log(`${total} Katalog-Einträge eingespielt oder aktualisiert.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
```

- [ ] **Step 5: yarn-Skript eintragen**

```json
    "seed:catalog": "tsx scripts/seed-catalog.ts"
```

- [ ] **Step 6: Seed laufen lassen**

Run: `yarn seed:catalog`
Expected: Punktzeile, dann `N Katalog-Einträge eingespielt oder aktualisiert.` ohne Fehler.

- [ ] **Step 7: Zweimal laufen lassen — Idempotenz prüfen**

Run: `yarn seed:catalog && yarn seed:catalog`
Expected: Beide Läufe melden dieselbe Zahl.

- [ ] **Step 8: Tests laufen lassen — sie müssen bestehen**

Run: `yarn test tests/db/catalogSeed.test.ts`
Expected: PASS, 9 Tests.

- [ ] **Step 9: Commit**

```bash
git add scripts/ tests/db/catalogSeed.test.ts package.json
git commit -m "feat(catalog): Seed-Katalog mit rund 200 Einträgen"
```

---

## Task 4: Normalisierung

Die erste Hälfte des Checkers. Reine Funktionen, kein DB-Zugriff — und damit die Stelle, an der sich das Verhalten am billigsten festnageln lässt.

**Files:**
- Create: `server/utils/normalize.ts`
- Create: `tests/unit/normalize.test.ts`

**Interfaces:**
- Consumes: nichts
- Produces:
  - `normalize(input: string): string`
  - `tokenize(input: string): string[]`
  - `meaningfulTokens(input: string): string[]`

- [ ] **Step 1: Den fehlschlagenden Test schreiben**

`tests/unit/normalize.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { normalize, tokenize, meaningfulTokens } from '../../server/utils/normalize'

describe('normalize', () => {
  it('macht klein und wirft Satzzeichen weg', () => {
    expect(normalize('Fender Stratocaster!')).toBe('fender stratocaster')
  })

  it('behandelt Bindestriche wie Leerzeichen', () => {
    expect(normalize('DS-1')).toBe('ds 1')
  })

  it('trennt an der Grenze zwischen Buchstabe und Ziffer', () => {
    // Damit AC30 und AC 30 identisch werden - der Kern des Abgleichs.
    expect(normalize('AC30')).toBe('ac 30')
    expect(normalize('AC 30')).toBe('ac 30')
    expect(normalize('DS1')).toBe('ds 1')
  })

  it('entfernt Diakritika', () => {
    expect(normalize('Röhre')).toBe('rohre')
    expect(normalize('Größe')).toBe('grosse')
  })

  it('setzt Apostrophe in Markennamen auf Leerzeichen', () => {
    expect(normalize("D'Addario")).toBe('d addario')
  })

  it('kollabiert Mehrfach-Leerzeichen', () => {
    expect(normalize('  Les    Paul  ')).toBe('les paul')
  })

  it('liefert bei leerer Eingabe einen leeren String', () => {
    expect(normalize('   ...  ')).toBe('')
  })
})

describe('tokenize', () => {
  it('zerlegt in Wörter', () => {
    expect(tokenize('Fender AC30')).toEqual(['fender', 'ac', '30'])
  })

  it('liefert bei leerer Eingabe ein leeres Array', () => {
    expect(tokenize('')).toEqual([])
  })
})

describe('meaningfulTokens', () => {
  it('wirft deutsche Füllwörter weg', () => {
    // "AC30" und "Wer hat hier einen AC30?" sind dasselbe Problem.
    expect(meaningfulTokens('Wer hat hier einen AC30?')).toEqual(['ac', '30'])
  })

  it('wirft englische Füllwörter weg', () => {
    expect(meaningfulTokens('who has a Les Paul')).toEqual(['les', 'paul'])
  })

  it('behält alles, wenn nur Füllwörter übrig blieben', () => {
    expect(meaningfulTokens('wer hat')).toEqual(['wer', 'hat'])
  })

  it('lässt einen reinen Modellnamen unangetastet', () => {
    expect(meaningfulTokens('Deluxe Reverb')).toEqual(['deluxe', 'reverb'])
  })
})
```

- [ ] **Step 2: Test laufen lassen — er muss fehlschlagen**

Run: `yarn test tests/unit/normalize.test.ts`
Expected: FAIL — `Cannot find module '../../server/utils/normalize'`.

- [ ] **Step 3: Implementieren**

`server/utils/normalize.ts`:

```ts
// Füll- und Fragewörter, die in "Wer hat hier einen AC30?" stehen, aber in
// keinem Modellnamen vorkommen. Bewusst kurz gehalten: jedes Wort hier ist
// ein Wort, das nie wieder gesucht werden kann.
const FILLER_WORDS = new Set([
  // deutsch
  'wer', 'was', 'wie', 'wo', 'wen', 'hat', 'habe', 'hab', 'haben', 'hier',
  'ein', 'eine', 'einen', 'einem', 'einer', 'der', 'die', 'das', 'den', 'dem',
  'und', 'oder', 'mit', 'von', 'im', 'in', 'ich', 'du', 'suche', 'sucht',
  'spielt', 'spielst', 'spiele', 'gibt', 'es', 'gibts', 'jemand', 'noch',
  // englisch
  'who', 'what', 'has', 'have', 'a', 'an', 'the', 'is', 'are', 'any',
  'plays', 'playing', 'play', 'with', 'looking', 'for', 'anyone', 'here',
])

/**
 * Bringt beliebige Eingabe auf eine vergleichbare Form.
 * "AC30", "AC 30" und "ac-30" werden alle zu "ac 30".
 */
export function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    // Alles, was kein Buchstabe und keine Ziffer ist, trennt Wörter.
    .replace(/[^a-z0-9]+/g, ' ')
    // Buchstabe/Ziffer-Grenzen trennen ebenfalls, damit AC30 zu "ac 30" wird.
    .replace(/([a-z])(\d)/g, '$1 $2')
    .replace(/(\d)([a-z])/g, '$1 $2')
    .trim()
    .replace(/\s+/g, ' ')
}

export function tokenize(input: string): string[] {
  const normalized = normalize(input)
  return normalized === '' ? [] : normalized.split(' ')
}

/**
 * Wie tokenize, aber ohne Füll- und Fragewörter. Blieben nur Füllwörter
 * übrig, geben wir lieber alles zurück als nichts — sonst hätte der Nutzer
 * getippt und die Liste wäre grundlos leer.
 */
export function meaningfulTokens(input: string): string[] {
  const tokens = tokenize(input)
  const kept = tokens.filter((token) => !FILLER_WORDS.has(token))
  return kept.length > 0 ? kept : tokens
}
```

- [ ] **Step 4: Tests laufen lassen — sie müssen bestehen**

Run: `yarn test tests/unit/normalize.test.ts`
Expected: PASS, 13 Tests.

- [ ] **Step 5: Commit**

```bash
git add server/utils/normalize.ts tests/unit/normalize.test.ts
git commit -m "feat(checker): Normalisierung von Sucheingaben"
```

---

## Task 5: Unscharfer Katalog-Abgleich

Die zweite Hälfte des Checkers und das Herz des Ganzen. Weiterhin reine Funktionen: der Katalog kommt als Argument herein, nicht aus der Datenbank.

**Files:**
- Create: `server/utils/levenshtein.ts`
- Create: `server/utils/catalogMatch.ts`
- Create: `tests/unit/levenshtein.test.ts`
- Create: `tests/unit/catalogMatch.test.ts`

**Interfaces:**
- Consumes: `normalize`, `meaningfulTokens`, `tokenize` aus Task 4
- Produces:
  - `levenshtein(a: string, b: string): number`
  - `export type CatalogLevel = 'line' | 'variant'`
  - `export interface CatalogEntry { id: string; name: string; slug: string; brandName: string; categoryId: string; parentId: string | null; lineId: string; synonyms: string[]; rarityBase: RarityBase; isVerified: boolean }`
  - `export interface SearchableEntry extends CatalogEntry { level: CatalogLevel; haystacks: string[][] }`
  - `buildSearchable(entries: CatalogEntry[]): SearchableEntry[]`
  - `matchCatalog(query: string, entries: SearchableEntry[], options?: { limit?: number; categoryId?: string }): CatalogMatch[]`
  - `export interface CatalogMatch { entry: SearchableEntry; score: number }`
  - `needsPrecisionHint(line: CatalogEntry, children: CatalogEntry[]): boolean`
  - `MATCH_THRESHOLD`, `DEFAULT_MATCH_LIMIT`

- [ ] **Step 1: Den fehlschlagenden Test für levenshtein schreiben**

`tests/unit/levenshtein.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { levenshtein } from '../../server/utils/levenshtein'

describe('levenshtein', () => {
  it('ist null bei gleichen Wörtern', () => {
    expect(levenshtein('strat', 'strat')).toBe(0)
  })

  it('zählt einen Tippfehler als eins', () => {
    expect(levenshtein('strat', 'strap')).toBe(1)
    expect(levenshtein('telecaster', 'telecster')).toBe(1)
  })

  it('zählt Vertauschung als zwei', () => {
    expect(levenshtein('ac', 'ca')).toBe(2)
  })

  it('behandelt leere Strings', () => {
    expect(levenshtein('', 'rat')).toBe(3)
    expect(levenshtein('rat', '')).toBe(3)
    expect(levenshtein('', '')).toBe(0)
  })
})
```

- [ ] **Step 2: Test laufen lassen — er muss fehlschlagen**

Run: `yarn test tests/unit/levenshtein.test.ts`
Expected: FAIL — Modul nicht gefunden.

- [ ] **Step 3: levenshtein implementieren**

`server/utils/levenshtein.ts`:

```ts
/** Editierdistanz, zwei Zeilen statt voller Matrix. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i)
  let current = new Array<number>(b.length + 1)

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i
    for (let j = 1; j <= b.length; j += 1) {
      const substitution = previous[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1)
      current[j] = Math.min(current[j - 1]! + 1, previous[j]! + 1, substitution)
    }
    const swap = previous
    previous = current
    current = swap
  }

  return previous[b.length]!
}
```

- [ ] **Step 4: Test laufen lassen — er muss bestehen**

Run: `yarn test tests/unit/levenshtein.test.ts`
Expected: PASS, 4 Tests.

- [ ] **Step 5: Den fehlschlagenden Test für den Abgleich schreiben**

`tests/unit/catalogMatch.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  buildSearchable,
  matchCatalog,
  needsPrecisionHint,
  type CatalogEntry,
} from '../../server/utils/catalogMatch'

function entry(partial: Partial<CatalogEntry> & { id: string; name: string }): CatalogEntry {
  return {
    slug: `fender-${partial.id}`,
    brandName: 'Fender',
    categoryId: 'guitar',
    parentId: null,
    lineId: partial.id,
    synonyms: [],
    rarityBase: 'common',
    isVerified: true,
    ...partial,
  }
}

const STRAT = entry({ id: 'strat', name: 'Stratocaster', synonyms: ['strat'], rarityBase: 'mass' })
const AM_PRO = entry({
  id: 'ampro',
  name: 'American Professional II Stratocaster',
  parentId: 'strat',
  lineId: 'strat',
  synonyms: ['am pro ii strat'],
  rarityBase: 'common',
})
const CS_STRAT = entry({
  id: 'cs',
  name: 'Custom Shop Stratocaster',
  parentId: 'strat',
  lineId: 'strat',
  rarityBase: 'rare',
})
const AC30 = entry({
  id: 'ac30',
  name: 'AC30',
  brandName: 'Vox',
  categoryId: 'amp',
  synonyms: ['ac30', 'ac 30'],
})
const DS1 = entry({
  id: 'ds1',
  name: 'DS-1 Distortion',
  brandName: 'Boss',
  categoryId: 'pedal',
  synonyms: ['ds1'],
  rarityBase: 'mass',
})
const SLINKY = entry({
  id: 'slinky',
  name: 'Regular Slinky',
  brandName: 'Ernie Ball',
  categoryId: 'strings',
  synonyms: ['slinky'],
  rarityBase: 'mass',
})

const CATALOG = buildSearchable([STRAT, AM_PRO, CS_STRAT, AC30, DS1, SLINKY])

function ids(query: string, options?: Parameters<typeof matchCatalog>[2]) {
  return matchCatalog(query, CATALOG, options).map((m) => m.entry.id)
}

describe('buildSearchable', () => {
  it('markiert Einträge ohne Elternteil als Modell-Linie', () => {
    expect(CATALOG.find((e) => e.id === 'strat')!.level).toBe('line')
  })

  it('markiert Einträge mit Elternteil als Ausführung', () => {
    expect(CATALOG.find((e) => e.id === 'ampro')!.level).toBe('variant')
  })
})

describe('matchCatalog', () => {
  it('findet über ein Synonym', () => {
    expect(ids('strat')).toContain('strat')
  })

  it('stellt die Modell-Linie an die erste Stelle', () => {
    // Der Gelegenheitsnutzer klickt oben und ist fertig.
    expect(ids('strat')[0]).toBe('strat')
  })

  it('zeigt beide Katalogebenen nebeneinander', () => {
    const result = ids('strat')
    expect(result).toContain('strat')
    expect(result).toContain('ampro')
    expect(result).toContain('cs')
  })

  it('behandelt AC30 und AC 30 gleich', () => {
    expect(ids('AC30')[0]).toBe('ac30')
    expect(ids('AC 30')[0]).toBe('ac30')
    expect(ids('ac-30')[0]).toBe('ac30')
  })

  it('verarbeitet eine ganze Frage wie ein Stichwort', () => {
    // Suche und Eintragen sind dasselbe Problem, Abschnitt 5 der Spec.
    expect(ids('Wer hat hier einen AC30?')[0]).toBe('ac30')
  })

  it('verzeiht einen Tippfehler', () => {
    expect(ids('telecster')).toEqual([])
    expect(ids('stratocster')).toContain('strat')
  })

  it('findet über die Marke', () => {
    expect(ids('boss ds1')).toContain('ds1')
  })

  it('liefert nichts bei leerer Eingabe', () => {
    expect(ids('')).toEqual([])
    expect(ids('   ')).toEqual([])
  })

  it('liefert nichts, wenn ein Suchwort gar nicht trifft', () => {
    expect(ids('strat gurkensalat')).toEqual([])
  })

  it('filtert auf eine Kategorie, wenn verlangt', () => {
    expect(ids('slinky', { categoryId: 'strings' })).toEqual(['slinky'])
    expect(ids('slinky', { categoryId: 'pedal' })).toEqual([])
  })

  it('hält sich an das Limit', () => {
    expect(ids('strat', { limit: 2 })).toHaveLength(2)
  })
})

describe('needsPrecisionHint', () => {
  it('fragt nach, wenn die Seltenheit zwischen Ausführungen stark streut', () => {
    // Fender Stratocaster: zwischen den Ausführungen liegen Welten.
    expect(needsPrecisionHint(STRAT, [AM_PRO, CS_STRAT])).toBe(true)
  })

  it('fragt nicht nach, wenn es keine Ausführungen gibt', () => {
    // Ein DS-1 ist ein DS-1.
    expect(needsPrecisionHint(DS1, [])).toBe(false)
  })

  it('fragt nicht nach, wenn die Ausführungen ähnlich selten sind', () => {
    const a = entry({ id: 'a', name: 'AC30C2', parentId: 'ac30', lineId: 'ac30', rarityBase: 'common' })
    const b = entry({ id: 'b', name: 'AC30 Hand-Wired', parentId: 'ac30', lineId: 'ac30', rarityBase: 'special' })
    expect(needsPrecisionHint(AC30, [a, b])).toBe(false)
  })
})
```

- [ ] **Step 6: Test laufen lassen — er muss fehlschlagen**

Run: `yarn test tests/unit/catalogMatch.test.ts`
Expected: FAIL — Modul nicht gefunden.

- [ ] **Step 7: Den Abgleich implementieren**

`server/utils/catalogMatch.ts`:

```ts
import { levenshtein } from './levenshtein'
import { meaningfulTokens, tokenize } from './normalize'

export type RarityBase = 'mass' | 'common' | 'special' | 'rare'
export type CatalogLevel = 'line' | 'variant'

export interface CatalogEntry {
  id: string
  name: string
  slug: string
  brandName: string
  categoryId: string
  parentId: string | null
  lineId: string
  synonyms: string[]
  rarityBase: RarityBase
  isVerified: boolean
}

export interface SearchableEntry extends CatalogEntry {
  level: CatalogLevel
  /** Vorzerlegte Vergleichsziele: Name, Marke plus Name, jedes Synonym. */
  haystacks: string[][]
}

export interface CatalogMatch {
  entry: SearchableEntry
  score: number
}

export const MATCH_THRESHOLD = 0.45
export const DEFAULT_MATCH_LIMIT = 8

const RARITY_RANK: Record<RarityBase, number> = { mass: 0, common: 1, special: 2, rare: 3 }

/** Ab dieser Spanne zwischen den Ausführungen lohnt die Rückfrage. */
const PRECISION_HINT_SPREAD = 2

export function buildSearchable(entries: CatalogEntry[]): SearchableEntry[] {
  return entries.map((entry) => {
    const targets = [
      entry.name,
      `${entry.brandName} ${entry.name}`,
      ...entry.synonyms,
      ...entry.synonyms.map((synonym) => `${entry.brandName} ${synonym}`),
    ]
    return {
      ...entry,
      level: entry.parentId === null ? 'line' : 'variant',
      haystacks: targets.map((target) => tokenize(target)).filter((tokens) => tokens.length > 0),
    }
  })
}

function tokenScore(query: string, target: string): number {
  if (query === target) return 1
  if (target.startsWith(query)) return 0.85
  // Kurze Wörter nicht unscharf vergleichen: bei drei Buchstaben ist jedes
  // andere Wort einen Schritt entfernt.
  const tolerance = query.length >= 5 ? 2 : query.length >= 4 ? 1 : 0
  if (tolerance > 0 && levenshtein(query, target) <= tolerance) return 0.6
  return 0
}

function haystackScore(queryTokens: string[], haystack: string[]): number {
  const used = new Set<number>()
  let sum = 0

  for (const queryToken of queryTokens) {
    let best = 0
    let bestIndex = -1
    haystack.forEach((target, index) => {
      if (used.has(index)) return
      const score = tokenScore(queryToken, target)
      if (score > best) {
        best = score
        bestIndex = index
      }
    })
    // Jedes Suchwort muss irgendwo landen, sonst ist es kein Treffer.
    if (best === 0) return 0
    used.add(bestIndex)
    sum += best
  }

  const average = sum / queryTokens.length
  // Kurze, präzise Ziele gewinnen: "strat" trifft das Synonym "strat" besser
  // als den langen Namen "american professional ii stratocaster". So steht
  // die Modell-Linie oben und der Gelegenheitsnutzer ist mit einem Klick fertig.
  const coverage = Math.min(1, queryTokens.length / haystack.length)
  return average * (0.7 + 0.3 * coverage)
}

export function matchCatalog(
  query: string,
  entries: SearchableEntry[],
  options: { limit?: number; categoryId?: string } = {},
): CatalogMatch[] {
  const queryTokens = meaningfulTokens(query)
  if (queryTokens.length === 0) return []

  const candidates = options.categoryId
    ? entries.filter((entry) => entry.categoryId === options.categoryId)
    : entries

  const matches: CatalogMatch[] = []
  for (const entry of candidates) {
    let best = 0
    for (const haystack of entry.haystacks) {
      const score = haystackScore(queryTokens, haystack)
      if (score > best) best = score
    }
    if (best >= MATCH_THRESHOLD) matches.push({ entry, score: best })
  }

  matches.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    // Bei Gleichstand die gröbere Ebene zuerst - sie ist die risikolose Wahl.
    if (a.entry.level !== b.entry.level) return a.entry.level === 'line' ? -1 : 1
    if (a.entry.isVerified !== b.entry.isVerified) return a.entry.isVerified ? -1 : 1
    return a.entry.name.localeCompare(b.entry.name)
  })

  return matches.slice(0, options.limit ?? DEFAULT_MATCH_LIMIT)
}

/**
 * Der Checker fragt nur dort nach, wo die Antwort etwas ändert: wenn die
 * Seltenheit innerhalb einer Modell-Linie stark streut. Ein DS-1 ist ein DS-1.
 */
export function needsPrecisionHint(line: CatalogEntry, children: CatalogEntry[]): boolean {
  if (children.length === 0) return false
  const ranks = [line, ...children].map((entry) => RARITY_RANK[entry.rarityBase])
  return Math.max(...ranks) - Math.min(...ranks) >= PRECISION_HINT_SPREAD
}
```

- [ ] **Step 8: Tests laufen lassen — sie müssen bestehen**

Run: `yarn test tests/unit/catalogMatch.test.ts`
Expected: PASS, 16 Tests.

- [ ] **Step 9: Commit**

```bash
git add server/utils/levenshtein.ts server/utils/catalogMatch.ts tests/unit/
git commit -m "feat(checker): unscharfer Katalog-Abgleich mit Rückfrage-Regel"
```

---

## Task 6: Checker als Server-Route

Jetzt bekommt die reine Logik den echten Katalog. Der Snapshot liegt im Nitro-Speicher, damit die Autovervollständigung ohne DB-Roundtrip pro Tastendruck auskommt.

**Files:**
- Create: `server/utils/catalogSnapshot.ts`
- Create: `server/api/catalog/search.get.ts`
- Create: `server/api/catalog/items.post.ts`
- Create: `tests/api/catalogSearch.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `buildSearchable`, `matchCatalog`, `needsPrecisionHint`, `CatalogEntry` aus Task 5; Tabellen aus Task 2
- Produces:
  - `getCatalogSnapshot(event: H3Event): Promise<SearchableEntry[]>`
  - `invalidateCatalogSnapshot(): void`
  - `GET /api/catalog/search?q=&category=&limit=` → `{ query: string; results: CatalogSearchResult[] }`
  - `export interface CatalogSearchResult { id, name, slug, brandName, categoryId, level, lineId, lineName, rarityBase, isVerified, needsPrecisionHint }`
  - `POST /api/catalog/items` mit `{ brand: string; name: string; categoryId: string; parentId?: string | null }` → `{ id: string }`

- [ ] **Step 1: Den fehlschlagenden Test schreiben**

Dieser Test spricht mit einem laufenden Dev-Server. `tests/api/catalogSearch.test.ts`:

```ts
import { describe, it, expect, beforeAll } from 'vitest'

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3000'

async function search(query: string, extra = ''): Promise<any> {
  const response = await fetch(`${BASE}/api/catalog/search?q=${encodeURIComponent(query)}${extra}`)
  expect(response.ok).toBe(true)
  return response.json()
}

beforeAll(async () => {
  try {
    await fetch(`${BASE}/api/catalog/search?q=strat`)
  } catch {
    throw new Error(`Kein Dev-Server unter ${BASE}. Vorher "yarn dev" starten.`)
  }
})

describe('GET /api/catalog/search', () => {
  it('findet die Stratocaster über das Synonym', async () => {
    const body = await search('strat')
    expect(body.results.length).toBeGreaterThan(0)
    expect(body.results[0].name).toBe('Stratocaster')
    expect(body.results[0].brandName).toBe('Fender')
    expect(body.results[0].level).toBe('line')
  })

  it('liefert Ausführungen neben der Modell-Linie', async () => {
    const body = await search('strat')
    expect(body.results.some((r: any) => r.level === 'variant')).toBe(true)
  })

  it('markiert die Stratocaster als rückfragewürdig', async () => {
    const body = await search('strat')
    const line = body.results.find((r: any) => r.level === 'line')
    expect(line.needsPrecisionHint).toBe(true)
  })

  it('markiert den DS-1 nicht als rückfragewürdig', async () => {
    const body = await search('ds1')
    expect(body.results[0].needsPrecisionHint).toBe(false)
  })

  it('verarbeitet eine ganze Frage', async () => {
    const body = await search('Wer hat hier einen AC30?')
    expect(body.results[0].name).toBe('AC30')
  })

  it('filtert auf eine Kategorie', async () => {
    const body = await search('slinky', '&category=strings')
    expect(body.results.every((r: any) => r.categoryId === 'strings')).toBe(true)
  })

  it('liefert bei leerer Eingabe ein leeres Ergebnis statt eines Fehlers', async () => {
    const body = await search('')
    expect(body.results).toEqual([])
  })

  it('nennt zu einer Ausführung den Namen ihrer Modell-Linie', async () => {
    const body = await search('strat')
    const variant = body.results.find((r: any) => r.level === 'variant')
    expect(variant.lineName).toBe('Stratocaster')
  })
})
```

- [ ] **Step 2: yarn-Skript für API-Tests eintragen**

Die API-Tests brauchen einen laufenden Server, die anderen nicht. Deshalb getrennt:

```json
    "test": "vitest run --exclude tests/api/**",
    "test:api": "vitest run tests/api"
```

- [ ] **Step 3: Test laufen lassen — er muss fehlschlagen**

```bash
yarn dev   # in einem zweiten Terminal
yarn test:api
```
Expected: FAIL — 404 auf `/api/catalog/search`.

- [ ] **Step 4: Snapshot implementieren**

`server/utils/catalogSnapshot.ts`:

```ts
import type { H3Event } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import { buildSearchable, type CatalogEntry, type SearchableEntry } from './catalogMatch'

// Bei rund 200 Einträgen kostet der ganze Katalog nichts und erspart der
// Autovervollständigung einen DB-Roundtrip pro Tastendruck. Ab einigen
// tausend Einträgen gehört das in einen Trigram-Index in Postgres.
const TTL_MS = 60_000

let cache: { entries: SearchableEntry[]; loadedAt: number } | null = null

export function invalidateCatalogSnapshot(): void {
  cache = null
}

export async function getCatalogSnapshot(event: H3Event): Promise<SearchableEntry[]> {
  if (cache && Date.now() - cache.loadedAt < TTL_MS) return cache.entries

  const client = serverSupabaseServiceRole(event)
  const { data, error } = await client
    .from('catalog_items')
    .select('id, name, slug, category_id, parent_id, line_id, synonyms, rarity_base, is_verified, brands ( name )')

  if (error) {
    throw createError({ statusCode: 502, statusMessage: `Katalog nicht ladbar: ${error.message}` })
  }

  const entries: CatalogEntry[] = (data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    brandName: row.brands?.name ?? '',
    categoryId: row.category_id,
    parentId: row.parent_id,
    lineId: row.line_id,
    synonyms: row.synonyms ?? [],
    rarityBase: row.rarity_base,
    isVerified: row.is_verified,
  }))

  cache = { entries: buildSearchable(entries), loadedAt: Date.now() }
  return cache.entries
}
```

- [ ] **Step 5: Such-Route implementieren**

`server/api/catalog/search.get.ts`:

```ts
import { matchCatalog, needsPrecisionHint, type SearchableEntry } from '../../utils/catalogMatch'
import { getCatalogSnapshot } from '../../utils/catalogSnapshot'

export interface CatalogSearchResult {
  id: string
  name: string
  slug: string
  brandName: string
  categoryId: string
  level: 'line' | 'variant'
  lineId: string
  lineName: string
  rarityBase: string
  isVerified: boolean
  needsPrecisionHint: boolean
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const term = typeof query.q === 'string' ? query.q : ''
  const categoryId = typeof query.category === 'string' ? query.category : undefined
  const limit = Math.min(20, Math.max(1, Number(query.limit) || 8))

  const snapshot = await getCatalogSnapshot(event)
  const matches = matchCatalog(term, snapshot, { limit, categoryId })

  const byId = new Map<string, SearchableEntry>(snapshot.map((entry) => [entry.id, entry]))
  const childrenByLine = new Map<string, SearchableEntry[]>()
  for (const entry of snapshot) {
    if (entry.level !== 'variant') continue
    const siblings = childrenByLine.get(entry.lineId) ?? []
    siblings.push(entry)
    childrenByLine.set(entry.lineId, siblings)
  }

  const results: CatalogSearchResult[] = matches.map(({ entry }) => {
    const line = byId.get(entry.lineId)
    return {
      id: entry.id,
      name: entry.name,
      slug: entry.slug,
      brandName: entry.brandName,
      categoryId: entry.categoryId,
      level: entry.level,
      lineId: entry.lineId,
      lineName: line?.name ?? entry.name,
      rarityBase: entry.rarityBase,
      isVerified: entry.isVerified,
      // Nur bei der Modell-Linie sinnvoll: wer schon die Ausführung gewählt
      // hat, ist genau genug.
      needsPrecisionHint:
        entry.level === 'line' && line
          ? needsPrecisionHint(line, childrenByLine.get(entry.id) ?? [])
          : false,
    }
  })

  return { query: term, results }
})
```

- [ ] **Step 6: Notausgang „Neu anlegen" implementieren**

`server/api/catalog/items.post.ts`. Läuft bewusst über den **Nutzer-Client**, nicht über `service_role` — so erzwingt die RLS-Policy aus Task 2, dass der Eintrag ungeprüft und auf den eigenen Namen entsteht.

```ts
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { normalize } from '../../utils/normalize'
import { invalidateCatalogSnapshot } from '../../utils/catalogSnapshot'

interface Body {
  brand?: string
  name?: string
  categoryId?: string
  parentId?: string | null
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Nicht angemeldet' })

  const body = await readBody<Body>(event)
  const brand = body.brand?.trim()
  const name = body.name?.trim()
  const categoryId = body.categoryId?.trim()

  if (!brand || !name || !categoryId) {
    throw createError({ statusCode: 400, statusMessage: 'brand, name und categoryId sind Pflicht' })
  }
  // Regel aus Abschnitt 4.1: Baujahr gehört ins Exemplar, nie in den Katalog.
  if (/\b(19|20)\d{2}\b/.test(name)) {
    throw createError({ statusCode: 400, statusMessage: 'Baujahr gehört nicht in den Modellnamen' })
  }

  const client = await serverSupabaseClient(event)
  const normalizedBrand = normalize(brand)

  const { data: existingBrand } = await client
    .from('brands')
    .select('id')
    .eq('normalized_name', normalizedBrand)
    .maybeSingle()

  let brandId = existingBrand?.id
  if (!brandId) {
    const { data, error } = await client
      .from('brands')
      .insert({ name: brand, normalized_name: normalizedBrand })
      .select('id')
      .single()
    if (error) throw createError({ statusCode: 400, statusMessage: error.message })
    brandId = data.id
  }

  const { data, error } = await client
    .from('catalog_items')
    .insert({
      brand_id: brandId,
      category_id: categoryId,
      name,
      parent_id: body.parentId ?? null,
      created_by: user.id,
      is_verified: false,
    })
    .select('id')
    .single()

  if (error) throw createError({ statusCode: 400, statusMessage: error.message })

  invalidateCatalogSnapshot()
  return { id: data.id }
})
```

- [ ] **Step 7: Tests laufen lassen — sie müssen bestehen**

```bash
yarn dev   # zweites Terminal
yarn test:api
```
Expected: PASS, 8 Tests.

- [ ] **Step 8: Prüfen, dass der service key nicht im Client-Bundle landet**

```bash
yarn build
grep -r "service_role" .output/public/ && echo "GEFUNDEN - Abbruch" || echo "sauber"
```
Expected: `sauber`. Findet `grep` etwas, ist irgendwo ein Serverimport in den Client gerutscht — das ist ein Abbruchgrund, kein Schönheitsfehler.

- [ ] **Step 9: Commit**

```bash
git add server/ tests/api/ package.json
git commit -m "feat(checker): Such-Route mit Katalog-Snapshot und Notausgang"
```

---

## Task 7: Profile

Ein Pflichtfeld, sonst nichts. Und der Trigger, der beim Registrieren automatisch ein Profil anlegt — ohne den gäbe es ein Rennen zwischen Registrierung und erstem Schreibzugriff.

**Files:**
- Create: `supabase/migrations/<timestamp>_profiles.sql`
- Create: `tests/helpers/testUser.ts`
- Create: `tests/db/profiles.test.ts`

**Interfaces:**
- Consumes: `adminClient()`, `anonClient()` aus Task 1
- Produces:
  - Tabelle `profiles` — `id uuid pk → auth.users`, `display_name` (Pflicht), `real_name`, `bio`, `avatar_path`, `bands text[]`, `links jsonb`
  - Trigger `on_auth_user_created`
  - Storage-Bucket `avatars` (öffentlich lesbar, schreibbar nur im eigenen Ordner)
  - `createTestUser(displayName?): Promise<TestUser>` mit `{ id, email, client }`
  - `deleteTestUsers(): Promise<void>`

- [ ] **Step 1: Test-Helfer schreiben**

`tests/helpers/testUser.ts`. Die Präfix-Prüfung beim Löschen ist kein Schmuck: die Instanz ist gehostet und wird später echte Demo-Nutzer enthalten.

```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { adminClient } from './supabase'

const TEST_EMAIL_PREFIX = 'rigmate-test-'
const TEST_EMAIL_DOMAIN = '@example.invalid'
const TEST_PASSWORD = 'rigmate-test-passwort-2026'

export interface TestUser {
  id: string
  email: string
  /** Angemeldet als dieser Nutzer. RLS greift. */
  client: SupabaseClient
}

export async function createTestUser(displayName = 'Testnutzer'): Promise<TestUser> {
  const admin = adminClient()
  const email = `${TEST_EMAIL_PREFIX}${crypto.randomUUID()}${TEST_EMAIL_DOMAIN}`

  // email_confirm: true statt die Bestätigung projektweit abzuschalten -
  // die Pflicht zur Mail-Bestätigung bleibt für echte Registrierungen stehen.
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  })
  if (error) throw new Error(`Testnutzer anlegen: ${error.message}`)

  const client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { error: signInError } = await client.auth.signInWithPassword({ email, password: TEST_PASSWORD })
  if (signInError) throw new Error(`Testnutzer anmelden: ${signInError.message}`)

  return { id: data.user!.id, email, client }
}

/** Löscht ausschließlich Nutzer mit dem Testpräfix. */
export async function deleteTestUsers(): Promise<void> {
  const admin = adminClient()
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) throw new Error(`Testnutzer auflisten: ${error.message}`)

  for (const user of data.users) {
    if (!user.email?.startsWith(TEST_EMAIL_PREFIX)) continue
    await admin.auth.admin.deleteUser(user.id)
  }
}
```

- [ ] **Step 2: Den fehlschlagenden Test schreiben**

`tests/db/profiles.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { adminClient, anonClient } from '../helpers/supabase'
import { createTestUser, deleteTestUsers, type TestUser } from '../helpers/testUser'

const admin = adminClient()
const anon = anonClient()

let alice: TestUser
let bob: TestUser

beforeAll(async () => {
  alice = await createTestUser('Alice Ampeg')
  bob = await createTestUser('Bob Bassman')
})

afterAll(async () => {
  await deleteTestUsers()
})

describe('Profil-Anlage', () => {
  it('legt beim Registrieren automatisch ein Profil an', async () => {
    const { data } = await admin.from('profiles').select('display_name').eq('id', alice.id).single()
    expect(data!.display_name).toBe('Alice Ampeg')
  })

  it('vergibt einen Ersatznamen, wenn keiner mitgeliefert wurde', async () => {
    const { data: created } = await admin.auth.admin.createUser({
      email: `rigmate-test-${crypto.randomUUID()}@example.invalid`,
      password: 'rigmate-test-passwort-2026',
      email_confirm: true,
    })
    const { data } = await admin.from('profiles').select('display_name').eq('id', created.user!.id).single()
    expect(data!.display_name).toMatch(/^Rigmate /)
  })

  it('löscht das Profil mit dem Nutzer', async () => {
    const doomed = await createTestUser('Kurzlebig')
    await admin.auth.admin.deleteUser(doomed.id)
    const { data } = await admin.from('profiles').select('id').eq('id', doomed.id)
    expect(data).toEqual([])
  })
})

describe('Profil-Regeln', () => {
  it('lehnt einen zu kurzen Anzeigenamen ab', async () => {
    const { error } = await alice.client.from('profiles').update({ display_name: 'A' }).eq('id', alice.id)
    expect(error).not.toBeNull()
  })

  it('erlaubt leere optionale Felder — nur der Anzeigename ist Pflicht', async () => {
    const { error } = await alice.client
      .from('profiles')
      .update({ real_name: null, bio: null, bands: [], links: [] })
      .eq('id', alice.id)
    expect(error).toBeNull()
  })
})

describe('Profil-RLS', () => {
  it('bleibt ohne Login unsichtbar', async () => {
    // Abschnitt 10: Profile nur mit Login.
    const { data } = await anon.from('profiles').select('id').eq('id', alice.id)
    expect(data).toEqual([])
  })

  it('ist für andere Angemeldete lesbar', async () => {
    const { data } = await bob.client.from('profiles').select('display_name').eq('id', alice.id)
    expect(data).toHaveLength(1)
  })

  it('lässt nur das eigene Profil bearbeiten', async () => {
    await bob.client.from('profiles').update({ display_name: 'Gekapert' }).eq('id', alice.id)
    const { data } = await admin.from('profiles').select('display_name').eq('id', alice.id).single()
    expect(data!.display_name).not.toBe('Gekapert')
  })

  it('lässt das eigene Profil bearbeiten', async () => {
    const { error } = await alice.client
      .from('profiles')
      .update({ bio: 'Spielt zu laut.' })
      .eq('id', alice.id)
    expect(error).toBeNull()
  })
})
```

- [ ] **Step 3: Test laufen lassen — er muss fehlschlagen**

Run: `yarn test tests/db/profiles.test.ts`
Expected: FAIL — `relation "public.profiles" does not exist`.

- [ ] **Step 4: Migration anlegen und schreiben**

```bash
yarn db:new profiles
```

```sql
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

create or replace function touch_updated_at()
returns trigger
language plpgsql
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
```

- [ ] **Step 5: Migration einspielen und Tests laufen lassen**

```bash
yarn db:push
yarn test tests/db/profiles.test.ts
```
Expected: PASS, 9 Tests.

- [ ] **Step 6: Aufräumen prüfen**

Run: `yarn supabase` ist hier nicht nötig — stattdessen über den Supabase-MCP `execute_sql` mit `select count(*) from auth.users where email like 'rigmate-test-%'`.
Expected: `0`. Bleiben Testnutzer stehen, ist `deleteTestUsers()` nicht durchgelaufen — das muss vor dem Commit stimmen.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations tests/
git commit -m "feat(db): Profile mit Auto-Anlage-Trigger und RLS"
```

---

## Task 8: Textschicht und Anmeldung

Ab hier wird die App sichtbar. Die Textschicht kommt zuerst, weil sonst der erste deutsche String im Template landet und dort bleibt.

**Files:**
- Create: `app/locales/de.ts`
- Create: `app/composables/useText.ts`
- Create: `app/middleware/auth.ts`
- Create: `app/layouts/default.vue`
- Create: `app/pages/login.vue`
- Create: `app/pages/register.vue`
- Create: `app/pages/confirm.vue`
- Modify: `app/app.vue`
- Create: `tests/unit/locale.test.ts`

**Interfaces:**
- Consumes: Tabelle `profiles` aus Task 7
- Produces:
  - `export const de` aus `app/locales/de.ts` — verschachteltes Objekt aller sichtbaren Texte
  - `useText(): typeof de` aus `app/composables/useText.ts`
  - Middleware `auth` — leitet Nicht-Angemeldete auf `/login?redirect=<pfad>`
  - Layout `default` mit Kopfzeile

- [ ] **Step 1: Den fehlschlagenden Test schreiben**

Der Test hält die Sprachentscheidung durch — sonst schleicht sich Deutsch ins Template zurück. `tests/unit/locale.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { de } from '../../app/locales/de'

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

describe('Textschicht', () => {
  it('kennt die Kategorien-Labels', () => {
    expect(de.categories.guitar).toBe('Gitarre')
    expect(de.categories.strings).toBe('Saiten')
    expect(de.categories.pick).toBe('Plektrum')
  })

  it('hat für jede Kategorie aus dem Schema ein Label', () => {
    const schemaCategories = [
      'guitar', 'bass', 'amp', 'cabinet', 'pedal',
      'pickup', 'preamp', 'accessory', 'strings', 'pick',
    ]
    for (const id of schemaCategories) {
      expect(de.categories[id as keyof typeof de.categories]).toBeTruthy()
    }
  })

  it('lässt keinen Umlaut in einer .vue-Datei stehen', () => {
    // Alle sichtbaren Texte gehören nach app/locales/de.ts. Umlaute sind der
    // billigste Indikator für einen deutschen String im Template.
    const offenders = walk('app')
      .filter((file) => file.endsWith('.vue'))
      .filter((file) => /[äöüÄÖÜß]/.test(readFileSync(file, 'utf8')))
    expect(offenders).toEqual([])
  })
})
```

- [ ] **Step 2: Test laufen lassen — er muss fehlschlagen**

Run: `yarn test tests/unit/locale.test.ts`
Expected: FAIL — `Cannot find module '../../app/locales/de'`.

- [ ] **Step 3: Textschicht anlegen**

`app/locales/de.ts`. Das wächst mit jedem folgenden Task; hier steht, was Task 8 braucht, plus die Kategorien.

```ts
export const de = {
  app: {
    name: 'Rigmate',
    tagline: 'Finde Leute über ihr Equipment.',
  },
  nav: {
    home: 'Start',
    rig: 'Mein Rig',
    search: 'Suche',
    settings: 'Einstellungen',
    login: 'Anmelden',
    logout: 'Abmelden',
    register: 'Konto anlegen',
  },
  categories: {
    guitar: 'Gitarre',
    bass: 'Bass',
    amp: 'Amp',
    cabinet: 'Cabinet',
    pedal: 'Pedal',
    pickup: 'Tonabnehmer',
    preamp: 'Preamp',
    accessory: 'Zubehör',
    strings: 'Saiten',
    pick: 'Plektrum',
  },
  auth: {
    loginTitle: 'Anmelden',
    registerTitle: 'Konto anlegen',
    email: 'E-Mail',
    password: 'Passwort',
    displayName: 'Anzeigename',
    displayNameHint: 'Ein Künstlername reicht völlig. Mehr braucht es nicht.',
    submitLogin: 'Anmelden',
    submitRegister: 'Konto anlegen',
    toRegister: 'Noch kein Konto? Hier anlegen.',
    toLogin: 'Schon ein Konto? Hier anmelden.',
    confirmSent:
      'Wir haben dir eine E-Mail geschickt. Klick den Link darin, dann geht es weiter.',
    confirmTitle: 'Konto bestätigt',
    confirmBody: 'Alles klar. Jetzt fehlt nur noch dein Equipment.',
    confirmCta: 'Rig eintragen',
    errorGeneric: 'Das hat nicht geklappt. Versuch es noch einmal.',
    errorInvalidCredentials: 'E-Mail oder Passwort stimmt nicht.',
    errorEmailInUse: 'Für diese E-Mail gibt es schon ein Konto.',
  },
} as const
```

- [ ] **Step 4: Zugriff und Middleware anlegen**

`app/composables/useText.ts`:

```ts
import { de } from '~/locales/de'

// Eine Sprache, aber über eine Stelle. Ein zweites Locale wäre hier ein
// Austausch, kein Umbau.
export function useText() {
  return de
}
```

`app/middleware/auth.ts`:

```ts
export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser()
  if (user.value) return
  // Das Supabase-Modul leitet bewusst nicht global um (siehe nuxt.config.ts),
  // deshalb schützen wir hier pro Seite.
  return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
})
```

- [ ] **Step 5: Layout und app.vue**

`app/app.vue`:

```vue
<template>
  <NuxtRouteAnnouncer />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
```

`app/layouts/default.vue`:

```vue
<script setup lang="ts">
const t = useText()
const user = useSupabaseUser()
const supabase = useSupabaseClient()

async function logout() {
  await supabase.auth.signOut()
  await navigateTo('/login')
}
</script>

<template>
  <div class="min-h-screen bg-neutral-50 text-neutral-900">
    <header class="border-b border-neutral-200 bg-white">
      <nav class="mx-auto flex max-w-5xl items-center gap-f-6 px-f-6 py-4">
        <NuxtLink to="/" class="text-f-xl font-semibold">{{ t.app.name }}</NuxtLink>
        <NuxtLink to="/search" class="text-sm">{{ t.nav.search }}</NuxtLink>
        <template v-if="user">
          <NuxtLink to="/rig" class="text-sm">{{ t.nav.rig }}</NuxtLink>
          <NuxtLink to="/settings" class="text-sm">{{ t.nav.settings }}</NuxtLink>
          <button type="button" class="ml-auto text-sm" @click="logout">{{ t.nav.logout }}</button>
        </template>
        <template v-else>
          <NuxtLink to="/login" class="ml-auto text-sm">{{ t.nav.login }}</NuxtLink>
        </template>
      </nav>
    </header>
    <main class="mx-auto max-w-5xl px-f-6 py-f-8">
      <slot />
    </main>
  </div>
</template>
```

- [ ] **Step 6: Anmelde-Seite**

`app/pages/login.vue`:

```vue
<script setup lang="ts">
const t = useText()
const supabase = useSupabaseClient()
const route = useRoute()

const email = ref('')
const password = ref('')
const error = ref('')
const pending = ref(false)

async function submit() {
  pending.value = true
  error.value = ''
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value,
  })
  pending.value = false
  if (signInError) {
    error.value = t.auth.errorInvalidCredentials
    return
  }
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
  await navigateTo(redirect)
}
</script>

<template>
  <div class="mx-auto max-w-sm">
    <h1 class="mb-f-6 text-f-3xl font-semibold">{{ t.auth.loginTitle }}</h1>
    <form class="flex flex-col gap-4" @submit.prevent="submit">
      <label class="flex flex-col gap-1">
        <span class="text-sm">{{ t.auth.email }}</span>
        <input v-model="email" type="email" required class="rounded border px-3 py-2" />
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-sm">{{ t.auth.password }}</span>
        <input v-model="password" type="password" required class="rounded border px-3 py-2" />
      </label>
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <button type="submit" :disabled="pending" class="rounded bg-neutral-900 px-4 py-2 text-white">
        {{ t.auth.submitLogin }}
      </button>
    </form>
    <NuxtLink to="/register" class="mt-4 block text-sm underline">{{ t.auth.toRegister }}</NuxtLink>
  </div>
</template>
```

- [ ] **Step 7: Registrierung und Bestätigung**

`app/pages/register.vue`. Die Mail-Bestätigung ist Pflicht und bleibt es — nach dem Absenden wartet der Nutzer auf die Mail.

```vue
<script setup lang="ts">
const t = useText()
const supabase = useSupabaseClient()

const email = ref('')
const password = ref('')
const displayName = ref('')
const error = ref('')
const sent = ref(false)
const pending = ref(false)

async function submit() {
  pending.value = true
  error.value = ''
  const { error: signUpError } = await supabase.auth.signUp({
    email: email.value,
    password: password.value,
    options: {
      data: { display_name: displayName.value },
      emailRedirectTo: `${window.location.origin}/confirm`,
    },
  })
  pending.value = false
  if (signUpError) {
    error.value = signUpError.message.includes('already')
      ? t.auth.errorEmailInUse
      : t.auth.errorGeneric
    return
  }
  sent.value = true
}
</script>

<template>
  <div class="mx-auto max-w-sm">
    <h1 class="mb-f-6 text-f-3xl font-semibold">{{ t.auth.registerTitle }}</h1>
    <p v-if="sent" class="text-f-lg">{{ t.auth.confirmSent }}</p>
    <form v-else class="flex flex-col gap-4" @submit.prevent="submit">
      <label class="flex flex-col gap-1">
        <span class="text-sm">{{ t.auth.displayName }}</span>
        <input v-model="displayName" type="text" required minlength="2" maxlength="40" class="rounded border px-3 py-2" />
        <span class="text-xs text-neutral-500">{{ t.auth.displayNameHint }}</span>
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-sm">{{ t.auth.email }}</span>
        <input v-model="email" type="email" required class="rounded border px-3 py-2" />
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-sm">{{ t.auth.password }}</span>
        <input v-model="password" type="password" required minlength="8" class="rounded border px-3 py-2" />
      </label>
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <button type="submit" :disabled="pending" class="rounded bg-neutral-900 px-4 py-2 text-white">
        {{ t.auth.submitRegister }}
      </button>
    </form>
    <NuxtLink to="/login" class="mt-4 block text-sm underline">{{ t.auth.toLogin }}</NuxtLink>
  </div>
</template>
```

`app/pages/confirm.vue`:

```vue
<script setup lang="ts">
const t = useText()
</script>

<template>
  <div class="mx-auto max-w-sm text-center">
    <h1 class="mb-4 text-f-3xl font-semibold">{{ t.auth.confirmTitle }}</h1>
    <p class="mb-f-6">{{ t.auth.confirmBody }}</p>
    <NuxtLink to="/onboarding" class="rounded bg-neutral-900 px-4 py-2 text-white">
      {{ t.auth.confirmCta }}
    </NuxtLink>
  </div>
</template>
```

- [ ] **Step 8: Bestätigungs-URL in Supabase eintragen**

Im Supabase-Dashboard unter Authentication → URL Configuration `http://localhost:3000/confirm` als Redirect-URL eintragen. Ohne das läuft der Link aus der Bestätigungsmail ins Leere.

- [ ] **Step 9: Tests laufen lassen — sie müssen bestehen**

Run: `yarn test tests/unit/locale.test.ts`
Expected: PASS, 3 Tests. Insbesondere darf keine `.vue`-Datei einen Umlaut enthalten.

- [ ] **Step 10: Von Hand durchklicken**

```bash
yarn dev
```
Registrieren, Mail bestätigen, anmelden, abmelden. Danach über den Supabase-MCP prüfen, dass in `profiles` eine Zeile mit dem eingegebenen Anzeigenamen steht.

- [ ] **Step 11: Commit**

```bash
git add app/ tests/unit/locale.test.ts
git commit -m "feat(auth): Anmeldung, Registrierung und deutsche Textschicht"
```

---

## Task 9: Rig — Exemplare, Präferenzen, Wunschliste

Drei Tabellen, weil es drei verschiedene Dinge sind: was jemand besitzt, was er bevorzugt, was er sucht. Die Unterscheidung trägt später die Gewichtung in der Empfehlung.

**Files:**
- Create: `supabase/migrations/<timestamp>_rig.sql`
- Create: `tests/db/rig.test.ts`

**Interfaces:**
- Consumes: `catalog_items`, `categories` aus Task 2; `profiles` aus Task 7; `createTestUser` aus Task 7
- Produces:
  - Tabelle `gear_items` — `id`, `owner_id`, `catalog_item_id`, `year`, `finish`, `modifications`, `photo_path`, `notes`, `installed_in_id`
  - Tabelle `preferences` — `id`, `user_id`, `catalog_item_id`, unique je Nutzer
  - Tabelle `wishlist_items` — `id`, `user_id`, `catalog_item_id`, `note`, unique je Nutzer
  - Storage-Bucket `gear-photos` (nur für Angemeldete lesbar)

- [ ] **Step 1: Den fehlschlagenden Test schreiben**

`tests/db/rig.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { adminClient, anonClient } from '../helpers/supabase'
import { createTestUser, deleteTestUsers, type TestUser } from '../helpers/testUser'

const admin = adminClient()
const anon = anonClient()

let alice: TestUser
let bob: TestUser
let stratId: string
let pickupId: string
let slinkyId: string
let ac30Id: string

async function catalogId(name: string): Promise<string> {
  const { data } = await admin.from('catalog_items').select('id').eq('name', name).single()
  return data!.id
}

beforeAll(async () => {
  alice = await createTestUser('Alice Ampeg')
  bob = await createTestUser('Bob Bassman')
  stratId = await catalogId('Stratocaster')
  pickupId = await catalogId('JB')
  slinkyId = await catalogId('Regular Slinky')
  ac30Id = await catalogId('AC30')
})

afterAll(async () => {
  await deleteTestUsers()
})

describe('gear_items', () => {
  it('nimmt ein Exemplar mit nur einem Katalog-Verweis an', async () => {
    // Abschnitt 6: "Fender Stratocaster" allein ist ein vollständiger Eintrag.
    const { error } = await alice.client
      .from('gear_items')
      .insert({ owner_id: alice.id, catalog_item_id: stratId })
    expect(error).toBeNull()
  })

  it('nimmt die optionale Tiefe an', async () => {
    const { error } = await alice.client.from('gear_items').insert({
      owner_id: alice.id,
      catalog_item_id: ac30Id,
      year: 2019,
      finish: 'Sunburst',
      modifications: 'Speaker getauscht',
      notes: 'Klingt erst ab halb sechs.',
    })
    expect(error).toBeNull()
  })

  it('lehnt ein unmögliches Baujahr ab', async () => {
    const { error } = await alice.client
      .from('gear_items')
      .insert({ owner_id: alice.id, catalog_item_id: stratId, year: 1234 })
    expect(error).not.toBeNull()
  })

  it('lehnt Verbrauchsmaterial als Exemplar ab', async () => {
    // Saiten besitzt man nicht als Einzelstück, man bevorzugt sie.
    const { error } = await alice.client
      .from('gear_items')
      .insert({ owner_id: alice.id, catalog_item_id: slinkyId })
    expect(error).not.toBeNull()
    expect(error!.message).toMatch(/consumable/i)
  })

  it('lehnt ein Exemplar auf fremden Namen ab', async () => {
    const { error } = await bob.client
      .from('gear_items')
      .insert({ owner_id: alice.id, catalog_item_id: stratId })
    expect(error).not.toBeNull()
  })
})

describe('installed_in', () => {
  it('verbaut ein Exemplar in einem anderen desselben Nutzers', async () => {
    const { data: guitar } = await alice.client
      .from('gear_items')
      .insert({ owner_id: alice.id, catalog_item_id: stratId, finish: 'Olympic White' })
      .select('id')
      .single()

    const { error } = await alice.client
      .from('gear_items')
      .insert({ owner_id: alice.id, catalog_item_id: pickupId, installed_in_id: guitar!.id })
    expect(error).toBeNull()
  })

  it('lehnt das Verbauen in fremdem Equipment ab', async () => {
    const { data: aliceGuitar } = await admin
      .from('gear_items')
      .select('id')
      .eq('owner_id', alice.id)
      .limit(1)
      .single()

    const { error } = await bob.client
      .from('gear_items')
      .insert({ owner_id: bob.id, catalog_item_id: pickupId, installed_in_id: aliceGuitar!.id })
    expect(error).not.toBeNull()
    expect(error!.message).toMatch(/same owner/i)
  })

  it('lehnt eine zweite Verschachtelungsebene ab', async () => {
    const { data: guitar } = await alice.client
      .from('gear_items')
      .insert({ owner_id: alice.id, catalog_item_id: stratId, finish: 'Fiesta Red' })
      .select('id')
      .single()
    const { data: pickup } = await alice.client
      .from('gear_items')
      .insert({ owner_id: alice.id, catalog_item_id: pickupId, installed_in_id: guitar!.id })
      .select('id')
      .single()

    const { error } = await alice.client
      .from('gear_items')
      .insert({ owner_id: alice.id, catalog_item_id: pickupId, installed_in_id: pickup!.id })
    expect(error).not.toBeNull()
    expect(error!.message).toMatch(/one level/i)
  })
})

describe('preferences', () => {
  it('nimmt Verbrauchsmaterial an', async () => {
    const { error } = await alice.client
      .from('preferences')
      .insert({ user_id: alice.id, catalog_item_id: slinkyId })
    expect(error).toBeNull()
  })

  it('lehnt eine Gitarre als Präferenz ab', async () => {
    const { error } = await alice.client
      .from('preferences')
      .insert({ user_id: alice.id, catalog_item_id: stratId })
    expect(error).not.toBeNull()
    expect(error!.message).toMatch(/consumable/i)
  })

  it('lehnt dieselbe Präferenz zweimal ab', async () => {
    const { error } = await alice.client
      .from('preferences')
      .insert({ user_id: alice.id, catalog_item_id: slinkyId })
    expect(error!.code).toBe('23505')
  })
})

describe('wishlist_items', () => {
  it('nimmt einen Wunsch an', async () => {
    const { error } = await bob.client
      .from('wishlist_items')
      .insert({ user_id: bob.id, catalog_item_id: stratId, note: 'Am liebsten in Sonic Blue.' })
    expect(error).toBeNull()
  })

  it('lehnt denselben Wunsch zweimal ab', async () => {
    const { error } = await bob.client
      .from('wishlist_items')
      .insert({ user_id: bob.id, catalog_item_id: stratId })
    expect(error!.code).toBe('23505')
  })
})

describe('Rig-RLS', () => {
  it('zeigt das Rig allen Angemeldeten', async () => {
    // Abschnitt 7: Läge die Liste hinter Freundschaft, stünde der Motor.
    const { data } = await bob.client.from('gear_items').select('id').eq('owner_id', alice.id)
    expect(data!.length).toBeGreaterThan(0)
  })

  it('verbirgt das Rig vor Nicht-Angemeldeten', async () => {
    const { data } = await anon.from('gear_items').select('id').eq('owner_id', alice.id)
    expect(data).toEqual([])
  })

  it('lässt fremdes Equipment nicht ändern', async () => {
    const { data: item } = await admin
      .from('gear_items')
      .select('id')
      .eq('owner_id', alice.id)
      .limit(1)
      .single()
    await bob.client.from('gear_items').update({ notes: 'gekapert' }).eq('id', item!.id)
    const { data } = await admin.from('gear_items').select('notes').eq('id', item!.id).single()
    expect(data!.notes).not.toBe('gekapert')
  })

  it('lässt fremdes Equipment nicht löschen', async () => {
    const { count: before } = await admin
      .from('gear_items')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', alice.id)
    await bob.client.from('gear_items').delete().eq('owner_id', alice.id)
    const { count: after } = await admin
      .from('gear_items')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', alice.id)
    expect(after).toBe(before)
  })

  it('lässt eigenes Equipment löschen', async () => {
    const { data: item } = await alice.client
      .from('gear_items')
      .insert({ owner_id: alice.id, catalog_item_id: stratId, finish: 'Wegwerf' })
      .select('id')
      .single()
    const { error } = await alice.client.from('gear_items').delete().eq('id', item!.id)
    expect(error).toBeNull()
  })
})
```

- [ ] **Step 2: Test laufen lassen — er muss fehlschlagen**

Run: `yarn test tests/db/rig.test.ts`
Expected: FAIL — `relation "public.gear_items" does not exist`.

- [ ] **Step 3: Migration anlegen und schreiben**

```bash
yarn db:new rig
```

```sql
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

create or replace function is_consumable_item(item_id uuid)
returns boolean
language sql
stable
as $fn$
  select c.is_consumable
  from catalog_items ci
  join categories c on c.id = ci.category_id
  where ci.id = item_id;
$fn$;

create or replace function enforce_gear_item_rules()
returns trigger
language plpgsql
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
```

Hinweis: die `for all`-Policy deckt select, insert, update und delete ab. Die separate Lese-Policy daneben ist trotzdem nötig, weil Policies additiv sind — ohne sie sähe niemand fremde Rigs.

- [ ] **Step 4: Migration einspielen und Tests laufen lassen**

```bash
yarn db:push
yarn test tests/db/rig.test.ts
```
Expected: PASS, 18 Tests.

- [ ] **Step 5: Sicherheits-Hinweise prüfen**

Über den Supabase-MCP `get_advisors` mit `type: "security"`. Kein Hinweis auf eine Tabelle ohne RLS.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations tests/db/rig.test.ts
git commit -m "feat(db): Exemplare, Praeferenzen und Wunschliste mit RLS"
```

---

## Task 10: Auswahlfeld und Rig-Verwaltung

Der Bildschirm, an dem die Spec hängt. Keine Freitext-Eingabe: es wird immer aus dem Katalog gewählt, deshalb entstehen Dubletten gar nicht erst.

**Files:**
- Create: `app/components/CatalogPicker.vue`
- Create: `app/components/GearItemForm.vue`
- Create: `app/pages/rig.vue`
- Modify: `app/locales/de.ts`
- Create: `tests/api/catalogPicker.test.ts`

**Interfaces:**
- Consumes: `GET /api/catalog/search` aus Task 6; Tabellen aus Task 9; `useText()` aus Task 8
- Produces:
  - `CatalogPicker` — Props `{ categoryId?: string; placeholder?: string }`, Emit `select` mit `CatalogSearchResult`, Emit `create` mit `{ brand, name, categoryId }`
  - `GearItemForm` — Props `{ catalogItem: CatalogSearchResult; ownedGear: GearRow[] }`, Emit `save` mit `{ year, finish, modifications, notes, installedInId }`
  - Seite `/rig`

- [ ] **Step 1: Texte ergänzen**

In `app/locales/de.ts` unter `de`:

```ts
  picker: {
    placeholder: 'Marke oder Modell tippen …',
    levelLine: 'Modell-Linie',
    levelVariant: 'Ausführung',
    unverified: 'ungeprüft',
    noResults: 'Nichts gefunden.',
    createHint: 'Nicht dabei? Neu anlegen',
    createBrand: 'Marke',
    createName: 'Modell',
    createCategory: 'Kategorie',
    createSubmit: 'Anlegen',
    createYearError: 'Das Baujahr gehört ins Exemplar, nicht in den Modellnamen.',
  },
  precisionHint: {
    // Nie ein Pflichtfeld - nur ein Hinweis nach der Auswahl.
    text: 'Von diesem Modell gibt es sehr unterschiedliche Ausführungen. Wenn du deine kennst, wird dein Treffer deutlich schärfer.',
    dismiss: 'Passt so',
  },
  rig: {
    title: 'Mein Rig',
    gear: 'Equipment',
    preferences: 'Saiten und Plektren',
    wishlist: 'Wunschliste',
    addGear: 'Equipment hinzufügen',
    addPreference: 'Saiten oder Plektrum hinzufügen',
    addWish: 'Auf die Wunschliste',
    empty: 'Hier ist noch nichts. Trag dein erstes Gerät ein.',
    remove: 'Entfernen',
    save: 'Speichern',
    cancel: 'Abbrechen',
  },
  gearForm: {
    optionalHint: 'Alles hier ist freiwillig. Je genauer, desto besser die Treffer.',
    year: 'Baujahr',
    finish: 'Farbe oder Ausführung',
    modifications: 'Modifikationen',
    notes: 'Notizen',
    installedIn: 'Verbaut in',
    installedInNone: 'Nicht verbaut',
  },
```

- [ ] **Step 2: Den fehlschlagenden Test schreiben**

Das Auswahlfeld selbst ist dünne Bindung; getestet wird der Vertrag, auf dem es steht. `tests/api/catalogPicker.test.ts`:

```ts
import { describe, it, expect } from 'vitest'

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3000'

async function search(query: string, extra = ''): Promise<any> {
  const response = await fetch(`${BASE}/api/catalog/search?q=${encodeURIComponent(query)}${extra}`)
  return response.json()
}

describe('Vertrag für das Auswahlfeld', () => {
  it('liefert alle Felder, die die Liste anzeigt', async () => {
    const body = await search('strat')
    const first = body.results[0]
    expect(Object.keys(first).sort()).toEqual(
      [
        'brandName', 'categoryId', 'id', 'isVerified', 'level',
        'lineId', 'lineName', 'name', 'needsPrecisionHint', 'rarityBase', 'slug',
      ].sort(),
    )
  })

  it('kommt mit einem einzelnen Buchstaben zurecht', async () => {
    // Bei jedem Tastendruck - der erste Buchstabe darf nichts umbringen.
    const body = await search('s')
    expect(Array.isArray(body.results)).toBe(true)
  })

  it('begrenzt die Liste auf acht Einträge', async () => {
    const body = await search('a')
    expect(body.results.length).toBeLessThanOrEqual(8)
  })

  it('liefert für Saiten nur Saiten', async () => {
    const body = await search('slinky', '&category=strings')
    expect(body.results.every((r: any) => r.categoryId === 'strings')).toBe(true)
  })
})
```

- [ ] **Step 3: Test laufen lassen**

```bash
yarn dev
yarn test:api tests/api/catalogPicker.test.ts
```
Expected: PASS für die letzten drei, FAIL beim Feldvertrag, falls ein Feld fehlt. Fehlt eines, in `search.get.ts` nachtragen.

- [ ] **Step 4: `CatalogPicker.vue` schreiben**

```vue
<script setup lang="ts">
interface CatalogSearchResult {
  id: string
  name: string
  slug: string
  brandName: string
  categoryId: string
  level: 'line' | 'variant'
  lineId: string
  lineName: string
  rarityBase: string
  isVerified: boolean
  needsPrecisionHint: boolean
}

const props = defineProps<{ categoryId?: string; placeholder?: string }>()
const emit = defineEmits<{
  select: [CatalogSearchResult]
  create: [{ brand: string; name: string; categoryId: string }]
}>()

const t = useText()
const term = ref('')
const results = ref<CatalogSearchResult[]>([])
const showCreate = ref(false)
const newBrand = ref('')
const newName = ref('')
const newCategory = ref(props.categoryId ?? 'guitar')
const createError = ref('')

let debounce: ReturnType<typeof setTimeout> | undefined

// Aufloesen passiert waehrend des Tippens, nicht als Rueckfrage danach.
watch(term, (value) => {
  clearTimeout(debounce)
  if (value.trim() === '') {
    results.value = []
    return
  }
  debounce = setTimeout(async () => {
    const query = new URLSearchParams({ q: value })
    if (props.categoryId) query.set('category', props.categoryId)
    const body = await $fetch<{ results: CatalogSearchResult[] }>(`/api/catalog/search?${query}`)
    results.value = body.results
  }, 120)
})

function choose(result: CatalogSearchResult) {
  emit('select', result)
  term.value = ''
  results.value = []
  showCreate.value = false
}

function submitCreate() {
  createError.value = ''
  if (/\b(19|20)\d{2}\b/.test(newName.value)) {
    createError.value = t.picker.createYearError
    return
  }
  emit('create', {
    brand: newBrand.value.trim(),
    name: newName.value.trim(),
    categoryId: newCategory.value,
  })
  newBrand.value = ''
  newName.value = ''
  showCreate.value = false
  term.value = ''
}

const categoryEntries = computed(() =>
  Object.entries(t.categories).map(([id, label]) => ({ id, label })),
)
</script>

<template>
  <div class="relative">
    <input
      v-model="term"
      type="text"
      :placeholder="placeholder ?? t.picker.placeholder"
      class="w-full rounded border px-3 py-2"
    />

    <ul v-if="results.length > 0" class="mt-1 divide-y rounded border bg-white">
      <li v-for="result in results" :key="result.id">
        <button type="button" class="flex w-full items-baseline gap-2 px-3 py-2 text-left" @click="choose(result)">
          <span class="font-medium">{{ result.brandName }} {{ result.name }}</span>
          <!-- Beide Katalogebenen nebeneinander: der Gelegenheitsnutzer
               klickt oben, der Nerd sieht daneben seine Ausfuehrung. -->
          <span class="text-xs text-neutral-500">
            {{ result.level === 'line' ? t.picker.levelLine : t.picker.levelVariant }}
          </span>
          <span v-if="!result.isVerified" class="text-xs text-amber-600">{{ t.picker.unverified }}</span>
        </button>
      </li>
    </ul>

    <p v-else-if="term.trim() !== ''" class="mt-1 text-sm text-neutral-500">
      {{ t.picker.noResults }}
    </p>

    <!-- Notausgang, bewusst unauffaellig: der Ausnahmefall, nicht der Normalweg. -->
    <button
      v-if="term.trim() !== '' && !showCreate"
      type="button"
      class="mt-2 text-sm underline"
      @click="showCreate = true"
    >
      {{ t.picker.createHint }}
    </button>

    <form v-if="showCreate" class="mt-2 flex flex-col gap-2 rounded border p-3" @submit.prevent="submitCreate">
      <label class="flex flex-col gap-1">
        <span class="text-xs">{{ t.picker.createBrand }}</span>
        <input v-model="newBrand" type="text" required class="rounded border px-2 py-1" />
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-xs">{{ t.picker.createName }}</span>
        <input v-model="newName" type="text" required class="rounded border px-2 py-1" />
      </label>
      <label v-if="!categoryId" class="flex flex-col gap-1">
        <span class="text-xs">{{ t.picker.createCategory }}</span>
        <select v-model="newCategory" class="rounded border px-2 py-1">
          <option v-for="entry in categoryEntries" :key="entry.id" :value="entry.id">{{ entry.label }}</option>
        </select>
      </label>
      <p v-if="createError" class="text-sm text-red-600">{{ createError }}</p>
      <button type="submit" class="rounded bg-neutral-900 px-3 py-1 text-white">{{ t.picker.createSubmit }}</button>
    </form>
  </div>
</template>
```

- [ ] **Step 5: `GearItemForm.vue` schreiben**

Alle Felder freiwillig. Die gestaffelte Tiefe aus Abschnitt 6 ist hier wörtlich umgesetzt.

```vue
<script setup lang="ts">
interface GearRow {
  id: string
  label: string
}

const props = defineProps<{
  catalogItemLabel: string
  ownedGear: GearRow[]
  showPrecisionHint?: boolean
}>()

const emit = defineEmits<{
  save: [{ year: number | null; finish: string | null; modifications: string | null; notes: string | null; installedInId: string | null }]
  cancel: []
}>()

const t = useText()
const year = ref<string>('')
const finish = ref('')
const modifications = ref('')
const notes = ref('')
const installedInId = ref('')
const hintDismissed = ref(false)

function submit() {
  emit('save', {
    year: year.value === '' ? null : Number(year.value),
    finish: finish.value.trim() || null,
    modifications: modifications.value.trim() || null,
    notes: notes.value.trim() || null,
    installedInId: installedInId.value || null,
  })
}
</script>

<template>
  <form class="flex flex-col gap-3 rounded border p-4" @submit.prevent="submit">
    <p class="font-medium">{{ catalogItemLabel }}</p>

    <!-- Der Hinweis greift nach der Auswahl und ist nie ein Pflichtfeld. -->
    <p v-if="showPrecisionHint && !hintDismissed" class="rounded bg-amber-50 p-2 text-sm">
      {{ t.precisionHint.text }}
      <button type="button" class="ml-2 underline" @click="hintDismissed = true">
        {{ t.precisionHint.dismiss }}
      </button>
    </p>

    <p class="text-xs text-neutral-500">{{ t.gearForm.optionalHint }}</p>

    <label class="flex flex-col gap-1">
      <span class="text-sm">{{ t.gearForm.year }}</span>
      <input v-model="year" type="number" min="1900" max="2100" class="rounded border px-3 py-2" />
    </label>
    <label class="flex flex-col gap-1">
      <span class="text-sm">{{ t.gearForm.finish }}</span>
      <input v-model="finish" type="text" maxlength="80" class="rounded border px-3 py-2" />
    </label>
    <label class="flex flex-col gap-1">
      <span class="text-sm">{{ t.gearForm.modifications }}</span>
      <input v-model="modifications" type="text" maxlength="500" class="rounded border px-3 py-2" />
    </label>
    <label class="flex flex-col gap-1">
      <span class="text-sm">{{ t.gearForm.notes }}</span>
      <textarea v-model="notes" maxlength="1000" rows="3" class="rounded border px-3 py-2" />
    </label>
    <label v-if="ownedGear.length > 0" class="flex flex-col gap-1">
      <span class="text-sm">{{ t.gearForm.installedIn }}</span>
      <select v-model="installedInId" class="rounded border px-3 py-2">
        <option value="">{{ t.gearForm.installedInNone }}</option>
        <option v-for="item in ownedGear" :key="item.id" :value="item.id">{{ item.label }}</option>
      </select>
    </label>

    <div class="flex gap-2">
      <button type="submit" class="rounded bg-neutral-900 px-4 py-2 text-white">{{ t.rig.save }}</button>
      <button type="button" class="rounded border px-4 py-2" @click="emit('cancel')">{{ t.rig.cancel }}</button>
    </div>
  </form>
</template>
```

- [ ] **Step 6: `app/pages/rig.vue` schreiben**

Liest und schreibt direkt gegen Supabase — einfaches Lesen und Schreiben darf laut Abschnitt 12 am Server vorbei, abgesichert über RLS.

```vue
<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const t = useText()
const supabase = useSupabaseClient()
const user = useSupabaseUser()

const pendingItem = ref<any | null>(null)

const { data: gear, refresh: refreshGear } = await useAsyncData('rig-gear', async () => {
  const { data } = await supabase
    .from('gear_items')
    .select('id, year, finish, installed_in_id, catalog_items ( id, name, category_id, brands ( name ) )')
    .eq('owner_id', user.value!.id)
    .order('created_at')
  return data ?? []
})

const { data: preferences, refresh: refreshPreferences } = await useAsyncData('rig-preferences', async () => {
  const { data } = await supabase
    .from('preferences')
    .select('id, catalog_items ( id, name, brands ( name ) )')
    .eq('user_id', user.value!.id)
  return data ?? []
})

const { data: wishlist, refresh: refreshWishlist } = await useAsyncData('rig-wishlist', async () => {
  const { data } = await supabase
    .from('wishlist_items')
    .select('id, note, catalog_items ( id, name, brands ( name ) )')
    .eq('user_id', user.value!.id)
  return data ?? []
})

function label(row: any): string {
  return `${row.catalog_items.brands.name} ${row.catalog_items.name}`
}

const ownedGear = computed(() =>
  (gear.value ?? [])
    .filter((row: any) => row.installed_in_id === null)
    .map((row: any) => ({ id: row.id, label: label(row) })),
)

async function addPreference(result: any) {
  await supabase.from('preferences').insert({ user_id: user.value!.id, catalog_item_id: result.id })
  await refreshPreferences()
}

async function addWish(result: any) {
  await supabase.from('wishlist_items').insert({ user_id: user.value!.id, catalog_item_id: result.id })
  await refreshWishlist()
}

async function saveGear(details: any) {
  await supabase.from('gear_items').insert({
    owner_id: user.value!.id,
    catalog_item_id: pendingItem.value.id,
    year: details.year,
    finish: details.finish,
    modifications: details.modifications,
    notes: details.notes,
    installed_in_id: details.installedInId,
  })
  pendingItem.value = null
  await refreshGear()
}

async function createCatalogItem(input: { brand: string; name: string; categoryId: string }) {
  const created = await $fetch<{ id: string }>('/api/catalog/items', { method: 'POST', body: input })
  const body = await $fetch<{ results: any[] }>(
    `/api/catalog/search?q=${encodeURIComponent(`${input.brand} ${input.name}`)}`,
  )
  pendingItem.value = body.results.find((r) => r.id === created.id) ?? null
}

async function removeRow(table: 'gear_items' | 'preferences' | 'wishlist_items', id: string) {
  await supabase.from(table).delete().eq('id', id)
  if (table === 'gear_items') await refreshGear()
  if (table === 'preferences') await refreshPreferences()
  if (table === 'wishlist_items') await refreshWishlist()
}
</script>

<template>
  <div class="flex flex-col gap-f-12">
    <h1 class="text-f-4xl font-semibold">{{ t.rig.title }}</h1>

    <section class="flex flex-col gap-4">
      <h2 class="text-f-2xl font-semibold">{{ t.rig.gear }}</h2>
      <CatalogPicker v-if="!pendingItem" @select="pendingItem = $event" @create="createCatalogItem" />
      <GearItemForm
        v-else
        :catalog-item-label="`${pendingItem.brandName} ${pendingItem.name}`"
        :owned-gear="ownedGear"
        :show-precision-hint="pendingItem.needsPrecisionHint"
        @save="saveGear"
        @cancel="pendingItem = null"
      />
      <p v-if="(gear ?? []).length === 0" class="text-neutral-500">{{ t.rig.empty }}</p>
      <ul v-else class="divide-y rounded border">
        <li v-for="row in gear" :key="row.id" class="flex items-center gap-2 px-3 py-2">
          <span>{{ label(row) }}</span>
          <span v-if="row.year" class="text-sm text-neutral-500">{{ row.year }}</span>
          <span v-if="row.finish" class="text-sm text-neutral-500">{{ row.finish }}</span>
          <button type="button" class="ml-auto text-sm underline" @click="removeRow('gear_items', row.id)">
            {{ t.rig.remove }}
          </button>
        </li>
      </ul>
    </section>

    <section class="flex flex-col gap-4">
      <h2 class="text-f-2xl font-semibold">{{ t.rig.preferences }}</h2>
      <CatalogPicker category-id="strings" @select="addPreference" />
      <CatalogPicker category-id="pick" @select="addPreference" />
      <ul class="divide-y rounded border">
        <li v-for="row in preferences" :key="row.id" class="flex items-center px-3 py-2">
          <span>{{ label(row) }}</span>
          <button type="button" class="ml-auto text-sm underline" @click="removeRow('preferences', row.id)">
            {{ t.rig.remove }}
          </button>
        </li>
      </ul>
    </section>

    <section class="flex flex-col gap-4">
      <h2 class="text-f-2xl font-semibold">{{ t.rig.wishlist }}</h2>
      <CatalogPicker @select="addWish" />
      <ul class="divide-y rounded border">
        <li v-for="row in wishlist" :key="row.id" class="flex items-center px-3 py-2">
          <span>{{ label(row) }}</span>
          <button type="button" class="ml-auto text-sm underline" @click="removeRow('wishlist_items', row.id)">
            {{ t.rig.remove }}
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>
```

- [ ] **Step 7: Von Hand prüfen**

```bash
yarn dev
```
Anmelden, `/rig` öffnen, „strat" tippen. Erwartung: Liste erscheint während des Tippens, Modell-Linie oben, Ausführungen darunter, beide Ebenen gleichzeitig sichtbar. Nach der Auswahl der Modell-Linie erscheint der Genauigkeits-Hinweis, aber kein Pflichtfeld. „Fender Stratocaster" ist mit zwei Klicks eingetragen.

- [ ] **Step 8: Sprachtest laufen lassen**

Run: `yarn test tests/unit/locale.test.ts`
Expected: PASS — keine Umlaute in `.vue`-Dateien.

- [ ] **Step 9: Commit**

```bash
git add app/ tests/api/catalogPicker.test.ts
git commit -m "feat(rig): Katalog-Auswahlfeld und Rig-Verwaltung"
```

---

## Task 11: Onboarding

Der kritischste Bildschirm der ganzen App. Wer hier abbricht, hat kein Equipment, bekommt keine Empfehlungen und sieht eine leere Plattform.

**Files:**
- Create: `app/pages/onboarding.vue`
- Modify: `app/locales/de.ts`
- Create: `app/composables/useRigStatus.ts`

**Interfaces:**
- Consumes: `CatalogPicker` aus Task 10; Tabelle `gear_items` aus Task 9
- Produces:
  - `useRigStatus(): { hasGear: Ref<boolean>; count: Ref<number>; refresh: () => Promise<void> }`
  - Seite `/onboarding`

- [ ] **Step 1: Texte ergänzen**

```ts
  onboarding: {
    title: 'Was spielst du?',
    intro:
      'Trag ein, was du hast. Ein Modellname reicht — „Fender Stratocaster" ist ein vollständiger Eintrag. Genauer geht immer, muss aber nicht.',
    addedOne: 'Ein Gerät eingetragen.',
    addedMany: 'Geräte eingetragen: {count}',
    keepGoing: 'Noch eins?',
    done: 'Fertig, zeig mir Leute',
    skip: 'Später',
  },
```

- [ ] **Step 2: `useRigStatus` schreiben**

```ts
export function useRigStatus() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const count = ref(0)

  async function refresh() {
    if (!user.value) {
      count.value = 0
      return
    }
    const { count: rows } = await supabase
      .from('gear_items')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', user.value.id)
    count.value = rows ?? 0
  }

  const hasGear = computed(() => count.value > 0)
  return { hasGear, count, refresh }
}
```

- [ ] **Step 3: `app/pages/onboarding.vue` schreiben**

Bewusst ohne die Detailfelder aus `GearItemForm`: hier zählt jeder Klick weniger. Die Tiefe kommt später auf `/rig`.

```vue
<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const t = useText()
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const added = ref<string[]>([])

async function add(result: any) {
  const { error } = await supabase
    .from('gear_items')
    .insert({ owner_id: user.value!.id, catalog_item_id: result.id })
  if (!error) added.value.push(`${result.brandName} ${result.name}`)
}

async function createCatalogItem(input: { brand: string; name: string; categoryId: string }) {
  const created = await $fetch<{ id: string }>('/api/catalog/items', { method: 'POST', body: input })
  await supabase.from('gear_items').insert({ owner_id: user.value!.id, catalog_item_id: created.id })
  added.value.push(`${input.brand} ${input.name}`)
}

const countLabel = computed(() =>
  added.value.length === 1 ? t.onboarding.addedOne : t.onboarding.addedMany.replace('{count}', String(added.value.length)),
)
</script>

<template>
  <div class="mx-auto flex max-w-lg flex-col gap-f-8">
    <div>
      <h1 class="mb-3 text-f-4xl font-semibold">{{ t.onboarding.title }}</h1>
      <p class="text-neutral-600">{{ t.onboarding.intro }}</p>
    </div>

    <CatalogPicker @select="add" @create="createCatalogItem" />

    <div v-if="added.length > 0" class="flex flex-col gap-2">
      <p class="text-sm text-neutral-600">{{ countLabel }}</p>
      <ul class="divide-y rounded border">
        <li v-for="(item, index) in added" :key="index" class="px-3 py-2">{{ item }}</li>
      </ul>
      <p class="text-sm text-neutral-500">{{ t.onboarding.keepGoing }}</p>
    </div>

    <div class="flex gap-3">
      <NuxtLink v-if="added.length > 0" to="/" class="rounded bg-neutral-900 px-4 py-2 text-white">
        {{ t.onboarding.done }}
      </NuxtLink>
      <NuxtLink to="/" class="rounded border px-4 py-2">{{ t.onboarding.skip }}</NuxtLink>
    </div>
  </div>
</template>
```

- [ ] **Step 4: Von Hand prüfen — zwei Klicks**

```bash
yarn dev
```
Als frisch registrierter Nutzer `/onboarding` öffnen, „strat" tippen, auf „Fender Stratocaster" klicken. Erwartung: Das Gerät steht in der Liste. **Genau zwei Interaktionen** — tippen und klicken. Braucht es mehr, ist der Bildschirm zu schwer.

- [ ] **Step 5: Sprachtest laufen lassen**

Run: `yarn test tests/unit/locale.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/
git commit -m "feat(onboarding): niederschwelliger erster Rig-Eintrag"
```

---

## Task 12: Seltenheit

Zwei Quellen, kombiniert. Bei zwanzig Nutzern ist statistisch alles selten — ohne den gepflegten Grundwert wäre die Empfehlung im Prototyp nicht vorführbar.

**Files:**
- Create: `supabase/migrations/<timestamp>_stats.sql`
- Create: `server/utils/rarity.ts`
- Create: `tests/unit/rarity.test.ts`
- Create: `tests/db/stats.test.ts`

**Interfaces:**
- Consumes: Tabellen aus Task 9
- Produces:
  - View `user_catalog_entries` — `user_id`, `catalog_item_id`, `year`, `kind` (`gear|consumable|wish`), `created_at`
  - View `catalog_item_stats` — `catalog_item_id`, `line_id`, `owner_count`, `wish_count`
  - `BASE_WEIGHTS: Record<RarityBase, number>`
  - `MEASURED_CONFIDENCE_USERS: number`
  - `measuredWeight(ownerCount: number, totalUsers: number): number`
  - `rarityWeight(base: RarityBase, ownerCount: number, totalUsers: number): number`

- [ ] **Step 1: Den fehlschlagenden Unit-Test schreiben**

`tests/unit/rarity.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { BASE_WEIGHTS, measuredWeight, rarityWeight } from '../../server/utils/rarity'

describe('BASE_WEIGHTS', () => {
  it('steigt von Massenware zu rar', () => {
    expect(BASE_WEIGHTS.mass).toBeLessThan(BASE_WEIGHTS.common)
    expect(BASE_WEIGHTS.common).toBeLessThan(BASE_WEIGHTS.special)
    expect(BASE_WEIGHTS.special).toBeLessThan(BASE_WEIGHTS.rare)
  })
})

describe('measuredWeight', () => {
  it('bewertet ein Gerät, das fast alle haben, als wertlos', () => {
    // 400 von 500 - als Signal wertlos.
    expect(measuredWeight(400, 500)).toBeLessThan(0.3)
  })

  it('bewertet ein Gerät, das drei Leute haben, als hochinteressant', () => {
    expect(measuredWeight(3, 500)).toBeGreaterThan(1)
  })

  it('fällt monoton mit der Verbreitung', () => {
    const weights = [1, 10, 100, 400].map((count) => measuredWeight(count, 500))
    expect(weights).toEqual([...weights].sort((a, b) => b - a))
  })

  it('stürzt bei null Nutzern nicht ab', () => {
    expect(Number.isFinite(measuredWeight(0, 0))).toBe(true)
  })
})

describe('rarityWeight', () => {
  it('folgt bei wenigen Nutzern dem Grundwert', () => {
    // 20 Nutzer: die Messung laeuft leer, der Grundwert traegt.
    const mass = rarityWeight('mass', 1, 20)
    const rare = rarityWeight('rare', 1, 20)
    expect(rare).toBeGreaterThan(mass)
    expect(mass).toBeLessThan(0.5)
  })

  it('lässt den Grundwert bei vielen Nutzern von der Messung überlagern', () => {
    // Ein Boss DS-1 mit Grundwert "mass", den aber nur 2 von 2000 haben:
    // die Messung gewinnt.
    const measured = rarityWeight('mass', 2, 2000)
    expect(measured).toBeGreaterThan(BASE_WEIGHTS.mass * 2)
  })

  it('ignoriert die Messung vollständig, wenn es keine Nutzer gibt', () => {
    expect(rarityWeight('special', 0, 0)).toBeCloseTo(BASE_WEIGHTS.special)
  })

  it('liefert nie einen negativen Wert', () => {
    for (const base of ['mass', 'common', 'special', 'rare'] as const) {
      for (const [owners, users] of [[0, 0], [1, 1], [500, 500], [0, 1000]] as const) {
        expect(rarityWeight(base, owners, users)).toBeGreaterThanOrEqual(0)
      }
    }
  })
})
```

- [ ] **Step 2: Test laufen lassen — er muss fehlschlagen**

Run: `yarn test tests/unit/rarity.test.ts`
Expected: FAIL — Modul nicht gefunden.

- [ ] **Step 3: `server/utils/rarity.ts` implementieren**

```ts
export type RarityBase = 'mass' | 'common' | 'special' | 'rare'

/**
 * Gepflegter Grundwert am Katalog-Eintrag. Bei wenigen Nutzern ist statistisch
 * alles selten - ohne diesen Wert waere die Empfehlung im Prototyp nicht
 * vorfuehrbar. Ein Boss DS-1 ist Massenware, egal was 20 Nutzer sagen.
 */
export const BASE_WEIGHTS: Record<RarityBase, number> = {
  mass: 0.25,
  common: 0.5,
  special: 1.0,
  rare: 1.5,
}

/** Obergrenze, damit gemessen und gepflegt auf derselben Skala liegen. */
const MAX_WEIGHT = 1.5

/** Ab so vielen Nutzern traegt die Messung allein. */
export const MEASURED_CONFIDENCE_USERS = 200

/**
 * Inverse Haeufigkeit: haben es 400 von 500, ist es als Signal wertlos;
 * haben es 3, ist es hochinteressant.
 */
export function measuredWeight(ownerCount: number, totalUsers: number): number {
  if (totalUsers <= 0) return BASE_WEIGHTS.common
  const inverseFrequency = Math.log(1 + totalUsers / (1 + ownerCount))
  const maximum = Math.log(1 + totalUsers)
  if (maximum <= 0) return BASE_WEIGHTS.common
  return (inverseFrequency / maximum) * MAX_WEIGHT
}

/**
 * Blendet den gepflegten Grundwert in die Messung ueber. Solange wenige
 * Nutzer da sind, traegt der Grundwert; sobald genug Daten vorliegen,
 * ueberlagert der gemessene Wert ihn.
 */
export function rarityWeight(base: RarityBase, ownerCount: number, totalUsers: number): number {
  const confidence = Math.min(1, Math.max(0, totalUsers / MEASURED_CONFIDENCE_USERS))
  const blended =
    (1 - confidence) * BASE_WEIGHTS[base] + confidence * measuredWeight(ownerCount, totalUsers)
  return Math.max(0, blended)
}
```

- [ ] **Step 4: Unit-Test laufen lassen — er muss bestehen**

Run: `yarn test tests/unit/rarity.test.ts`
Expected: PASS, 9 Tests.

- [ ] **Step 5: Den fehlschlagenden DB-Test schreiben**

`tests/db/stats.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { adminClient } from '../helpers/supabase'
import { createTestUser, deleteTestUsers, type TestUser } from '../helpers/testUser'

const admin = adminClient()

let alice: TestUser
let bob: TestUser
let stratId: string
let klonId: string
let slinkyId: string

async function catalogId(name: string): Promise<string> {
  const { data } = await admin.from('catalog_items').select('id').eq('name', name).single()
  return data!.id
}

beforeAll(async () => {
  alice = await createTestUser('Alice Ampeg')
  bob = await createTestUser('Bob Bassman')
  stratId = await catalogId('Stratocaster')
  klonId = await catalogId('Centaur')
  slinkyId = await catalogId('Regular Slinky')

  await alice.client.from('gear_items').insert([
    { owner_id: alice.id, catalog_item_id: stratId },
    { owner_id: alice.id, catalog_item_id: klonId },
  ])
  await bob.client.from('gear_items').insert({ owner_id: bob.id, catalog_item_id: stratId })
  await alice.client.from('preferences').insert({ user_id: alice.id, catalog_item_id: slinkyId })
  await bob.client.from('wishlist_items').insert({ user_id: bob.id, catalog_item_id: klonId })
})

afterAll(async () => {
  await deleteTestUsers()
})

describe('user_catalog_entries', () => {
  it('fasst alle drei Arten zusammen', async () => {
    const { data } = await admin
      .from('user_catalog_entries')
      .select('kind')
      .in('user_id', [alice.id, bob.id])
    const kinds = new Set(data!.map((row: any) => row.kind))
    expect(kinds).toEqual(new Set(['gear', 'consumable', 'wish']))
  })
})

describe('catalog_item_stats', () => {
  it('zählt Besitzer über beide Nutzer', async () => {
    const { data } = await admin
      .from('catalog_item_stats')
      .select('owner_count')
      .eq('catalog_item_id', stratId)
      .single()
    expect(Number(data!.owner_count)).toBeGreaterThanOrEqual(2)
  })

  it('zählt Wünsche getrennt von Besitz', async () => {
    const { data } = await admin
      .from('catalog_item_stats')
      .select('owner_count, wish_count')
      .eq('catalog_item_id', klonId)
      .single()
    expect(Number(data!.owner_count)).toBeGreaterThanOrEqual(1)
    expect(Number(data!.wish_count)).toBeGreaterThanOrEqual(1)
  })

  it('liefert auch für Einträge ohne Besitzer eine Zeile', async () => {
    const { data: unused } = await admin
      .from('catalog_items')
      .select('id')
      .eq('name', 'White Falcon')
      .single()
    const { data } = await admin
      .from('catalog_item_stats')
      .select('owner_count')
      .eq('catalog_item_id', unused!.id)
      .single()
    expect(Number(data!.owner_count)).toBe(0)
  })
})
```

- [ ] **Step 6: Migration anlegen und schreiben**

```bash
yarn db:new stats
```

```sql
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
```

- [ ] **Step 7: Migration einspielen und Tests laufen lassen**

```bash
yarn db:push
yarn test tests/db/stats.test.ts
```
Expected: PASS, 4 Tests.

- [ ] **Step 8: Advisor prüfen**

Supabase-MCP `get_advisors` mit `type: "security"`. Es darf **kein** Hinweis auf eine `SECURITY DEFINER`-View erscheinen — genau dafür steht `security_invoker = on` in der Migration.

- [ ] **Step 9: Commit**

```bash
git add supabase/migrations server/utils/rarity.ts tests/
git commit -m "feat(rarity): Seltenheit aus Grundwert und Messung"
```

---

## Task 13: Empfehlungs-Scoring

Das Stück, an dem das ganze Konzept hängt: seltener und präziser gleich stärker verbunden. Weiterhin reine Funktionen — die Rigs kommen als Argument herein.

**Files:**
- Create: `server/utils/scoring.ts`
- Create: `tests/unit/scoring.test.ts`

**Interfaces:**
- Consumes: `rarityWeight` aus Task 12 (nur als Zahl übergeben, nicht importiert)
- Produces:
  - `export type MatchKind = 'gear' | 'consumable' | 'wish'`
  - `export type MatchDepth = 'line' | 'variant' | 'variant_year'`
  - `export interface OwnedEntry { catalogItemId: string; lineId: string; year: number | null; kind: 'gear' | 'consumable' }`
  - `export interface WishEntry { catalogItemId: string; lineId: string }`
  - `export interface UserRig { userId: string; owned: OwnedEntry[]; wished: WishEntry[] }`
  - `export interface SharedMatch { kind: MatchKind; depth: MatchDepth; catalogItemId: string; lineId: string; score: number }`
  - `KIND_WEIGHTS`, `DEPTH_WEIGHTS`, `COMBO_FACTOR`
  - `matchDepth(a, b): MatchDepth | null`
  - `matchScore(kind, depth, rarity): number`
  - `pairScore(matches: SharedMatch[]): number`
  - `comparePair(me: UserRig, other: UserRig, rarityOf: (catalogItemId: string) => number): { score: number; matches: SharedMatch[] }`

- [ ] **Step 1: Den fehlschlagenden Test schreiben**

`tests/unit/scoring.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  COMBO_FACTOR,
  comparePair,
  matchDepth,
  matchScore,
  pairScore,
  type OwnedEntry,
  type UserRig,
} from '../../server/utils/scoring'

function gear(catalogItemId: string, lineId: string, year: number | null = null): OwnedEntry {
  return { catalogItemId, lineId, year, kind: 'gear' }
}

function consumable(catalogItemId: string): OwnedEntry {
  return { catalogItemId, lineId: catalogItemId, year: null, kind: 'consumable' }
}

function rig(userId: string, owned: OwnedEntry[], wished: { catalogItemId: string; lineId: string }[] = []): UserRig {
  return { userId, owned, wished }
}

const flatRarity = () => 1

describe('matchDepth — die Tabelle aus Abschnitt 6', () => {
  it('Strat / Strat trifft auf der Modell-Linie', () => {
    expect(matchDepth(gear('strat', 'strat'), gear('strat', 'strat'))).toBe('line')
  })

  it('American Pro II / Strat trifft auf der Modell-Linie', () => {
    expect(matchDepth(gear('ampro', 'strat'), gear('strat', 'strat'))).toBe('line')
  })

  it('American Pro II / American Pro II trifft auf der Ausführung', () => {
    expect(matchDepth(gear('ampro', 'strat'), gear('ampro', 'strat'))).toBe('variant')
  })

  it('gleiche Ausführung mit gleichem Baujahr trifft am tiefsten', () => {
    expect(matchDepth(gear('ampro', 'strat', 1963), gear('ampro', 'strat', 1963))).toBe('variant_year')
  })

  it('gleiche Ausführung mit verschiedenem Baujahr bleibt auf der Ausführung', () => {
    expect(matchDepth(gear('ampro', 'strat', 1963), gear('ampro', 'strat', 2021))).toBe('variant')
  })

  it('verschiedene Modell-Linien treffen sich nicht', () => {
    expect(matchDepth(gear('strat', 'strat'), gear('lp', 'lp'))).toBeNull()
  })
})

describe('matchScore', () => {
  it('steigt mit der Tiefe', () => {
    expect(matchScore('gear', 'line', 1)).toBeLessThan(matchScore('gear', 'variant', 1))
    expect(matchScore('gear', 'variant', 1)).toBeLessThan(matchScore('gear', 'variant_year', 1))
  })

  it('steigt mit der Seltenheit', () => {
    expect(matchScore('gear', 'variant', 0.25)).toBeLessThan(matchScore('gear', 'variant', 1.5))
  })

  it('gewichtet Verbrauchsmaterial niedriger als Equipment', () => {
    // "Wir spielen beide Ernie Ball Slinky" ist ein starker Identitaets-Marker,
    // aber ein schwaches Uebereinstimmungs-Signal.
    expect(matchScore('consumable', 'line', 1)).toBeLessThan(matchScore('gear', 'line', 1))
  })

  it('gewichtet einen Wunsch zwischen Verbrauchsmaterial und Equipment', () => {
    expect(matchScore('wish', 'line', 1)).toBeGreaterThan(matchScore('consumable', 'line', 1))
    expect(matchScore('wish', 'line', 1)).toBeLessThan(matchScore('gear', 'line', 1))
  })
})

describe('pairScore', () => {
  it('ist bei einem einzelnen Treffer die Summe', () => {
    const single = [{ kind: 'gear', depth: 'variant', catalogItemId: 'a', lineId: 'a', score: 1 }] as const
    expect(pairScore([...single])).toBeCloseTo(1)
  })

  it('belohnt Kombinationen überproportional', () => {
    // "Ihr fahrt beide einen Tube Screamer in einen Deluxe Reverb" ist eine
    // andere Aussage als zwei zufaellige Einzeltreffer.
    const two = [
      { kind: 'gear', depth: 'variant', catalogItemId: 'ts', lineId: 'ts', score: 1 },
      { kind: 'gear', depth: 'variant', catalogItemId: 'dr', lineId: 'dr', score: 1 },
    ] as const
    expect(pairScore([...two])).toBeGreaterThan(2)
    expect(pairScore([...two])).toBeCloseTo(2 + COMBO_FACTOR * 2)
  })

  it('gibt keinen Kombinations-Bonus für Verbrauchsmaterial allein', () => {
    const consumables = [
      { kind: 'consumable', depth: 'line', catalogItemId: 's1', lineId: 's1', score: 0.3 },
      { kind: 'consumable', depth: 'line', catalogItemId: 's2', lineId: 's2', score: 0.3 },
    ] as const
    expect(pairScore([...consumables])).toBeCloseTo(0.6)
  })

  it('ist null ohne Treffer', () => {
    expect(pairScore([])).toBe(0)
  })
})

describe('comparePair', () => {
  it('findet den geteilten Treffer', () => {
    const me = rig('me', [gear('ac30', 'ac30')])
    const other = rig('other', [gear('ac30', 'ac30')])
    const result = comparePair(me, other, flatRarity)
    expect(result.matches).toHaveLength(1)
    expect(result.matches[0]!.catalogItemId).toBe('ac30')
    expect(result.score).toBeGreaterThan(0)
  })

  it('zählt eine Modell-Linie nur einmal, auch bei mehreren Exemplaren', () => {
    // Wer drei Strats hat, ist nicht dreimal so verbunden.
    const me = rig('me', [gear('ampro', 'strat'), gear('player', 'strat'), gear('strat', 'strat')])
    const other = rig('other', [gear('strat', 'strat')])
    expect(comparePair(me, other, flatRarity).matches).toHaveLength(1)
  })

  it('nimmt bei mehreren Möglichkeiten den tiefsten Treffer', () => {
    const me = rig('me', [gear('ampro', 'strat')])
    const other = rig('other', [gear('strat', 'strat'), gear('ampro', 'strat')])
    expect(comparePair(me, other, flatRarity).matches[0]!.depth).toBe('variant')
  })

  it('erkennt "du hast, was ich suche"', () => {
    const me = rig('me', [], [{ catalogItemId: 'klon', lineId: 'klon' }])
    const other = rig('other', [gear('klon', 'klon')])
    const result = comparePair(me, other, flatRarity)
    expect(result.matches[0]!.kind).toBe('wish')
  })

  it('erkennt die Gegenrichtung ebenso', () => {
    const me = rig('me', [gear('klon', 'klon')])
    const other = rig('other', [], [{ catalogItemId: 'klon', lineId: 'klon' }])
    expect(comparePair(me, other, flatRarity).matches[0]!.kind).toBe('wish')
  })

  it('gewichtet seltene Treffer stärker', () => {
    const me = rig('me', [gear('klon', 'klon')])
    const other = rig('other', [gear('klon', 'klon')])
    const rare = comparePair(me, other, () => 1.5).score
    const common = comparePair(me, other, () => 0.25).score
    expect(rare).toBeGreaterThan(common)
  })

  it('ist null bei leeren Rigs', () => {
    expect(comparePair(rig('me', []), rig('other', []), flatRarity).score).toBe(0)
  })

  it('ist null ohne Überschneidung', () => {
    const me = rig('me', [gear('strat', 'strat')])
    const other = rig('other', [gear('lp', 'lp')])
    expect(comparePair(me, other, flatRarity).score).toBe(0)
  })
})
```

- [ ] **Step 2: Test laufen lassen — er muss fehlschlagen**

Run: `yarn test tests/unit/scoring.test.ts`
Expected: FAIL — Modul nicht gefunden.

- [ ] **Step 3: `server/utils/scoring.ts` implementieren**

```ts
export type MatchKind = 'gear' | 'consumable' | 'wish'
export type MatchDepth = 'line' | 'variant' | 'variant_year'

export interface OwnedEntry {
  catalogItemId: string
  /** parent_id ?? id - die Modell-Linie. */
  lineId: string
  year: number | null
  kind: 'gear' | 'consumable'
}

export interface WishEntry {
  catalogItemId: string
  lineId: string
}

export interface UserRig {
  userId: string
  owned: OwnedEntry[]
  wished: WishEntry[]
}

export interface SharedMatch {
  kind: MatchKind
  depth: MatchDepth
  catalogItemId: string
  lineId: string
  score: number
}

/**
 * Verbrauchsmaterial ist ein starker Identitaets-Marker, aber ein schwaches
 * Uebereinstimmungs-Signal: es gibt nur ein paar Dutzend gaengige Saitensaetze.
 */
export const KIND_WEIGHTS: Record<MatchKind, number> = {
  gear: 1,
  consumable: 0.3,
  wish: 0.7,
}

/** Der Ungenauere zieht den Treffer herunter. */
export const DEPTH_WEIGHTS: Record<MatchDepth, number> = {
  line: 0.4,
  variant: 1,
  variant_year: 1.6,
}

/**
 * Prototyp-Naeherung fuer "Kombinationen wiegen schwerer": je mehr Geraete
 * zwei Leute teilen, desto ueberproportionaler der Wert. Das echte
 * Signalketten-Matching ("Tube Screamer in Deluxe Reverb" als Paar) braucht
 * einen Vergleich ueber installed_in und ist bewusst zurueckgestellt.
 */
export const COMBO_FACTOR = 0.15

export function matchDepth(a: OwnedEntry, b: OwnedEntry): MatchDepth | null {
  if (a.catalogItemId === b.catalogItemId) {
    // Beide auf der Modell-Linie: Strat und Strat ist ein schwaches Signal,
    // auch wenn die ids gleich sind.
    const isVariant = a.lineId !== a.catalogItemId
    if (!isVariant) return 'line'
    if (a.year !== null && a.year === b.year) return 'variant_year'
    return 'variant'
  }
  if (a.lineId === b.lineId) return 'line'
  return null
}

export function matchScore(kind: MatchKind, depth: MatchDepth, rarity: number): number {
  return rarity * DEPTH_WEIGHTS[depth] * KIND_WEIGHTS[kind]
}

export function pairScore(matches: SharedMatch[]): number {
  const base = matches.reduce((sum, match) => sum + match.score, 0)
  const gearCount = matches.filter((match) => match.kind === 'gear').length
  const combo = gearCount >= 2 ? COMBO_FACTOR * base * (gearCount - 1) : 0
  return base + combo
}

/** Eine geteilte Modell-Linie zaehlt einmal, auf der tiefsten erreichten Ebene. */
function keepBest(matches: SharedMatch[]): SharedMatch[] {
  const best = new Map<string, SharedMatch>()
  for (const match of matches) {
    const key = `${match.kind}::${match.lineId}`
    const current = best.get(key)
    if (!current || match.score > current.score) best.set(key, match)
  }
  return [...best.values()]
}

export function comparePair(
  me: UserRig,
  other: UserRig,
  rarityOf: (catalogItemId: string) => number,
): { score: number; matches: SharedMatch[] } {
  const found: SharedMatch[] = []

  for (const mine of me.owned) {
    for (const theirs of other.owned) {
      const depth = matchDepth(mine, theirs)
      if (depth === null) continue
      const kind: MatchKind =
        mine.kind === 'consumable' || theirs.kind === 'consumable' ? 'consumable' : 'gear'
      const catalogItemId = depth === 'line' ? mine.lineId : mine.catalogItemId
      found.push({
        kind,
        depth,
        catalogItemId,
        lineId: mine.lineId,
        score: matchScore(kind, depth, rarityOf(catalogItemId)),
      })
    }
  }

  // Der zweite Verbindungstyp: du hast, was ich suche - in beide Richtungen.
  const wishPairs: [WishEntry, OwnedEntry][] = [
    ...me.wished.flatMap((wish) => other.owned.map((own) => [wish, own] as [WishEntry, OwnedEntry])),
    ...other.wished.flatMap((wish) => me.owned.map((own) => [wish, own] as [WishEntry, OwnedEntry])),
  ]

  for (const [wish, own] of wishPairs) {
    const asOwned: OwnedEntry = { ...wish, year: null, kind: 'gear' }
    const depth = matchDepth(asOwned, own)
    if (depth === null) continue
    const catalogItemId = depth === 'line' ? wish.lineId : wish.catalogItemId
    found.push({
      kind: 'wish',
      depth,
      catalogItemId,
      lineId: wish.lineId,
      score: matchScore('wish', depth, rarityOf(catalogItemId)),
    })
  }

  const matches = keepBest(found).sort((a, b) => b.score - a.score)
  return { score: pairScore(matches), matches }
}
```

- [ ] **Step 4: Tests laufen lassen — sie müssen bestehen**

Run: `yarn test tests/unit/scoring.test.ts`
Expected: PASS, 22 Tests.

- [ ] **Step 5: Commit**

```bash
git add server/utils/scoring.ts tests/unit/scoring.test.ts
git commit -m "feat(recommendations): Scoring nach Seltenheit und Trefferschaerfe"
```

---

## Task 14: Empfehlungen und Startseite

Die Auszahlung. Jeder Vorschlag nennt seinen Grund — wer die Mechanik versteht, pflegt seine Liste; wer sie für Zufall hält, tut es nie.

**Files:**
- Create: `server/api/recommendations.get.ts`
- Create: `app/composables/useRecommendationReason.ts`
- Create: `app/components/PersonSuggestion.vue`
- Create: `app/pages/index.vue`
- Modify: `app/locales/de.ts`
- Create: `tests/api/recommendations.test.ts`

**Interfaces:**
- Consumes: `comparePair`, `UserRig` aus Task 13; `rarityWeight` aus Task 12; Views aus Task 12
- Produces:
  - `GET /api/recommendations?limit=` → `{ fallback: boolean; suggestions: Suggestion[] }`
  - `export interface Suggestion { userId: string; displayName: string; avatarPath: string | null; score: number; matchCount: number; reason: SuggestionReason | null }`
  - `export interface SuggestionReason { kind: MatchKind; depth: MatchDepth; catalogItemId: string; brandName: string; name: string }`
  - `useRecommendationReason(reason, matchCount): string`

- [ ] **Step 1: Texte ergänzen**

Die Begründungen kommen ohne Artikel aus — das Geschlecht eines beliebigen Gerätenamens kennt niemand.

```ts
  suggestions: {
    title: 'Leute, die dasselbe spielen',
    reasonKind: {
      gear: 'Spielt auch',
      consumable: 'Benutzt auch',
      wish: 'Hat, was du suchst',
    },
    reasonDepth: {
      line: '',
      variant: 'genau diese Ausführung',
      variant_year: 'diese Ausführung, sogar aus demselben Baujahr',
    },
    reasonMore: 'und weitere Übereinstimmungen: {count}',
    emptyTitle: 'Hier ist noch nichts.',
    // Die Leere erklaeren statt kaschieren.
    emptyBody:
      'Du siehst gerade Zufälliges. Trag dein Equipment ein, dann stehen hier Leute, die dasselbe spielen.',
    emptyCta: 'Equipment eintragen',
    fallbackBadge: 'Zufällig ausgewählt',
    refineHint:
      'Je vollständiger dein Rig, desto genauer diese Vorschläge. Seltene Geräte zählen mehr als verbreitete.',
  },
```

- [ ] **Step 2: Den fehlschlagenden Test schreiben**

`tests/api/recommendations.test.ts`. Der Test meldet sich als echter Nutzer an und schickt dessen Token mit.

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { adminClient } from '../helpers/supabase'
import { createTestUser, deleteTestUsers, type TestUser } from '../helpers/testUser'

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3000'
const admin = adminClient()

let alice: TestUser
let bob: TestUser
let carol: TestUser

async function catalogId(name: string): Promise<string> {
  const { data } = await admin.from('catalog_items').select('id').eq('name', name).single()
  return data!.id
}

async function recommendationsFor(user: TestUser): Promise<any> {
  const { data } = await user.client.auth.getSession()
  const response = await fetch(`${BASE}/api/recommendations`, {
    headers: { Authorization: `Bearer ${data.session!.access_token}` },
  })
  expect(response.ok).toBe(true)
  return response.json()
}

beforeAll(async () => {
  alice = await createTestUser('Alice Ampeg')
  bob = await createTestUser('Bob Bassman')
  carol = await createTestUser('Carol Cabinet')

  const klon = await catalogId('Centaur')
  const ds1 = await catalogId('DS-1 Distortion')
  const ac30 = await catalogId('AC30')

  // Alice und Bob teilen ein rares Pedal, Alice und Carol nur Massenware.
  await alice.client.from('gear_items').insert([
    { owner_id: alice.id, catalog_item_id: klon },
    { owner_id: alice.id, catalog_item_id: ds1 },
    { owner_id: alice.id, catalog_item_id: ac30 },
  ])
  await bob.client.from('gear_items').insert([
    { owner_id: bob.id, catalog_item_id: klon },
    { owner_id: bob.id, catalog_item_id: ac30 },
  ])
  await carol.client.from('gear_items').insert({ owner_id: carol.id, catalog_item_id: ds1 })
})

afterAll(async () => {
  await deleteTestUsers()
})

describe('GET /api/recommendations', () => {
  it('verlangt eine Anmeldung', async () => {
    const response = await fetch(`${BASE}/api/recommendations`)
    expect(response.status).toBe(401)
  })

  it('stellt den stärkeren Treffer nach vorne', async () => {
    // Bob teilt ein rares Pedal plus einen Amp, Carol nur Massenware.
    const body = await recommendationsFor(alice)
    const ids = body.suggestions.map((s: any) => s.userId)
    expect(ids.indexOf(bob.id)).toBeLessThan(ids.indexOf(carol.id))
  })

  it('nennt zu jedem Vorschlag einen Grund', async () => {
    const body = await recommendationsFor(alice)
    for (const suggestion of body.suggestions) {
      expect(suggestion.reason).not.toBeNull()
      expect(suggestion.reason.name).toBeTruthy()
      expect(suggestion.reason.brandName).toBeTruthy()
    }
  })

  it('schlägt einen nicht selbst vor', async () => {
    const body = await recommendationsFor(alice)
    expect(body.suggestions.map((s: any) => s.userId)).not.toContain(alice.id)
  })

  it('meldet keinen Ersatzmodus, wenn es echte Treffer gibt', async () => {
    const body = await recommendationsFor(alice)
    expect(body.fallback).toBe(false)
  })

  it('fällt bei leerem Rig auf Zufall zurück und sagt das', async () => {
    // Der haeufigste Tod eines sozialen Prototyps ist der leere Bildschirm.
    const newbie = await createTestUser('Neuling')
    const body = await recommendationsFor(newbie)
    expect(body.fallback).toBe(true)
    expect(body.suggestions.length).toBeGreaterThan(0)
    expect(body.suggestions[0].reason).toBeNull()
  })
})
```

- [ ] **Step 3: Test laufen lassen — er muss fehlschlagen**

```bash
yarn dev
yarn test:api tests/api/recommendations.test.ts
```
Expected: FAIL — 404 auf `/api/recommendations`.

- [ ] **Step 4: Route implementieren**

`server/api/recommendations.get.ts`:

```ts
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { rarityWeight, type RarityBase } from '../utils/rarity'
import { comparePair, type MatchDepth, type MatchKind, type OwnedEntry, type UserRig, type WishEntry } from '../utils/scoring'

export interface SuggestionReason {
  kind: MatchKind
  depth: MatchDepth
  catalogItemId: string
  brandName: string
  name: string
}

export interface Suggestion {
  userId: string
  displayName: string
  avatarPath: string | null
  score: number
  matchCount: number
  reason: SuggestionReason | null
}

interface EntryRow {
  user_id: string
  catalog_item_id: string
  year: number | null
  kind: 'gear' | 'consumable' | 'wish'
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Nicht angemeldet' })

  const limit = Math.min(50, Math.max(1, Number(getQuery(event).limit) || 12))
  // Aggregation ueber alle Nutzer - das rechnet der Browser nicht.
  const admin = serverSupabaseServiceRole(event)

  const [{ count: totalUsers }, { data: catalog }, { data: entries }] = await Promise.all([
    admin.from('profiles').select('id', { count: 'exact', head: true }),
    admin.from('catalog_items').select('id, name, line_id, rarity_base, brands ( name )'),
    admin.from('user_catalog_entries').select('user_id, catalog_item_id, year, kind'),
  ])

  const catalogById = new Map(
    (catalog ?? []).map((row: any) => [
      row.id,
      {
        id: row.id as string,
        name: row.name as string,
        lineId: row.line_id as string,
        rarityBase: row.rarity_base as RarityBase,
        brandName: (row.brands?.name ?? '') as string,
      },
    ]),
  )

  const ownerCounts = new Map<string, Set<string>>()
  for (const row of (entries ?? []) as EntryRow[]) {
    if (row.kind === 'wish') continue
    const owners = ownerCounts.get(row.catalog_item_id) ?? new Set<string>()
    owners.add(row.user_id)
    ownerCounts.set(row.catalog_item_id, owners)
  }

  const rarityCache = new Map<string, number>()
  function rarityOf(catalogItemId: string): number {
    const cached = rarityCache.get(catalogItemId)
    if (cached !== undefined) return cached
    const item = catalogById.get(catalogItemId)
    const weight = rarityWeight(
      item?.rarityBase ?? 'common',
      ownerCounts.get(catalogItemId)?.size ?? 0,
      totalUsers ?? 0,
    )
    rarityCache.set(catalogItemId, weight)
    return weight
  }

  const rigs = new Map<string, UserRig>()
  for (const row of (entries ?? []) as EntryRow[]) {
    const item = catalogById.get(row.catalog_item_id)
    if (!item) continue
    const rig = rigs.get(row.user_id) ?? { userId: row.user_id, owned: [], wished: [] }
    if (row.kind === 'wish') {
      rig.wished.push({ catalogItemId: row.catalog_item_id, lineId: item.lineId } satisfies WishEntry)
    } else {
      rig.owned.push({
        catalogItemId: row.catalog_item_id,
        lineId: item.lineId,
        year: row.year,
        kind: row.kind,
      } satisfies OwnedEntry)
    }
    rigs.set(row.user_id, rig)
  }

  const me = rigs.get(user.id) ?? { userId: user.id, owned: [], wished: [] }
  const hasRig = me.owned.length > 0 || me.wished.length > 0

  const scored: { userId: string; score: number; matchCount: number; reason: SuggestionReason | null }[] = []
  if (hasRig) {
    for (const [otherId, otherRig] of rigs) {
      if (otherId === user.id) continue
      const { score, matches } = comparePair(me, otherRig, rarityOf)
      if (score <= 0) continue
      const top = matches[0]!
      const item = catalogById.get(top.catalogItemId)
      scored.push({
        userId: otherId,
        score,
        matchCount: matches.length,
        // Jeder Vorschlag nennt seinen Grund.
        reason: {
          kind: top.kind,
          depth: top.depth,
          catalogItemId: top.catalogItemId,
          brandName: item?.brandName ?? '',
          name: item?.name ?? '',
        },
      })
    }
    scored.sort((a, b) => b.score - a.score)
  }

  // Wird es duenn, fuellt die Seite mit Zufall auf - immer gekennzeichnet.
  const fallback = scored.length === 0
  if (fallback) {
    const { data: others } = await admin
      .from('profiles')
      .select('id')
      .neq('id', user.id)
      .limit(limit * 3)
    const shuffled = (others ?? []).sort(() => Math.random() - 0.5).slice(0, limit)
    for (const row of shuffled) {
      scored.push({ userId: row.id, score: 0, matchCount: 0, reason: null })
    }
  }

  const top = scored.slice(0, limit)
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, display_name, avatar_path')
    .in('id', top.map((row) => row.userId))

  const profileById = new Map((profiles ?? []).map((row: any) => [row.id, row]))

  const suggestions: Suggestion[] = top.map((row) => ({
    userId: row.userId,
    displayName: profileById.get(row.userId)?.display_name ?? '',
    avatarPath: profileById.get(row.userId)?.avatar_path ?? null,
    score: row.score,
    matchCount: row.matchCount,
    reason: row.reason,
  }))

  return { fallback, suggestions }
})
```

- [ ] **Step 5: Begründung in einen deutschen Satz übersetzen**

`app/composables/useRecommendationReason.ts`:

```ts
interface SuggestionReason {
  kind: 'gear' | 'consumable' | 'wish'
  depth: 'line' | 'variant' | 'variant_year'
  brandName: string
  name: string
}

/**
 * Bewusst ohne Artikel: das Geschlecht eines beliebigen Geraetenamens
 * kennt niemand, und "einen AC30" laesst sich nicht generieren.
 */
export function useRecommendationReason(reason: SuggestionReason | null, matchCount: number): string {
  const t = useText()
  if (!reason) return t.suggestions.fallbackBadge

  const label = `${reason.brandName} ${reason.name}`.trim()
  const depth = t.suggestions.reasonDepth[reason.depth]
  const head = `${t.suggestions.reasonKind[reason.kind]}: ${label}`
  const withDepth = depth === '' ? head : `${head} — ${depth}`
  return matchCount > 1
    ? `${withDepth}. ${t.suggestions.reasonMore.replace('{count}', String(matchCount - 1))}`
    : withDepth
}
```

- [ ] **Step 6: `PersonSuggestion.vue` schreiben**

```vue
<script setup lang="ts">
const props = defineProps<{
  userId: string
  displayName: string
  reason: any | null
  matchCount: number
}>()

const t = useText()
const text = computed(() => useRecommendationReason(props.reason, props.matchCount))
</script>

<template>
  <NuxtLink :to="`/profile/${userId}`" class="flex flex-col gap-1 rounded border p-4">
    <span class="text-f-lg font-medium">{{ displayName }}</span>
    <span class="text-sm text-neutral-600">{{ text }}</span>
    <span v-if="!reason" class="text-xs text-neutral-400">{{ t.suggestions.fallbackBadge }}</span>
  </NuxtLink>
</template>
```

- [ ] **Step 7: `app/pages/index.vue` schreiben**

```vue
<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const t = useText()
const { data } = await useFetch<{ fallback: boolean; suggestions: any[] }>('/api/recommendations')
</script>

<template>
  <div class="flex flex-col gap-f-8">
    <h1 class="text-f-4xl font-semibold">{{ t.suggestions.title }}</h1>

    <!-- Die Leere erklaeren statt kaschieren: der leere Zustand bringt der
         App ihr eigenes Prinzip bei. -->
    <div v-if="data?.fallback" class="rounded border border-dashed p-4">
      <p class="mb-2 font-medium">{{ t.suggestions.emptyTitle }}</p>
      <p class="mb-4 text-neutral-600">{{ t.suggestions.emptyBody }}</p>
      <NuxtLink to="/onboarding" class="rounded bg-neutral-900 px-4 py-2 text-white">
        {{ t.suggestions.emptyCta }}
      </NuxtLink>
    </div>
    <p v-else class="text-sm text-neutral-500">{{ t.suggestions.refineHint }}</p>

    <div class="grid gap-4 sm:grid-cols-2">
      <PersonSuggestion
        v-for="suggestion in data?.suggestions ?? []"
        :key="suggestion.userId"
        :user-id="suggestion.userId"
        :display-name="suggestion.displayName"
        :reason="suggestion.reason"
        :match-count="suggestion.matchCount"
      />
    </div>
  </div>
</template>
```

- [ ] **Step 8: Tests laufen lassen — sie müssen bestehen**

```bash
yarn dev
yarn test:api tests/api/recommendations.test.ts
```
Expected: PASS, 6 Tests.

- [ ] **Step 9: Sprachtest und Bundle-Prüfung**

```bash
yarn test tests/unit/locale.test.ts
yarn build && grep -r "service_role" .output/public/ && echo "GEFUNDEN - Abbruch" || echo "sauber"
```
Expected: PASS und `sauber`.

- [ ] **Step 10: Commit**

```bash
git add server/api/recommendations.get.ts app/ tests/api/recommendations.test.ts
git commit -m "feat(recommendations): Vorschlaege mit Begruendung und erklaertem Leerzustand"
```

---

## Task 15: Gear-Seite und Sitemap

Die Seite, die das Konzept sichtbar macht — und die einzige ohne Login. Ihr Inhalt ist fast vollständig abgeleitet und damit billig.

**Files:**
- Create: `server/api/gear/[slug].get.ts`
- Create: `server/routes/sitemap.xml.ts`
- Create: `app/pages/gear/[slug].vue`
- Modify: `app/locales/de.ts`
- Modify: `public/robots.txt`
- Create: `tests/api/gear.test.ts`

**Interfaces:**
- Consumes: `rarityWeight` aus Task 12; View `catalog_item_stats` aus Task 12; `slug` aus Task 2
- Produces:
  - `GET /api/gear/:slug` → `GearPageData`
  - `export interface GearPageData { item: GearItemHead; line: GearItemRef | null; variants: GearVariant[]; stats: { ownerCount: number; wishCount: number; rarity: number }; players: GearPlayer[] | null }`
  - `export interface GearPlayer { userId: string; displayName: string; year: number | null; finish: string | null }`
  - `GET /sitemap.xml`
  - Seite `/gear/[slug]`

- [ ] **Step 1: Texte ergänzen**

```ts
  gearPage: {
    players: 'Wer spielt das',
    playersCount: 'Spieler: {count}',
    wishCount: 'Auf Wunschlisten: {count}',
    variants: 'Ausführungen',
    partOf: 'Gehört zu',
    unverified: 'Dieser Eintrag wurde von einem Nutzer angelegt und ist noch ungeprüft.',
    signInToSeePlayers: 'Melde dich an, um zu sehen, wer das spielt.',
    rarity: {
      mass: 'Massenware',
      common: 'verbreitet',
      special: 'speziell',
      rare: 'rar',
    },
    noPlayers: 'Hier hat es noch niemand eingetragen.',
  },
```

- [ ] **Step 2: Den fehlschlagenden Test schreiben**

`tests/api/gear.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { adminClient } from '../helpers/supabase'
import { createTestUser, deleteTestUsers, type TestUser } from '../helpers/testUser'

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3000'
const admin = adminClient()

let alice: TestUser
let stratSlug: string
let variantSlug: string

beforeAll(async () => {
  alice = await createTestUser('Alice Ampeg')

  const { data: strat } = await admin
    .from('catalog_items')
    .select('id, slug')
    .eq('name', 'Stratocaster')
    .single()
  stratSlug = strat!.slug

  const { data: variant } = await admin
    .from('catalog_items')
    .select('slug')
    .eq('name', 'Player Stratocaster')
    .single()
  variantSlug = variant!.slug

  await alice.client
    .from('gear_items')
    .insert({ owner_id: alice.id, catalog_item_id: strat!.id, year: 2018, finish: 'Sonic Blue' })
})

afterAll(async () => {
  await deleteTestUsers()
})

describe('GET /api/gear/:slug ohne Login', () => {
  it('liefert den Eintrag öffentlich', async () => {
    // Abschnitt 10: Gear-Seiten sind oeffentlich lesbar und auffindbar.
    const response = await fetch(`${BASE}/api/gear/${stratSlug}`)
    expect(response.ok).toBe(true)
    const body = await response.json()
    expect(body.item.name).toBe('Stratocaster')
    expect(body.item.brandName).toBe('Fender')
  })

  it('nennt die Zahl der Spieler, aber nicht die Namen', async () => {
    const body = await (await fetch(`${BASE}/api/gear/${stratSlug}`)).json()
    expect(body.stats.ownerCount).toBeGreaterThanOrEqual(1)
    expect(body.players).toBeNull()
  })

  it('listet die Ausführungen der Modell-Linie', async () => {
    const body = await (await fetch(`${BASE}/api/gear/${stratSlug}`)).json()
    expect(body.variants.length).toBeGreaterThan(0)
    expect(body.variants.some((v: any) => v.name === 'Player Stratocaster')).toBe(true)
  })

  it('verweist von einer Ausführung auf ihre Modell-Linie', async () => {
    const body = await (await fetch(`${BASE}/api/gear/${variantSlug}`)).json()
    expect(body.line.name).toBe('Stratocaster')
  })

  it('antwortet auf einen unbekannten Slug mit 404', async () => {
    const response = await fetch(`${BASE}/api/gear/gibt-es-nicht`)
    expect(response.status).toBe(404)
  })
})

describe('GET /api/gear/:slug mit Login', () => {
  it('nennt die Spieler beim Namen', async () => {
    const { data } = await alice.client.auth.getSession()
    const response = await fetch(`${BASE}/api/gear/${stratSlug}`, {
      headers: { Authorization: `Bearer ${data.session!.access_token}` },
    })
    const body = await response.json()
    expect(body.players).not.toBeNull()
    const me = body.players.find((p: any) => p.userId === alice.id)
    expect(me.displayName).toBe('Alice Ampeg')
    expect(me.year).toBe(2018)
  })
})

describe('GET /sitemap.xml', () => {
  it('listet Gear-Seiten', async () => {
    const response = await fetch(`${BASE}/sitemap.xml`)
    expect(response.ok).toBe(true)
    expect(response.headers.get('content-type')).toContain('xml')
    const xml = await response.text()
    expect(xml).toContain(`/gear/${stratSlug}`)
  })

  it('listet keine Profile', async () => {
    const xml = await (await fetch(`${BASE}/sitemap.xml`)).text()
    expect(xml).not.toContain('/profile/')
  })
})
```

- [ ] **Step 3: Test laufen lassen — er muss fehlschlagen**

```bash
yarn dev
yarn test:api tests/api/gear.test.ts
```
Expected: FAIL — 404 auf `/api/gear/...`.

- [ ] **Step 4: Route implementieren**

`server/api/gear/[slug].get.ts`. Die aggregierten Zahlen holt `service_role`, weil `catalog_item_stats` unter RLS läuft und ein Besucher ohne Login sonst überall null sähe.

```ts
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { rarityWeight, type RarityBase } from '../../utils/rarity'

export interface GearItemRef {
  id: string
  slug: string
  name: string
}

export interface GearPageData {
  item: {
    id: string
    slug: string
    name: string
    brandName: string
    categoryId: string
    level: 'line' | 'variant'
    rarityBase: RarityBase
    imagePath: string | null
    isVerified: boolean
  }
  line: GearItemRef | null
  variants: { id: string; slug: string; name: string; rarity_base: RarityBase }[]
  stats: { ownerCount: number; wishCount: number; rarity: number }
  players: GearPlayer[] | null
}

export interface GearPlayer {
  userId: string
  displayName: string
  year: number | null
  finish: string | null
}

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) throw createError({ statusCode: 400, statusMessage: 'Slug fehlt' })

  const admin = serverSupabaseServiceRole(event)

  const { data: item } = await admin
    .from('catalog_items')
    .select('id, slug, name, category_id, parent_id, line_id, rarity_base, image_path, is_verified, brands ( name )')
    .eq('slug', slug)
    .maybeSingle()

  if (!item) throw createError({ statusCode: 404, statusMessage: 'Nicht gefunden' })

  const [{ count: totalUsers }, { data: stats }, { data: variants }, { data: line }] = await Promise.all([
    admin.from('profiles').select('id', { count: 'exact', head: true }),
    admin
      .from('catalog_item_stats')
      .select('owner_count, wish_count')
      .eq('catalog_item_id', item.id)
      .maybeSingle(),
    admin
      .from('catalog_items')
      .select('id, slug, name, rarity_base')
      .eq('parent_id', item.line_id)
      .order('name'),
    item.parent_id
      ? admin.from('catalog_items').select('id, slug, name').eq('id', item.parent_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const ownerCount = Number(stats?.owner_count ?? 0)
  const wishCount = Number(stats?.wish_count ?? 0)

  // Die Spielerliste ist Profildaten und bleibt hinter dem Login. Die reine
  // Zahl darf oeffentlich sein - sie macht die Seite als Schaufenster erst gut.
  const user = await serverSupabaseUser(event).catch(() => null)
  let players: GearPlayer[] | null = null
  if (user) {
    const { data: rows } = await admin
      .from('gear_items')
      .select('owner_id, year, finish, profiles ( display_name )')
      .eq('catalog_item_id', item.id)
      .limit(50)
    players = (rows ?? []).map((row: any) => ({
      userId: row.owner_id,
      displayName: row.profiles?.display_name ?? '',
      year: row.year,
      finish: row.finish,
    }))
  }

  return {
    item: {
      id: item.id,
      slug: item.slug,
      name: item.name,
      brandName: (item as any).brands?.name ?? '',
      categoryId: item.category_id,
      level: item.parent_id === null ? 'line' : 'variant',
      rarityBase: item.rarity_base as RarityBase,
      imagePath: item.image_path,
      isVerified: item.is_verified,
    },
    line: (line as GearItemRef | null) ?? null,
    variants: variants ?? [],
    stats: {
      ownerCount,
      wishCount,
      rarity: rarityWeight(item.rarity_base as RarityBase, ownerCount, totalUsers ?? 0),
    },
    players,
  }
})
```

- [ ] **Step 5: Sitemap implementieren**

`server/routes/sitemap.xml.ts`. Nur Gear-Seiten — Profile stehen laut Abschnitt 10 hinter dem Login und gehören nicht in eine Sitemap.

```ts
import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const admin = serverSupabaseServiceRole(event)
  const { data } = await admin
    .from('catalog_items')
    .select('slug, created_at')
    .not('slug', 'is', null)

  const origin = getRequestURL(event).origin
  const urls = (data ?? [])
    .map(
      (row: any) =>
        `  <url><loc>${origin}/gear/${row.slug}</loc><lastmod>${new Date(row.created_at).toISOString().slice(0, 10)}</lastmod></url>`,
    )
    .join('\n')

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`
})
```

`public/robots.txt`:

```
User-agent: *
Allow: /gear/
Disallow: /profile/
Disallow: /rig
Disallow: /settings
Disallow: /onboarding

Sitemap: /sitemap.xml
```

- [ ] **Step 6: Seite schreiben**

`app/pages/gear/[slug].vue`. Kein `middleware: 'auth'` — das ist der Punkt.

```vue
<script setup lang="ts">
const t = useText()
const route = useRoute()
const user = useSupabaseUser()

const { data } = await useFetch<any>(`/api/gear/${route.params.slug}`)

useSeoMeta({
  title: () => `${data.value?.item.brandName} ${data.value?.item.name} — ${t.app.name}`,
  description: () =>
    `${data.value?.item.brandName} ${data.value?.item.name}: ${t.gearPage.playersCount.replace('{count}', String(data.value?.stats.ownerCount ?? 0))}`,
})

const categoryLabel = computed(
  () => t.categories[data.value?.item.categoryId as keyof typeof t.categories] ?? '',
)
</script>

<template>
  <article v-if="data" class="flex flex-col gap-f-8">
    <header class="flex flex-col gap-2">
      <p class="text-sm text-neutral-500">{{ categoryLabel }}</p>
      <h1 class="text-f-5xl font-semibold">{{ data.item.brandName }} {{ data.item.name }}</h1>
      <p class="text-sm text-neutral-600">
        {{ t.gearPage.rarity[data.item.rarityBase as keyof typeof t.gearPage.rarity] }} ·
        {{ t.gearPage.playersCount.replace('{count}', String(data.stats.ownerCount)) }} ·
        {{ t.gearPage.wishCount.replace('{count}', String(data.stats.wishCount)) }}
      </p>
      <p v-if="!data.item.isVerified" class="text-sm text-amber-700">{{ t.gearPage.unverified }}</p>
      <p v-if="data.line" class="text-sm">
        {{ t.gearPage.partOf }}:
        <NuxtLink :to="`/gear/${data.line.slug}`" class="underline">{{ data.line.name }}</NuxtLink>
      </p>
    </header>

    <section v-if="data.variants.length > 0">
      <h2 class="mb-3 text-f-2xl font-semibold">{{ t.gearPage.variants }}</h2>
      <ul class="divide-y rounded border">
        <li v-for="variant in data.variants" :key="variant.id" class="px-3 py-2">
          <NuxtLink :to="`/gear/${variant.slug}`" class="underline">{{ variant.name }}</NuxtLink>
        </li>
      </ul>
    </section>

    <section>
      <h2 class="mb-3 text-f-2xl font-semibold">{{ t.gearPage.players }}</h2>
      <p v-if="!user" class="text-neutral-600">{{ t.gearPage.signInToSeePlayers }}</p>
      <p v-else-if="data.players.length === 0" class="text-neutral-600">{{ t.gearPage.noPlayers }}</p>
      <ul v-else class="divide-y rounded border">
        <li v-for="player in data.players" :key="player.userId" class="flex gap-2 px-3 py-2">
          <NuxtLink :to="`/profile/${player.userId}`" class="underline">{{ player.displayName }}</NuxtLink>
          <span v-if="player.year" class="text-sm text-neutral-500">{{ player.year }}</span>
          <span v-if="player.finish" class="text-sm text-neutral-500">{{ player.finish }}</span>
        </li>
      </ul>
    </section>
  </article>
</template>
```

- [ ] **Step 7: Tests laufen lassen — sie müssen bestehen**

```bash
yarn dev
yarn test:api tests/api/gear.test.ts
```
Expected: PASS, 8 Tests.

- [ ] **Step 8: Von Hand ohne Login prüfen**

Privates Browserfenster öffnen, `/gear/fender-stratocaster` aufrufen. Erwartung: Die Seite lädt, zeigt Zahl der Spieler und Ausführungen, aber keine Namen — und leitet **nicht** auf `/login` um.

- [ ] **Step 9: Commit**

```bash
git add server/ app/ public/robots.txt tests/api/gear.test.ts
git commit -m "feat(gear): oeffentliche Gear-Seite mit Sitemap"
```

---

## Task 16: Suche

Derselbe Checker, zweiter Einsatzort. Einmal gebaut, zweimal genutzt.

**Files:**
- Create: `server/api/search.get.ts`
- Create: `app/pages/search.vue`
- Modify: `app/locales/de.ts`
- Create: `tests/api/search.test.ts`

**Interfaces:**
- Consumes: `getCatalogSnapshot`, `matchCatalog` aus Task 6; Tabelle `profiles` aus Task 7
- Produces:
  - `GET /api/search?q=` → `{ catalog: CatalogSearchResult[]; people: PersonHit[] }`
  - `export interface PersonHit { userId: string; displayName: string }`
  - Seite `/search`

- [ ] **Step 1: Texte ergänzen**

```ts
  search: {
    title: 'Suche',
    placeholder: 'Gerät, Marke oder Name — „Wer hat hier einen AC30?" geht auch',
    gearHeading: 'Equipment',
    peopleHeading: 'Leute',
    peopleLoginHint: 'Melde dich an, um auch Leute zu finden.',
    noResults: 'Nichts gefunden.',
  },
```

- [ ] **Step 2: Den fehlschlagenden Test schreiben**

`tests/api/search.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestUser, deleteTestUsers, type TestUser } from '../helpers/testUser'

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3000'

let zappa: TestUser

beforeAll(async () => {
  zappa = await createTestUser('Zappa Zweitname')
})

afterAll(async () => {
  await deleteTestUsers()
})

async function search(query: string, user?: TestUser): Promise<any> {
  const headers: Record<string, string> = {}
  if (user) {
    const { data } = await user.client.auth.getSession()
    headers.Authorization = `Bearer ${data.session!.access_token}`
  }
  const response = await fetch(`${BASE}/api/search?q=${encodeURIComponent(query)}`, { headers })
  expect(response.ok).toBe(true)
  return response.json()
}

describe('GET /api/search', () => {
  it('findet Equipment ohne Login', async () => {
    const body = await search('ac30')
    expect(body.catalog[0].name).toBe('AC30')
  })

  it('verarbeitet eine ganze Frage', async () => {
    // "AC30" und "Wer hat hier einen AC30?" sind dasselbe Problem.
    const body = await search('Wer hat hier einen AC30?')
    expect(body.catalog[0].name).toBe('AC30')
  })

  it('liefert ohne Login keine Personen', async () => {
    const body = await search('Zappa')
    expect(body.people).toEqual([])
  })

  it('findet Personen mit Login', async () => {
    const body = await search('Zappa', zappa)
    expect(body.people.some((p: any) => p.userId === zappa.id)).toBe(true)
  })

  it('liefert bei leerer Eingabe leere Listen', async () => {
    const body = await search('')
    expect(body.catalog).toEqual([])
    expect(body.people).toEqual([])
  })
})
```

- [ ] **Step 3: Test laufen lassen — er muss fehlschlagen**

```bash
yarn dev
yarn test:api tests/api/search.test.ts
```
Expected: FAIL — 404 auf `/api/search`.

- [ ] **Step 4: Route implementieren**

`server/api/search.get.ts`:

```ts
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { matchCatalog } from '../utils/catalogMatch'
import { getCatalogSnapshot } from '../utils/catalogSnapshot'
import { meaningfulTokens } from '../utils/normalize'

export interface PersonHit {
  userId: string
  displayName: string
}

export default defineEventHandler(async (event) => {
  const term = String(getQuery(event).q ?? '')
  const tokens = meaningfulTokens(term)
  if (tokens.length === 0) return { catalog: [], people: [] }

  const snapshot = await getCatalogSnapshot(event)
  const catalog = matchCatalog(term, snapshot, { limit: 10 }).map(({ entry }) => ({
    id: entry.id,
    slug: entry.slug,
    name: entry.name,
    brandName: entry.brandName,
    categoryId: entry.categoryId,
    level: entry.level,
  }))

  // Profile sind laut Abschnitt 10 nur mit Login sichtbar - auch in der Suche.
  const user = await serverSupabaseUser(event).catch(() => null)
  let people: PersonHit[] = []
  if (user) {
    const admin = serverSupabaseServiceRole(event)
    const { data } = await admin
      .from('profiles')
      .select('id, display_name')
      .ilike('display_name', `%${tokens.join('%')}%`)
      .limit(10)
    people = (data ?? []).map((row: any) => ({ userId: row.id, displayName: row.display_name }))
  }

  return { catalog, people }
})
```

- [ ] **Step 5: Seite schreiben**

`app/pages/search.vue`. Ohne `middleware: 'auth'` — Suchen darf jeder, Personen sieht nur, wer angemeldet ist.

```vue
<script setup lang="ts">
const t = useText()
const route = useRoute()
const router = useRouter()
const user = useSupabaseUser()

const term = ref(typeof route.query.q === 'string' ? route.query.q : '')

// Reaktives query: useFetch laedt bei jeder Aenderung von selbst nach.
const { data } = await useFetch<any>('/api/search', {
  query: computed(() => ({ q: term.value })),
})

watchDebounced(term, () => {
  router.replace({ query: term.value ? { q: term.value } : {} })
}, { debounce: 200 })
</script>

<template>
  <div class="flex flex-col gap-f-8">
    <h1 class="text-f-4xl font-semibold">{{ t.search.title }}</h1>
    <input
      v-model="term"
      type="search"
      :placeholder="t.search.placeholder"
      class="w-full rounded border px-3 py-2"
    />

    <section v-if="(data?.catalog ?? []).length > 0">
      <h2 class="mb-3 text-f-2xl font-semibold">{{ t.search.gearHeading }}</h2>
      <ul class="divide-y rounded border">
        <li v-for="hit in data.catalog" :key="hit.id" class="px-3 py-2">
          <NuxtLink :to="`/gear/${hit.slug}`" class="underline">
            {{ hit.brandName }} {{ hit.name }}
          </NuxtLink>
        </li>
      </ul>
    </section>

    <section>
      <h2 class="mb-3 text-f-2xl font-semibold">{{ t.search.peopleHeading }}</h2>
      <p v-if="!user" class="text-neutral-600">{{ t.search.peopleLoginHint }}</p>
      <ul v-else-if="(data?.people ?? []).length > 0" class="divide-y rounded border">
        <li v-for="hit in data.people" :key="hit.userId" class="px-3 py-2">
          <NuxtLink :to="`/profile/${hit.userId}`" class="underline">{{ hit.displayName }}</NuxtLink>
        </li>
      </ul>
      <p v-else class="text-neutral-600">{{ t.search.noResults }}</p>
    </section>
  </div>
</template>
```

`watchDebounced` kommt aus VueUse. Falls noch nicht installiert:

```bash
yarn add @vueuse/nuxt @vueuse/core
```
und in `nuxt.config.ts` bei `modules` `'@vueuse/nuxt'` ergänzen. Alternativ ein eigenes `setTimeout` wie im `CatalogPicker` — dann entfällt die Abhängigkeit.

- [ ] **Step 6: Tests laufen lassen — sie müssen bestehen**

```bash
yarn dev
yarn test:api tests/api/search.test.ts
```
Expected: PASS, 5 Tests.

- [ ] **Step 7: Commit**

```bash
git add server/api/search.get.ts app/ tests/api/search.test.ts package.json
git commit -m "feat(search): Suche ueber Checker und Personen"
```

---

## Task 17: Profil und Einstellungen

Das Rig ist die Identität. Die Profilseite zeigt es, die Einstellungen pflegen das Wenige daneben.

**Files:**
- Create: `app/pages/profile/[id].vue`
- Create: `app/pages/settings.vue`
- Modify: `app/locales/de.ts`
- Create: `tests/db/profileVisibility.test.ts`

**Interfaces:**
- Consumes: Tabellen aus Task 7 und Task 9; Storage-Bucket `avatars` aus Task 7
- Produces: Seiten `/profile/[id]` und `/settings`

- [ ] **Step 1: Texte ergänzen**

```ts
  profile: {
    rig: 'Rig',
    wishlist: 'Sucht',
    preferences: 'Saiten und Plektren',
    bands: 'Bands',
    links: 'Links',
    emptyRig: 'Hier steht noch kein Equipment.',
    ownProfile: 'Das bist du.',
    editCta: 'Profil bearbeiten',
  },
  settings: {
    title: 'Einstellungen',
    displayName: 'Anzeigename',
    displayNameHint: 'Das Einzige, was wir brauchen.',
    realName: 'Echter Name',
    bio: 'Über dich',
    bands: 'Bands, kommagetrennt',
    links: 'Links, einer pro Zeile',
    avatar: 'Foto',
    save: 'Speichern',
    saved: 'Gespeichert.',
    optionalHint: 'Alles außer dem Anzeigenamen ist freiwillig. Ort fragen wir bewusst nicht ab.',
  },
```

- [ ] **Step 2: Den fehlschlagenden Test schreiben**

`tests/db/profileVisibility.test.ts` sichert ab, dass die Profilseite an RLS scheitert, wenn sie es soll:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { adminClient, anonClient } from '../helpers/supabase'
import { createTestUser, deleteTestUsers, type TestUser } from '../helpers/testUser'

const admin = adminClient()
const anon = anonClient()

let alice: TestUser
let bob: TestUser

beforeAll(async () => {
  alice = await createTestUser('Alice Ampeg')
  bob = await createTestUser('Bob Bassman')
  const { data: strat } = await admin.from('catalog_items').select('id').eq('name', 'Stratocaster').single()
  await alice.client.from('gear_items').insert({ owner_id: alice.id, catalog_item_id: strat!.id })
})

afterAll(async () => {
  await deleteTestUsers()
})

describe('Was die Profilseite laden darf', () => {
  it('lässt einen Angemeldeten Profil und Rig eines anderen lesen', async () => {
    const { data: profile } = await bob.client
      .from('profiles')
      .select('display_name, bio, bands, links')
      .eq('id', alice.id)
      .single()
    expect(profile!.display_name).toBe('Alice Ampeg')

    const { data: rig } = await bob.client
      .from('gear_items')
      .select('id, catalog_items ( name )')
      .eq('owner_id', alice.id)
    expect(rig!.length).toBeGreaterThan(0)
  })

  it('gibt einem Nicht-Angemeldeten weder Profil noch Rig', async () => {
    const { data: profile } = await anon.from('profiles').select('display_name').eq('id', alice.id)
    expect(profile).toEqual([])
    const { data: rig } = await anon.from('gear_items').select('id').eq('owner_id', alice.id)
    expect(rig).toEqual([])
  })

  it('speichert die optionalen Felder', async () => {
    const { error } = await alice.client
      .from('profiles')
      .update({
        real_name: 'Alice A.',
        bio: 'Spielt seit 1998.',
        bands: ['Die Reverbs', 'Solo'],
        links: [{ label: 'YouTube', url: 'https://example.com' }],
      })
      .eq('id', alice.id)
    expect(error).toBeNull()

    const { data } = await admin.from('profiles').select('bands, links').eq('id', alice.id).single()
    expect(data!.bands).toEqual(['Die Reverbs', 'Solo'])
    expect((data!.links as any[])[0].label).toBe('YouTube')
  })

  it('speichert keinen Ort — das Feld gibt es gar nicht', async () => {
    const { error } = await alice.client
      .from('profiles')
      .update({ location: 'Köln' } as any)
      .eq('id', alice.id)
    expect(error).not.toBeNull()
  })
})
```

- [ ] **Step 3: Test laufen lassen**

Run: `yarn test tests/db/profileVisibility.test.ts`
Expected: PASS, 4 Tests. Schlägt der letzte fehl, existiert eine Ortsspalte — die gehört gelöscht.

- [ ] **Step 4: Profilseite schreiben**

`app/pages/profile/[id].vue`:

```vue
<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const t = useText()
const route = useRoute()
const supabase = useSupabaseClient()
const user = useSupabaseUser()

const id = computed(() => String(route.params.id))
const isOwn = computed(() => user.value?.id === id.value)

const { data: profile } = await useAsyncData(`profile-${id.value}`, async () => {
  const { data } = await supabase
    .from('profiles')
    .select('id, display_name, real_name, bio, avatar_path, bands, links')
    .eq('id', id.value)
    .maybeSingle()
  return data
})

const { data: rig } = await useAsyncData(`profile-rig-${id.value}`, async () => {
  const { data } = await supabase
    .from('gear_items')
    .select('id, year, finish, modifications, catalog_items ( slug, name, category_id, brands ( name ) )')
    .eq('owner_id', id.value)
    .order('created_at')
  return data ?? []
})

const { data: wishlist } = await useAsyncData(`profile-wishlist-${id.value}`, async () => {
  const { data } = await supabase
    .from('wishlist_items')
    .select('id, note, catalog_items ( slug, name, brands ( name ) )')
    .eq('user_id', id.value)
  return data ?? []
})

const { data: preferences } = await useAsyncData(`profile-preferences-${id.value}`, async () => {
  const { data } = await supabase
    .from('preferences')
    .select('id, catalog_items ( slug, name, brands ( name ) )')
    .eq('user_id', id.value)
  return data ?? []
})

function label(row: any): string {
  return `${row.catalog_items.brands.name} ${row.catalog_items.name}`
}
</script>

<template>
  <div v-if="profile" class="flex flex-col gap-f-8">
    <header class="flex flex-col gap-2">
      <h1 class="text-f-5xl font-semibold">{{ profile.display_name }}</h1>
      <p v-if="profile.real_name" class="text-neutral-600">{{ profile.real_name }}</p>
      <p v-if="profile.bio">{{ profile.bio }}</p>
      <p v-if="profile.bands.length > 0" class="text-sm text-neutral-600">
        {{ t.profile.bands }}: {{ profile.bands.join(', ') }}
      </p>
      <NuxtLink v-if="isOwn" to="/settings" class="text-sm underline">{{ t.profile.editCta }}</NuxtLink>
    </header>

    <section>
      <h2 class="mb-3 text-f-2xl font-semibold">{{ t.profile.rig }}</h2>
      <p v-if="(rig ?? []).length === 0" class="text-neutral-600">{{ t.profile.emptyRig }}</p>
      <ul v-else class="divide-y rounded border">
        <li v-for="row in rig" :key="row.id" class="flex flex-wrap items-baseline gap-2 px-3 py-2">
          <NuxtLink :to="`/gear/${row.catalog_items.slug}`" class="underline">{{ label(row) }}</NuxtLink>
          <span v-if="row.year" class="text-sm text-neutral-500">{{ row.year }}</span>
          <span v-if="row.finish" class="text-sm text-neutral-500">{{ row.finish }}</span>
          <span v-if="row.modifications" class="text-sm text-neutral-500">{{ row.modifications }}</span>
        </li>
      </ul>
    </section>

    <section v-if="(preferences ?? []).length > 0">
      <h2 class="mb-3 text-f-2xl font-semibold">{{ t.profile.preferences }}</h2>
      <ul class="divide-y rounded border">
        <li v-for="row in preferences" :key="row.id" class="px-3 py-2">
          <NuxtLink :to="`/gear/${row.catalog_items.slug}`" class="underline">{{ label(row) }}</NuxtLink>
        </li>
      </ul>
    </section>

    <section v-if="(wishlist ?? []).length > 0">
      <h2 class="mb-3 text-f-2xl font-semibold">{{ t.profile.wishlist }}</h2>
      <ul class="divide-y rounded border">
        <li v-for="row in wishlist" :key="row.id" class="flex gap-2 px-3 py-2">
          <NuxtLink :to="`/gear/${row.catalog_items.slug}`" class="underline">{{ label(row) }}</NuxtLink>
          <span v-if="row.note" class="text-sm text-neutral-500">{{ row.note }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>
```

- [ ] **Step 5: Einstellungen schreiben**

`app/pages/settings.vue`:

```vue
<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const t = useText()
const supabase = useSupabaseClient()
const user = useSupabaseUser()

const displayName = ref('')
const realName = ref('')
const bio = ref('')
const bandsText = ref('')
const linksText = ref('')
const saved = ref(false)

const { data: profile } = await useAsyncData('own-profile', async () => {
  const { data } = await supabase
    .from('profiles')
    .select('display_name, real_name, bio, bands, links')
    .eq('id', user.value!.id)
    .single()
  return data
})

watchEffect(() => {
  if (!profile.value) return
  displayName.value = profile.value.display_name ?? ''
  realName.value = profile.value.real_name ?? ''
  bio.value = profile.value.bio ?? ''
  bandsText.value = (profile.value.bands ?? []).join(', ')
  linksText.value = (profile.value.links as any[] ?? []).map((l) => l.url).join('\n')
})

async function save() {
  saved.value = false
  await supabase
    .from('profiles')
    .update({
      display_name: displayName.value.trim(),
      real_name: realName.value.trim() || null,
      bio: bio.value.trim() || null,
      bands: bandsText.value.split(',').map((b) => b.trim()).filter(Boolean),
      links: linksText.value
        .split('\n')
        .map((url) => url.trim())
        .filter(Boolean)
        .map((url) => ({ label: url.replace(/^https?:\/\//, ''), url })),
    })
    .eq('id', user.value!.id)
  saved.value = true
}

async function uploadAvatar(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  // Eigener Ordner - so verlangt es die Storage-Policy aus Task 7.
  const path = `${user.value!.id}/${crypto.randomUUID()}`
  const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
  if (!error) await supabase.from('profiles').update({ avatar_path: path }).eq('id', user.value!.id)
}
</script>

<template>
  <div class="mx-auto flex max-w-lg flex-col gap-4">
    <h1 class="text-f-4xl font-semibold">{{ t.settings.title }}</h1>
    <p class="text-sm text-neutral-500">{{ t.settings.optionalHint }}</p>

    <form class="flex flex-col gap-4" @submit.prevent="save">
      <label class="flex flex-col gap-1">
        <span class="text-sm">{{ t.settings.displayName }}</span>
        <input v-model="displayName" type="text" required minlength="2" maxlength="40" class="rounded border px-3 py-2" />
        <span class="text-xs text-neutral-500">{{ t.settings.displayNameHint }}</span>
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-sm">{{ t.settings.realName }}</span>
        <input v-model="realName" type="text" maxlength="80" class="rounded border px-3 py-2" />
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-sm">{{ t.settings.bio }}</span>
        <textarea v-model="bio" maxlength="500" rows="4" class="rounded border px-3 py-2" />
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-sm">{{ t.settings.bands }}</span>
        <input v-model="bandsText" type="text" class="rounded border px-3 py-2" />
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-sm">{{ t.settings.links }}</span>
        <textarea v-model="linksText" rows="3" class="rounded border px-3 py-2" />
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-sm">{{ t.settings.avatar }}</span>
        <input type="file" accept="image/*" @change="uploadAvatar" />
      </label>
      <p v-if="saved" class="text-sm text-green-700">{{ t.settings.saved }}</p>
      <button type="submit" class="rounded bg-neutral-900 px-4 py-2 text-white">{{ t.settings.save }}</button>
    </form>
  </div>
</template>
```

- [ ] **Step 6: Sprachtest laufen lassen**

Run: `yarn test tests/unit/locale.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/ tests/db/profileVisibility.test.ts
git commit -m "feat(profile): Profilseite und Einstellungen"
```

---

## Task 18: Demo-Nutzer

Zwanzig erfundene Musiker mit plausiblen Rigs. Ohne sie ist die Empfehlung nicht vorführbar — und eine Plattform, die man niemandem zeigen kann, ist kein Prototyp.

**Files:**
- Create: `scripts/data/demoUsers.ts`
- Create: `scripts/seed-users.ts`
- Modify: `package.json`
- Create: `tests/db/demoSeed.test.ts`

**Interfaces:**
- Consumes: Katalog aus Task 3; Tabellen aus Task 7 und Task 9
- Produces:
  - `export interface DemoUser { displayName: string; bio?: string; bands?: string[]; gear: DemoGear[]; preferences: string[]; wishlist: string[] }`
  - `export interface DemoGear { item: string; year?: number; finish?: string; modifications?: string; installedIn?: string }`
  - `export const DEMO_USERS: DemoUser[]`
  - yarn-Skript `seed:users`

Geräte werden über den **Katalog-Namen** referenziert, nicht über eine id — die Namen stehen in `scripts/data/catalog.ts` und lassen sich prüfen.

- [ ] **Step 1: Den fehlschlagenden Test schreiben**

`tests/db/demoSeed.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { CATALOG } from '../../scripts/data/catalog'
import { DEMO_USERS } from '../../scripts/data/demoUsers'
import { adminClient } from '../helpers/supabase'

const admin = adminClient()

const CATALOG_NAMES = new Set(
  CATALOG.flatMap((line) => [line.name, ...(line.variants?.map((v) => v.name) ?? [])]),
)

describe('Demo-Daten', () => {
  it('umfasst mindestens 20 Nutzer', () => {
    expect(DEMO_USERS.length).toBeGreaterThanOrEqual(20)
  })

  it('verweist nur auf existierende Katalog-Einträge', () => {
    const referenced = DEMO_USERS.flatMap((u) => [
      ...u.gear.map((g) => g.item),
      ...u.preferences,
      ...u.wishlist,
    ])
    expect(referenced.filter((name) => !CATALOG_NAMES.has(name))).toEqual([])
  })

  it('hat eindeutige Anzeigenamen', () => {
    const names = DEMO_USERS.map((u) => u.displayName)
    expect(new Set(names).size).toBe(names.length)
  })

  it('lässt seltene Geräte selten sein', () => {
    // Ohne Streuung ist die Empfehlung nicht vorfuehrbar: haetten alle
    // denselben Klon, waere er statistisch Massenware.
    const counts = new Map<string, number>()
    for (const user of DEMO_USERS) {
      for (const gear of user.gear) counts.set(gear.item, (counts.get(gear.item) ?? 0) + 1)
    }
    const klon = counts.get('Centaur') ?? 0
    expect(klon).toBeGreaterThanOrEqual(2)
    expect(klon).toBeLessThanOrEqual(4)
  })

  it('gibt mindestens der Hälfte eine Wunschliste', () => {
    const withWishes = DEMO_USERS.filter((u) => u.wishlist.length > 0)
    expect(withWishes.length).toBeGreaterThanOrEqual(DEMO_USERS.length / 2)
  })
})

describe('Demo-Nutzer nach dem Seed', () => {
  it('steht vollständig in der Datenbank', async () => {
    const { data } = await admin
      .from('profiles')
      .select('display_name')
      .in('display_name', DEMO_USERS.map((u) => u.displayName))
    expect(data!.length).toBe(DEMO_USERS.length)
  })

  it('hat bestätigte E-Mail-Adressen', async () => {
    // Die Mail-Bestaetigung bleibt projektweit Pflicht; Demo-Nutzer entstehen
    // deshalb ueber die Admin-API mit email_confirm.
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const demo = data.users.filter((u) => u.email?.startsWith('demo-'))
    expect(demo.length).toBeGreaterThanOrEqual(DEMO_USERS.length)
    expect(demo.every((u) => u.email_confirmed_at !== null)).toBe(true)
  })

  it('hat jedem Demo-Nutzer Equipment gegeben', async () => {
    const { data: profiles } = await admin
      .from('profiles')
      .select('id')
      .in('display_name', DEMO_USERS.map((u) => u.displayName))
    const { data: gear } = await admin
      .from('gear_items')
      .select('owner_id')
      .in('owner_id', profiles!.map((p) => p.id))
    const owners = new Set(gear!.map((g) => g.owner_id))
    expect(owners.size).toBe(profiles!.length)
  })
})
```

- [ ] **Step 2: Demo-Daten schreiben**

`scripts/data/demoUsers.ts`. Unten stehen fünf ausformulierte Nutzer als Muster — **auf mindestens 20 auffüllen**, der Test hält den Task offen.

Faustregeln:
- Rigs plausibel halten: wer einen Bass hat, hat keinen Tube Screamer in einer Strat verbaut.
- Streuung wichtiger als Realismus: ein paar teilen Massenware, ein paar teilen etwas Rares. Ohne Streuung ist die Empfehlungsliste flach.
- Ein bis zwei tiefe Einträge pro Nutzer (Ausführung plus Baujahr), der Rest grob — genau die gestaffelte Tiefe aus Abschnitt 6.
- Verbrauchsmaterial überall gleich verteilen; es soll als schwaches Signal sichtbar werden.

```ts
export interface DemoGear {
  /** Katalog-Name aus scripts/data/catalog.ts. */
  item: string
  year?: number
  finish?: string
  modifications?: string
  /** Katalog-Name eines anderen Geraets desselben Nutzers. */
  installedIn?: string
}

export interface DemoUser {
  displayName: string
  bio?: string
  bands?: string[]
  gear: DemoGear[]
  preferences: string[]
  wishlist: string[]
}

export const DEMO_USERS: DemoUser[] = [
  {
    displayName: 'Halbtakt Hanno',
    bio: 'Spielt seit den Neunzigern dasselbe Pedalboard und sieht keinen Grund, das zu ändern.',
    bands: ['Die Reverbs'],
    gear: [
      { item: 'Stratocaster' },
      { item: 'Deluxe Reverb Reissue', year: 2014 },
      { item: 'TS9 Tube Screamer' },
      { item: 'DS-1 Distortion' },
    ],
    preferences: ['Regular Slinky', 'Tortex'],
    wishlist: ['Centaur'],
  },
  {
    displayName: 'Rauschende Rieke',
    bio: 'Zu laut für die Nachbarn, zu leise für die Bühne.',
    gear: [
      { item: 'Les Paul Standard', year: 2019, finish: 'Tobacco Burst' },
      { item: 'JCM800' },
      { item: '1960A' },
      { item: 'JB', installedIn: 'Les Paul Standard' },
    ],
    preferences: ['EXL110', 'Jazz III'],
    wishlist: ['White Falcon'],
  },
  {
    displayName: 'Kellerkind Kalle',
    bio: 'Nimmt alles zuhause auf und ärgert sich über den Raumklang.',
    gear: [
      { item: 'Telecaster', year: 2021, finish: 'Butterscotch' },
      { item: 'AC30C2' },
      { item: 'Centaur' },
      { item: 'Timeline' },
    ],
    preferences: ['Super Slinky', 'Tortex'],
    wishlist: ['TS808 Handwired'],
  },
  {
    displayName: 'Tiefton Tamara',
    bio: 'Bass ist kein Instrument, Bass ist eine Haltung.',
    bands: ['Solo', 'Die Reverbs'],
    gear: [
      { item: 'Jazz Bass', year: 2008 },
      { item: 'Precision Bass' },
      { item: 'Big Muff Pi' },
    ],
    preferences: ['Jazz Swing'],
    wishlist: ['4003'],
  },
  {
    displayName: 'Nebelhorn Nils',
    bio: 'Ein Pedal reicht, wenn es das richtige ist.',
    gear: [
      { item: 'Jazzmaster' },
      { item: 'Twin Reverb' },
      { item: 'Centaur' },
      { item: 'RAT' },
    ],
    preferences: ['Regular Slinky'],
    wishlist: [],
  },

  // TODO beim Umsetzen: auf mindestens 20 Nutzer auffüllen.
  // Der Test "umfasst mindestens 20 Nutzer" hält diesen Task offen.
]
```

- [ ] **Step 3: Seed-Skript schreiben**

`scripts/seed-users.ts`. Idempotent über die E-Mail-Adresse, die aus dem Anzeigenamen entsteht.

```ts
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { DEMO_USERS, type DemoUser } from './data/demoUsers'

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} fehlt in .env`)
  return value
}

const DEMO_EMAIL_PREFIX = 'demo-'
const DEMO_EMAIL_DOMAIN = '@rigmate.invalid'
const DEMO_PASSWORD = 'rigmate-demo-2026'

const supabase = createClient(required('SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
})

function emailFor(displayName: string): string {
  const slug = displayName
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${DEMO_EMAIL_PREFIX}${slug}${DEMO_EMAIL_DOMAIN}`
}

async function catalogIdByName(): Promise<Map<string, string>> {
  const { data, error } = await supabase.from('catalog_items').select('id, name')
  if (error) throw new Error(`Katalog lesen: ${error.message}`)
  return new Map((data ?? []).map((row) => [row.name as string, row.id as string]))
}

async function findExistingUser(email: string): Promise<string | null> {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) throw new Error(`Nutzer auflisten: ${error.message}`)
  return data.users.find((user) => user.email === email)?.id ?? null
}

async function ensureUser(demo: DemoUser): Promise<string> {
  const email = emailFor(demo.displayName)
  const existing = await findExistingUser(email)
  if (existing) return existing

  // email_confirm statt die Bestaetigung projektweit abzuschalten.
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: demo.displayName },
  })
  if (error) throw new Error(`Demo-Nutzer "${demo.displayName}": ${error.message}`)
  return data.user!.id
}

async function seedUser(demo: DemoUser, catalog: Map<string, string>): Promise<void> {
  const userId = await ensureUser(demo)

  await supabase
    .from('profiles')
    .update({ display_name: demo.displayName, bio: demo.bio ?? null, bands: demo.bands ?? [] })
    .eq('id', userId)

  // Vollstaendig neu aufbauen, damit ein zweiter Lauf nichts verdoppelt.
  await supabase.from('gear_items').delete().eq('owner_id', userId)
  await supabase.from('preferences').delete().eq('user_id', userId)
  await supabase.from('wishlist_items').delete().eq('user_id', userId)

  const gearIdByName = new Map<string, string>()

  // Erst alles ohne installed_in, damit die Ziele existieren.
  for (const gear of demo.gear.filter((g) => !g.installedIn)) {
    const catalogItemId = catalog.get(gear.item)
    if (!catalogItemId) throw new Error(`Unbekannter Katalog-Eintrag: ${gear.item}`)
    const { data, error } = await supabase
      .from('gear_items')
      .insert({
        owner_id: userId,
        catalog_item_id: catalogItemId,
        year: gear.year ?? null,
        finish: gear.finish ?? null,
        modifications: gear.modifications ?? null,
      })
      .select('id')
      .single()
    if (error) throw new Error(`${demo.displayName} / ${gear.item}: ${error.message}`)
    gearIdByName.set(gear.item, data.id)
  }

  for (const gear of demo.gear.filter((g) => g.installedIn)) {
    const catalogItemId = catalog.get(gear.item)
    const target = gearIdByName.get(gear.installedIn!)
    if (!catalogItemId) throw new Error(`Unbekannter Katalog-Eintrag: ${gear.item}`)
    if (!target) throw new Error(`${demo.displayName}: "${gear.installedIn}" nicht im eigenen Rig`)
    const { error } = await supabase.from('gear_items').insert({
      owner_id: userId,
      catalog_item_id: catalogItemId,
      year: gear.year ?? null,
      finish: gear.finish ?? null,
      modifications: gear.modifications ?? null,
      installed_in_id: target,
    })
    if (error) throw new Error(`${demo.displayName} / ${gear.item}: ${error.message}`)
  }

  for (const name of demo.preferences) {
    const catalogItemId = catalog.get(name)
    if (!catalogItemId) throw new Error(`Unbekannter Katalog-Eintrag: ${name}`)
    const { error } = await supabase
      .from('preferences')
      .insert({ user_id: userId, catalog_item_id: catalogItemId })
    if (error) throw new Error(`${demo.displayName} / ${name}: ${error.message}`)
  }

  for (const name of demo.wishlist) {
    const catalogItemId = catalog.get(name)
    if (!catalogItemId) throw new Error(`Unbekannter Katalog-Eintrag: ${name}`)
    const { error } = await supabase
      .from('wishlist_items')
      .insert({ user_id: userId, catalog_item_id: catalogItemId })
    if (error) throw new Error(`${demo.displayName} / ${name}: ${error.message}`)
  }
}

async function main() {
  const catalog = await catalogIdByName()
  for (const demo of DEMO_USERS) {
    await seedUser(demo, catalog)
    process.stdout.write('.')
  }
  process.stdout.write('\n')
  console.log(`${DEMO_USERS.length} Demo-Nutzer eingespielt. Passwort: ${DEMO_PASSWORD}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
```

- [ ] **Step 4: yarn-Skript eintragen**

```json
    "seed:users": "tsx scripts/seed-users.ts"
```

- [ ] **Step 5: Seed laufen lassen, zweimal**

```bash
yarn seed:users && yarn seed:users
```
Expected: Beide Läufe melden dieselbe Zahl, ohne Fehler.

- [ ] **Step 6: Tests laufen lassen**

Run: `yarn test tests/db/demoSeed.test.ts`
Expected: PASS, 8 Tests.

- [ ] **Step 7: Die Auszahlung von Hand prüfen**

```bash
yarn dev
```
Als einer der Demo-Nutzer anmelden (`demo-halbtakt-hanno@rigmate.invalid` / `rigmate-demo-2026`) und `/` öffnen.

Erwartung — und das ist der Moment, für den der ganze Plan da ist:
- Es stehen Personenvorschläge da, nicht der Ersatzmodus.
- Wer den Klon Centaur teilt, steht **vor** dem, der nur einen DS-1 teilt.
- Jeder Vorschlag nennt seinen Grund.
- Ein frisch registriertes Konto sieht stattdessen den erklärten Leerzustand.

Stimmt die Reihenfolge nicht, liegt es an den Grundwerten in `scripts/data/catalog.ts`, nicht am Scoring — das ist in Task 13 geprüft.

- [ ] **Step 8: Ganzen Testlauf und Bundle-Prüfung**

```bash
yarn test
yarn dev & yarn test:api
yarn build && grep -r "service_role" .output/public/ && echo "GEFUNDEN - Abbruch" || echo "sauber"
```
Expected: Alles grün, `sauber`.

- [ ] **Step 9: Commit**

```bash
git add scripts/ tests/db/demoSeed.test.ts package.json
git commit -m "feat(seed): 20 Demo-Nutzer mit plausiblen Rigs"
```

---

## Abdeckung der Spec

Gegenprobe Abschnitt für Abschnitt. Was hier nicht steht, ist bewusst nicht Teil von Stufe 1.

| Spec | Umgesetzt in |
|---|---|
| 4.1 Katalog, zweistufig, Marke getrennt, Synonyme, Seltenheits-Grundwert, geprüft | Task 2, Task 3 |
| 4.1 Regel „Baujahr nie im Modellnamen" | Task 3 (Datentest), Task 6 (Notausgang lehnt ab) |
| 4.2 Exemplar mit Baujahr, Farbe, Modifikationen, Foto, Notizen, „verbaut in" | Task 9, Task 10 |
| 4.3 Präferenz für Verbrauchsmaterial | Task 9 (`preferences` plus Trigger), Task 10 |
| 4.4 Wunschliste | Task 9, Task 10 |
| 5 Checker: Auflösen | Task 4, Task 5, Task 6 |
| 5 Checker: Autovervollständigung statt Rückfrage, beide Ebenen nebeneinander | Task 10 (`CatalogPicker`) |
| 5 Checker: Notausgang „Neu anlegen", ungeprüft | Task 6, Task 10 |
| 5 Checker: Nachfragen nur bei streuender Seltenheit | Task 5 (`needsPrecisionHint`), Task 10 |
| 5 Checker: zweiter Einsatzort Suche | Task 16 |
| 6 Seltenheit gemessen plus Grundwert | Task 12 |
| 6 Tiefe des Treffers, der Ungenauere zieht herunter | Task 13 (`matchDepth`) |
| 6 Kombinationen wiegen schwerer | Task 13 (`COMBO_FACTOR`) |
| 6 Wunschliste und Verbrauchsmaterial als Dimensionen | Task 13 (`KIND_WEIGHTS`) |
| 6 Gestaffelte Tiefe, alles optional | Task 9 (nur `catalog_item_id` Pflicht), Task 10 |
| 6 Transparenz: jeder Vorschlag nennt seinen Grund | Task 14 |
| 7 Profil, nur Anzeigename Pflicht, keine Ortsdaten | Task 7, Task 17 |
| 7 Equipment-Liste für alle Angemeldeten sichtbar | Task 9 (RLS) |
| 9 Gear-Seite: Spieler, Ausführungen, Seltenheit | Task 15 |
| 9 Suche | Task 16 |
| 10 Gear-Seiten öffentlich, Rest hinter Login, Sitemap | Task 2, Task 9, Task 15 |
| 11 Erster Rig-Eintrag, zwei Klicks | Task 11 |
| 11 Leere erklären statt kaschieren, Auffüllung gekennzeichnet | Task 14 |
| 12 Logik in Server-Routen, RLS Pflicht, service_role serverseitig | Global Constraints, Task 6, Task 14, Task 15 |
| 14 Sprache der Oberfläche | Entschieden: Code englisch, UI deutsch — Task 8 |
| 14 Umfang Seed-Katalog | Entschieden: ~200 — Task 3 |
| 14 Umfang Seed-Nutzer | Entschieden: ~20 — Task 18 |

### Nicht in diesem Plan

| Punkt | Grund |
|---|---|
| Feed, Posts, Kommentare, Likes, Folgen, Freundschaft, DMs, Benachrichtigungen | Stufe 2, eigener Plan |
| Live-Chat, Katalog-Backoffice, weitere Instrumente | Stufe 3, eigener Plan |
| Bild-Limits, Reaktionstypen | Offene Punkte aus Abschnitt 14, betreffen Stufe 2 |
| Hosting des Frontends | Offener Punkt aus Abschnitt 14, ohne Einfluss auf Stufe 1 |
| Alles aus Abschnitt 15 | Vorbehalte für den Produktivbetrieb, im Prototyp bewusst zurückgestellt |
| Signalketten-Matching („Tube Screamer in Deluxe Reverb" als Paar) | Bewusste Näherung in Task 13, dort begründet |

### Was dieser Plan über die Spec hinaus festlegt

Diese Entscheidungen standen nicht in der Spec und wurden beim Planen getroffen. Wer sie ändern will, findet hier den Grund:

| Entscheidung | Warum |
|---|---|
| Marke als eigene Tabelle statt Textspalte | Eine Freitext-Marke bringt genau die Dubletten zurück, gegen die der Katalog gebaut ist. |
| Kategorien als Tabelle ohne Label, Labels in `de.ts` | Hält die Sprachentscheidung konsequent: sichtbare Texte liegen an einer Stelle. |
| Katalog-Snapshot im Nitro-Speicher statt Trigram-Index | Bei ~200 Einträgen kein DB-Roundtrip pro Tastendruck, und die Matching-Logik bleibt rein und testbar. Ab einigen tausend Einträgen gehört das in Postgres. |
| `slug` am Katalog-Eintrag | Abschnitt 10 verlangt Auffindbarkeit über Suchmaschinen; eine UUID in der Adresse hilft dabei nicht. |
| Kombinations-Bonus als überproportionale Verstärkung | Prototyp-Näherung für „Kombinationen wiegen schwerer". Das echte Signalketten-Matching braucht einen Vergleich über `installed_in`. |
| Spielerzahl auf der Gear-Seite öffentlich, Namen erst mit Login | Die Zahl macht das Schaufenster gut, die Namen sind Profildaten und stehen laut Abschnitt 10 hinter dem Login. |
| Tests gegen die gehostete Instanz mit Präfix `rigmate-test-` | Lokales Docker-Supabase ist laut Abschnitt 12 bewusst ausgeschlossen; das Präfix plus `deleteTestUsers()` hält die geteilte Instanz sauber. |
