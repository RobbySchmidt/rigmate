# Profilseite und Designsystem — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die Profilseite bekommt eine eigene Designsprache, ein zweispaltiges Layout mit Equipment-Panel links und Feed rechts, und einen Signalketten-Reiter, den man per Drag and Drop pflegt.

**Architecture:** Farb- und Schrifttokens kommen zentral nach `main.css`, damit der Rest der App spaeter dieselben benutzt. Die Profilseite wird in kleine Komponenten zerlegt, jede mit einer Aufgabe. Die Kettenreihenfolge liegt als `chain_position` auf `gear_items` und wird komplett ueber eine Postgres-Funktion geschrieben, nie zeilenweise. Der Feed lebt vorerst ausschliesslich von Rig-Ereignissen, die aus `gear_items.created_at` abgeleitet werden — keine neue Tabelle.

**Tech Stack:** Nuxt 4 (SSR) · Vue 3 · Tailwind v4 · Supabase (Postgres, RLS) · vuedraggable 4.1.0 · Vitest + @vue/test-utils

**Spec:** [2026-09-07-rigmate-profil-design.md](../specs/2026-09-07-rigmate-profil-design.md) — bei Widerspruch gewinnt die Spec.

---

## Vorab: Regeln, die jeden Task betreffen

Diese Punkte haben in diesem Projekt schon mehrfach Zeit gekostet. Sie gelten in **jedem** Task:

1. **In `.vue`-Dateien keine echten Umlaute** — auch nicht in Kommentaren. „ae", „oe", „ue", „ss". Der Sprachtest scannt die ganze Datei. In `.ts` und `.sql` sind Umlaute erlaubt.
2. **Kein sichtbarer Text im Template.** Alles ueber `t.*` aus `app/locales/de.ts`. Auch `placeholder`, `title`, `aria-label`, `alt` muessen gebunden sein (`:aria-label="t.x"`), sonst schlaegt `tests/unit/locale.test.ts` fehl.
3. **Jede Supabase-Antwort und jedes `$fetch` prueft seinen Fehler** und macht ihn vom leeren Ergebnis unterscheidbar. Vorbild: die heutige `app/pages/profile/[id].vue` mit vier getrennten Fehler-Flags.
4. **Bei jedem neuen Test fragen: kann der ueberhaupt fehlschlagen?** Im Zweifel Fix zuruecknehmen, Test scheitern sehen, Fix wieder einbauen.
5. **Nutzer-Id nie direkt aus den Claims.** `useUserId()` im Client, `authUser()` auf dem Server — `@nuxtjs/supabase` liefert `sub`, nicht `id`.

Einzelne Testdatei laufen lassen: `yarn vitest run <pfad>`. Alles: `yarn test`.

---

## Dateien

**Neu:**

| Datei | Aufgabe |
|---|---|
| `supabase/migrations/<ts>_chain_order.sql` | Spalte `chain_position`, Funktion `set_chain_order` |
| `app/components/RarityPip.vue` | Seltenheitspunkt, einzige Stelle fuer Stufe → Darstellung |
| `app/components/GearList.vue` | kategorisierte Equipment-Liste |
| `app/components/SignalChain.vue` | senkrechte Kette zum Ansehen, mit Patchkabeln |
| `app/components/SignalChainEditor.vue` | dieselbe Kette bearbeitbar |
| `app/components/GearPool.vue` | rechte Spalte im Bearbeitungsmodus |
| `app/components/GearPanel.vue` | linkes Panel, haelt die beiden Reiter |
| `app/components/ProfileHeader.vue` | Avatar, Name, Bio, Kennzahlen, Aktionen |
| `app/components/FeedItem.vue` | ein Feed-Beitrag |
| `app/composables/useChainOrder.ts` | sammelt Aenderungen, schreibt gebuendelt, meldet Fehler |
| `shared/utils/rigEvents.ts` | leitet Rig-Ereignisse aus Gear-Zeilen ab |
| `server/api/profile/[id]/mates.get.ts` | Anzahl Rig-Kollegen, aggregiert |

**Geaendert:** `app/assets/css/main.css` · `app/locales/de.ts` · `app/pages/profile/[id].vue` · `tests/helpers/supabaseStub.ts` · `tests/component/profile.test.ts` · `nuxt.config.ts` · `package.json` · `CLAUDE.md`

**Nachtraeglich dazugekommen (Tasks 17-19):** Sobald die Farbtokens stehen, greift `prefers-color-scheme: dark`
fuer jeden, dessen System dunkel steht — waehrend 73 fest verdrahtete Hell-Klassen in 13 Dateien weiterleben.
Robbys Entscheidung: die restlichen Seiten mitnehmen, statt den Dunkelmodus stillzulegen. Betroffen sind
`login`, `register`, `confirm`, `index`, `search`, `settings`, `onboarding`, `gear/[slug]`, `rig` sowie
`CatalogPicker`, `GearItemForm` und `PersonSuggestion`. `profile/[id].vue` faellt raus, das baut Task 16 neu.

---

## Task 1: Migration — `chain_position` und `set_chain_order`

**Files:**
- Create: `supabase/migrations/<timestamp>_chain_order.sql` (Name entsteht durch `yarn db:new`)
- Create: `tests/db/chainOrder.test.ts`

- [ ] **Step 1: Migration anlegen**

```bash
yarn db:new chain_order
```

Den erzeugten Dateinamen merken.

- [ ] **Step 2: Migration schreiben**

```sql
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
```

- [ ] **Step 3: Test schreiben**

Zuerst `tests/helpers/testUser.ts` lesen und die dortigen Namen verwenden — die Aufrufe unten unterstellen `createTestUser()`, `deleteTestUsers()` und einen angemeldeten Client. Heissen sie anders, **den Test anpassen, nicht die Helfer**.

`tests/db/chainOrder.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { serviceClient } from '../helpers/supabase'
import { createTestUser, deleteTestUsers } from '../helpers/testUser'

describe('chain_position und set_chain_order', () => {
  const admin = serviceClient()
  let user: Awaited<ReturnType<typeof createTestUser>>
  let gearIds: string[] = []

  beforeAll(async () => {
    await deleteTestUsers()
    user = await createTestUser()

    const { data: items, error } = await admin.from('catalog_items').select('id').limit(3)
    if (error) throw error
    expect(items).toHaveLength(3)

    const { data: created, error: insertError } = await admin
      .from('gear_items')
      .insert(items!.map((item) => ({ owner_id: user.id, catalog_item_id: item.id })))
      .select('id')
    if (insertError) throw insertError
    gearIds = created!.map((row) => row.id)
    expect(gearIds).toHaveLength(3)
  })

  afterAll(async () => {
    await deleteTestUsers()
  })

  it('legt neue Geraete ohne Kettenposition an', async () => {
    const { data, error } = await admin
      .from('gear_items')
      .select('chain_position')
      .eq('owner_id', user.id)
    expect(error).toBeNull()
    expect(data!.every((row) => row.chain_position === null)).toBe(true)
  })

  it('nummeriert die uebergebene Reihenfolge von 1 an durch', async () => {
    const { error } = await user.client.rpc('set_chain_order', { item_ids: gearIds })
    expect(error).toBeNull()

    const { data } = await admin
      .from('gear_items')
      .select('id, chain_position')
      .eq('owner_id', user.id)

    const positions = gearIds.map((id) => data!.find((row) => row.id === id)!.chain_position)
    expect(positions).toEqual([1, 2, 3])
  })

  it('nimmt Geraete aus der Kette, die im neuen Aufruf fehlen', async () => {
    const { error } = await user.client.rpc('set_chain_order', {
      item_ids: [gearIds[2], gearIds[0]],
    })
    expect(error).toBeNull()

    const { data } = await admin
      .from('gear_items')
      .select('id, chain_position')
      .eq('owner_id', user.id)
    const byId = Object.fromEntries(data!.map((row) => [row.id, row.chain_position]))

    expect(byId[gearIds[2]]).toBe(1)
    expect(byId[gearIds[0]]).toBe(2)
    expect(byId[gearIds[1]]).toBeNull()
  })

  it('vertauscht zwei Positionen, ohne an einer Eindeutigkeit zu scheitern', async () => {
    await user.client.rpc('set_chain_order', { item_ids: [gearIds[0], gearIds[1]] })
    const { error } = await user.client.rpc('set_chain_order', {
      item_ids: [gearIds[1], gearIds[0]],
    })
    expect(error).toBeNull()

    const { data } = await admin
      .from('gear_items')
      .select('id, chain_position')
      .eq('owner_id', user.id)
    const byId = Object.fromEntries(data!.map((row) => [row.id, row.chain_position]))

    expect(byId[gearIds[1]]).toBe(1)
    expect(byId[gearIds[0]]).toBe(2)
  })

  it('lehnt fremde Geraete laut ab, statt sie still zu uebergehen', async () => {
    const other = await createTestUser()
    const { data: items } = await admin.from('catalog_items').select('id').limit(1)
    const { data: created } = await admin
      .from('gear_items')
      .insert({ owner_id: other.id, catalog_item_id: items![0].id })
      .select('id')

    const { error } = await user.client.rpc('set_chain_order', {
      item_ids: [gearIds[0], created![0].id],
    })

    expect(error).not.toBeNull()
    expect(error!.message).toMatch(/not owned by caller/)
  })
})
```

- [ ] **Step 4: Test laufen lassen, Fehlschlag sehen**

```bash
yarn vitest run tests/db/chainOrder.test.ts
```

Erwartet: FAIL — `column gear_items.chain_position does not exist` bzw. `function set_chain_order does not exist`.

- [ ] **Step 5: Migration anwenden**

```bash
yarn db:push
```

- [ ] **Step 6: Test laufen lassen, gruen sehen**

```bash
yarn vitest run tests/db/chainOrder.test.ts
```

Erwartet: 5 Tests PASS.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations tests/db/chainOrder.test.ts
git commit -m "feat(db): Kettenposition auf gear_items und set_chain_order"
```

---

## Task 2: Der Test-Stub lernt `rpc`

`tests/helpers/supabaseStub.ts` kennt heute nur `.from()`. Ohne `rpc` kann kein Komponententest das Speichern der Kette pruefen, und ein fehlendes `rpc` faellt als `undefined is not a function` auf statt als klare Meldung.

**Files:**
- Modify: `tests/helpers/supabaseStub.ts`
- Create: `tests/unit/supabaseStubRpc.test.ts`

- [ ] **Step 1: Test schreiben**

```ts
import { describe, it, expect } from 'vitest'
import { createSupabaseStub } from '../helpers/supabaseStub'

describe('supabaseStub.rpc', () => {
  it('zeichnet Name und Nutzlast jedes Aufrufs auf', async () => {
    const supabase = createSupabaseStub()
    await supabase.rpc('set_chain_order', { item_ids: ['a', 'b'] })

    expect(supabase.rpcCalls).toEqual([
      { name: 'set_chain_order', payload: { item_ids: ['a', 'b'] } },
    ])
  })

  it('gibt konfigurierte Fehler zurueck, statt zu werfen', async () => {
    const supabase = createSupabaseStub({
      rpcResults: { set_chain_order: [{ error: { message: 'boom' } }] },
    })

    const { error } = await supabase.rpc('set_chain_order', { item_ids: [] })
    expect(error).toEqual({ message: 'boom' })
  })

  it('arbeitet mehrere Ergebnisse der Reihe nach ab', async () => {
    const supabase = createSupabaseStub({
      rpcResults: {
        set_chain_order: [{ error: { message: 'erster Versuch' } }, { error: null }],
      },
    })

    const first = await supabase.rpc('set_chain_order', { item_ids: [] })
    const second = await supabase.rpc('set_chain_order', { item_ids: [] })

    expect(first.error).toEqual({ message: 'erster Versuch' })
    expect(second.error).toBeNull()
  })
})
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag sehen**

```bash
yarn vitest run tests/unit/supabaseStubRpc.test.ts
```

Erwartet: FAIL — `supabase.rpc is not a function`.

- [ ] **Step 3: Stub erweitern**

`SupabaseStubConfig` um ein Feld ergaenzen:

```ts
  /** Ergebnisse je RPC-Name, der Reihe nach abgearbeitet. Fehlt ein Eintrag, gilt der Aufruf als erfolgreich. */
  rpcResults?: Record<string, QueryResult[]>
```

Und in `createSupabaseStub` die Zeile `return { from, inserts, updates }` ersetzen durch:

```ts
  // Ein Eintrag je rpc()-Aufruf. Ohne die Nutzlast koennte ein Test nur
  // sehen, DASS gespeichert wurde, nicht WELCHE Reihenfolge - dieselbe
  // Luecke, die bei .insert() acht Schreibstellen unbemerkt kaputt liess.
  const rpcCalls: Array<{ name: string; payload: unknown }> = []
  const rpcQueues: Record<string, QueryResult[]> = {}
  for (const [name, queue] of Object.entries(config.rpcResults ?? {})) {
    rpcQueues[name] = [...queue]
  }

  const rpc = vi.fn((name: string, payload?: unknown) => {
    rpcCalls.push({ name, payload })
    const result = rpcQueues[name]?.shift() ?? { data: null, error: null }
    return Promise.resolve({ data: result.data ?? null, error: result.error ?? null })
  })

  return { from, rpc, inserts, updates, rpcCalls }
```

- [ ] **Step 4: Test laufen lassen, gruen sehen**

```bash
yarn vitest run tests/unit/supabaseStubRpc.test.ts
```

Erwartet: 3 Tests PASS.

- [ ] **Step 5: Alle Tests, weil mehrere Dateien den Stub benutzen**

```bash
yarn test
```

Erwartet: alles gruen.

- [ ] **Step 6: Commit**

```bash
git add tests/helpers/supabaseStub.ts tests/unit/supabaseStubRpc.test.ts
git commit -m "test: Supabase-Stub kann rpc und zeichnet die Nutzlast auf"
```

---

## Task 3: Farb- und Schrifttokens

**Files:**
- Modify: `app/assets/css/main.css`
- Modify: `nuxt.config.ts`
- Modify: `app/layouts/default.vue`

- [ ] **Step 1: Tokens in `main.css` ergaenzen**

**Vor** den vorhandenen `@theme inline`-Block:

```css
/* Farbwelt: Verstaerkerfrontplatte, Pedalgehaeuse, Werkstatt.
   Zwei Akzente mit strikt getrennten Rollen - Petrol fuehrt durch die
   Oberflaeche, Bernstein gehoert AUSSCHLIESSLICH der Seltenheit. Sie ist
   bei Rigmate keine Verzierung, sondern die Mechanik, ueber die Menschen
   einander finden. Wer Bernstein woanders benutzt, macht sie unlesbar. */
:root {
  --rm-bg: #e9e7e1;
  --rm-surface: #faf9f6;
  --rm-surface-2: #f1efe9;
  --rm-ink: #191c1e;
  --rm-muted: #6a7175;
  --rm-line: #cfccc4;
  --rm-line-soft: #dedbd3;
  --rm-accent: #0d5a61;
  --rm-accent-ink: #ffffff;
  --rm-accent-wash: #dbe8e8;
  --rm-rare: #a8631a;
  --rm-rare-wash: #f4e6d3;
  --rm-special: #8a6a34;
  color-scheme: light;
}

/* Nur Ueberschreibungen. Jedes Token ist oben vollstaendig definiert - eine
   Farbe, die es nur hier drin gaebe, faellt im un-gestempelten Zustand auf
   keinen Wert zurueck. */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --rm-bg: #131617;
    --rm-surface: #1d2123;
    --rm-surface-2: #24292b;
    --rm-ink: #e9e7e1;
    --rm-muted: #929b9e;
    --rm-line: #343b3d;
    --rm-line-soft: #2a3032;
    --rm-accent: #4aacb2;
    --rm-accent-ink: #0b1416;
    --rm-accent-wash: #1a3134;
    --rm-rare: #dfa257;
    --rm-rare-wash: #2e2313;
    --rm-special: #b99a68;
    color-scheme: dark;
  }
}

:root[data-theme="dark"] {
  --rm-bg: #131617;
  --rm-surface: #1d2123;
  --rm-surface-2: #24292b;
  --rm-ink: #e9e7e1;
  --rm-muted: #929b9e;
  --rm-line: #343b3d;
  --rm-line-soft: #2a3032;
  --rm-accent: #4aacb2;
  --rm-accent-ink: #0b1416;
  --rm-accent-wash: #1a3134;
  --rm-rare: #dfa257;
  --rm-rare-wash: #2e2313;
  --rm-special: #b99a68;
  color-scheme: dark;
}
```

**Innerhalb** des vorhandenen `@theme inline`-Blocks, unter die fluiden Groessen:

```css
  /* Farben als Tailwind-Utilities: bg-surface, text-rare, border-line, ...
     Die Werte zeigen auf die --rm-*-Variablen oben, damit der Theme-Wechsel
     ueber sie laeuft und nicht ueber doppelte Utility-Definitionen. */
  --color-bg: var(--rm-bg);
  --color-surface: var(--rm-surface);
  --color-surface-2: var(--rm-surface-2);
  --color-ink: var(--rm-ink);
  --color-muted: var(--rm-muted);
  --color-line: var(--rm-line);
  --color-line-soft: var(--rm-line-soft);
  --color-accent: var(--rm-accent);
  --color-accent-ink: var(--rm-accent-ink);
  --color-accent-wash: var(--rm-accent-wash);
  --color-rare: var(--rm-rare);
  --color-rare-wash: var(--rm-rare-wash);
  --color-special: var(--rm-special);

  /* Display fuer Ueberschriften und Geraetenamen, Sans fuer Fliesstext,
     Mono fuer Gear-Daten - Baujahr und Finish lesen sich wie technische
     Angaben, also sehen sie auch so aus. */
  --font-display: Archivo, ui-sans-serif, system-ui, sans-serif;
  --font-sans: "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, monospace;
```

- [ ] **Step 2: Schriften einbinden**

In `nuxt.config.ts` (falls `app.head` fehlt, den Block anlegen):

```ts
  app: {
    head: {
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap',
        },
      ],
    },
  },
```

- [ ] **Step 3: Layout auf die Tokens umstellen**

In `app/layouts/default.vue`:

- `min-h-screen bg-neutral-50 text-neutral-900` → `min-h-screen bg-bg font-sans text-ink`
- `border-b border-neutral-200 bg-white` → `border-b border-line bg-surface`
- Beim Logo-Link `text-f-xl font-semibold` → `text-f-xl font-display font-semibold`

- [ ] **Step 4: Ansehen**

```bash
yarn dev
```

`http://localhost:3000/login` oeffnen. Erwartet: warmer Papiergrund statt Grau, Archivo in der Kopfzeile, im Dunkelmodus dunkler Grund mit hellem Text.

**Achtung:** Nuxt bindet auf `[::1]:3000` (IPv6). Auf deutschem Windows heisst der Zustand in `netstat` **`ABHOEREN`**, nicht `LISTENING`.

- [ ] **Step 5: Tests**

```bash
yarn test
```

Erwartet: gruen. Haengt ein Komponententest an einer geaenderten Klasse, den Test anpassen — nicht die Klasse zurueckdrehen.

- [ ] **Step 6: Commit**

```bash
git add app/assets/css/main.css nuxt.config.ts app/layouts/default.vue
git commit -m "feat(ui): Farb- und Schrifttokens, Layout darauf umgestellt"
```

---

## Task 4: Texte in `de.ts`

Alle Texte auf einmal, damit die folgenden Tasks `de.ts` nicht jedes Mal anfassen.

**Files:**
- Modify: `app/locales/de.ts`

- [ ] **Step 1: Vorhandenen Block ansehen**

```bash
grep -n "profile:" -A 20 app/locales/de.ts
```

- [ ] **Step 2: Texte ergaenzen**

**Achtung, Schreibweise:** Die Texte unten stehen hier mit „ae/oe/ue" — das ist die Regel fuer
`.vue`-Dateien und **hier falsch**. `de.ts` ist eine `.ts`-Datei und benutzt durchgehend echte Umlaute
(34 Vorkommen: „Zubehör", „Künstlername", „bestätigt"). Diese Strings landen auf dem Bildschirm.
**Schreib sie mit echten Umlauten**, sonst steht auf der Oberflaeche ein Gemisch aus beidem.

Den `profile`-Block um diese Schluessel erweitern, vorhandene unveraendert lassen:

```ts
    // Kennzahlen im Kopf
    statDevices: 'Geraete',
    statRarities: 'Raritaeten',
    statSpecials: 'Besonderheiten',
    statMates: 'Rig-Kollegen',
    statMatesError: 'Anzahl der Rig-Kollegen konnte nicht geladen werden',

    // Aktionen, bis Stufe 2 deaktiviert
    follow: 'Folgen',
    message: 'Nachricht',
    stageTwoHint: 'Kommt in der naechsten Ausbaustufe',

    // Reiter im linken Panel
    tabEquipment: 'Equipment',
    tabChain: 'Signal Chain',
    tabsLabel: 'Ansicht des Equipments',

    // Seltenheit: NICHT anlegen. Diese beiden Schluessel wurden waehrend der
    // Umsetzung wieder gestrichen - "selten"/"besonders" standen im
    // Widerspruch zu "rar"/"speziell", die gear/[slug].vue schon zeigte.
    // Es gibt jetzt einen Top-Level-Block "rarity" mit allen vier Stufen,
    // aus dem beide Seiten lesen. Wer den Plan woertlich abschreibt, legt
    // die Doppelung wieder an.

    // Signalkette
    chainEmptyOwn: 'Keine Signal Chain angelegt',
    chainEmptyOwnHint: 'Trag ein, in welcher Reihenfolge dein Signal durch die Geraete laeuft.',
    chainEmptyDrop: 'Zieh ein Geraet hierher, um anzufangen',
    chainOutsideTitle: 'Nicht in der Kette',
    chainOutsideHint: 'Saiten, Plektren und Zubehoer stehen unter Equipment.',
    chainEdit: 'Kette bearbeiten',
    chainDone: 'Fertig',
    chainPoolTitle: 'Geraete hinzufuegen',
    chainPoolHint: 'Nach links ziehen, um eine Station anzuhaengen. Was hier stehen bleibt, taucht weiterhin unter Equipment auf.',
    chainPoolEmpty: 'Alle Geraete stehen in der Kette.',
    chainAppend: 'Anhaengen',
    chainMoveUp: 'Nach oben',
    chainMoveDown: 'Nach unten',
    chainRemove: 'Aus der Kette nehmen',
    chainDragHandle: 'Zum Umsortieren ziehen',
    chainSaving: 'Wird gespeichert',
    chainSaved: 'Reihenfolge gespeichert',
    chainSaveError: 'Reihenfolge konnte nicht gespeichert werden',
    chainRetry: 'Erneut versuchen',
    chainRemovedHint: 'Aus der Kette genommen, bleibt im Rig.',

    // Feed
    feedTitle: 'Verlauf',
    feedEmpty: 'Noch nichts passiert.',
    feedError: 'Der Verlauf konnte nicht geladen werden',
    feedEventLabel: 'Rig-Ereignis',
    feedAddedOne: 'hat ein Geraet ins Rig geholt',
    feedAddedMany: 'hat Geraete ins Rig geholt',
    feedRareTitle: 'Selten',
    feedRareOnly: 'Niemand sonst hier spielt das.',
```

- [ ] **Step 3: Sprachtest**

```bash
yarn vitest run tests/unit/locale.test.ts
```

Erwartet: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/locales/de.ts
git commit -m "feat(i18n): Texte fuer Profilumbau und Signalkette"
```

---

## Task 5: `RarityPip.vue`

Die einzige Stelle, an der Seltenheitsstufe zu Darstellung wird — nach dem Vorbild von `shared/utils/rarityBase.ts`, das existiert, weil die Werteliste vorher dreifach im Code stand.

**Files:**
- Create: `app/components/RarityPip.vue`
- Create: `tests/component/rarityPip.test.ts`

- [ ] **Step 1: Test schreiben**

```ts
// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RarityPip from '../../app/components/RarityPip.vue'

describe('RarityPip', () => {
  it('zeigt einen gefuellten Punkt bei rare', () => {
    const wrapper = mount(RarityPip, { props: { rarity: 'rare' } })
    expect(wrapper.classes()).toContain('bg-rare')
  })

  it('zeigt einen hohlen Ring bei special', () => {
    const wrapper = mount(RarityPip, { props: { rarity: 'special' } })
    expect(wrapper.classes()).toContain('border-special')
    expect(wrapper.classes()).not.toContain('bg-special')
  })

  it('bleibt bei common still - sonst leuchtet die ganze Liste', () => {
    const wrapper = mount(RarityPip, { props: { rarity: 'common' } })
    expect(wrapper.classes()).not.toContain('bg-rare')
    expect(wrapper.classes()).not.toContain('border-special')
  })

  it('bleibt auch bei mass still', () => {
    const wrapper = mount(RarityPip, { props: { rarity: 'mass' } })
    expect(wrapper.classes()).not.toContain('bg-rare')
    expect(wrapper.classes()).not.toContain('border-special')
  })

  it('vertraegt null, ohne zu brechen', () => {
    const wrapper = mount(RarityPip, { props: { rarity: null } })
    expect(wrapper.classes()).not.toContain('bg-rare')
  })
})
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag sehen**

```bash
yarn vitest run tests/component/rarityPip.test.ts
```

Erwartet: FAIL — Datei existiert nicht.

- [ ] **Step 3: Komponente schreiben**

`app/components/RarityPip.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import type { RarityBase } from '#shared/utils/rarityBase'

// Nur zwei der vier Stufen bekommen eine Auszeichnung. Leuchten alle vier,
// sagt die Auszeichnung nichts mehr - "mass" und "common" bleiben still.
const props = defineProps<{ rarity: RarityBase | null }>()

const pipClass = computed(() => {
  if (props.rarity === 'rare') return 'bg-rare border-rare'
  if (props.rarity === 'special') return 'border-special'
  return 'bg-line opacity-55'
})
</script>

<template>
  <span
    class="mt-[.45rem] block size-2 shrink-0 rounded-full border-[1.5px] border-transparent"
    :class="pipClass"
    aria-hidden="true"
  />
</template>
```

- [ ] **Step 4: Test laufen lassen, gruen sehen**

```bash
yarn vitest run tests/component/rarityPip.test.ts
```

Erwartet: 5 Tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/components/RarityPip.vue tests/component/rarityPip.test.ts
git commit -m "feat(ui): RarityPip als einzige Stelle fuer Seltenheitsdarstellung"
```

---

## Task 6: `GearList.vue` — kategorisierte Equipment-Liste

**Files:**
- Create: `app/components/GearList.vue`
- Create: `tests/component/gearList.test.ts`

Die Komponente bekommt fertige Gruppen von aussen — sie holt selbst keine Daten. Erwartete Form:

```ts
interface GearListEntry {
  id: string
  slug: string
  label: string          // "Gretsch White Falcon"
  detail: string | null  // "1997 · White", schon zusammengebaut
  rarity: RarityBase | null
}
interface GearListGroup {
  key: string            // Kategorie-Id oder 'wishlist'
  label: string          // schon uebersetzt
  entries: GearListEntry[]
}
```

- [ ] **Step 1: Test schreiben**

```ts
// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import GearList from '../../app/components/GearList.vue'

const NuxtLinkStub = defineComponent({
  props: ['to'],
  setup(props, { slots }) {
    return () => h('a', { href: props.to }, slots.default?.())
  },
})

const groups = [
  {
    key: 'guitar',
    label: 'Gitarre',
    entries: [
      {
        id: 'g1',
        slug: 'gretsch-white-falcon',
        label: 'Gretsch White Falcon',
        detail: '1997',
        rarity: 'rare' as const,
      },
    ],
  },
  {
    key: 'amp',
    label: 'Amp',
    entries: [
      { id: 'g2', slug: 'marshall-jtm45', label: 'Marshall JTM45', detail: null, rarity: 'special' as const },
    ],
  },
]

function mountList(props: Record<string, unknown>) {
  return mount(GearList, {
    props,
    global: { components: { NuxtLink: NuxtLinkStub }, stubs: { RarityPip: true } },
  })
}

describe('GearList', () => {
  it('zeigt je Gruppe ein Label mit der Anzahl', () => {
    const wrapper = mountList({ groups })
    const text = wrapper.text()
    expect(text).toContain('Gitarre')
    expect(text).toContain('Amp')
  })

  it('verlinkt jeden Eintrag auf seine Gear-Seite', () => {
    const wrapper = mountList({ groups })
    const links = wrapper.findAll('a')
    expect(links.map((link) => link.attributes('href'))).toEqual([
      '/gear/gretsch-white-falcon',
      '/gear/marshall-jtm45',
    ])
  })

  it('faerbt eine Rarität anders als ein Allerweltsgeraet', () => {
    const wrapper = mountList({ groups })
    const links = wrapper.findAll('a')
    expect(links[0].classes()).toContain('text-rare')
    expect(links[1].classes()).toContain('text-special')
  })

  it('zeigt Detailangaben, wenn es welche gibt', () => {
    const wrapper = mountList({ groups })
    expect(wrapper.text()).toContain('1997')
  })

  it('laesst leere Gruppen ganz weg, statt eine leere Ueberschrift zu zeigen', () => {
    const wrapper = mountList({
      groups: [...groups, { key: 'pedal', label: 'Pedal', entries: [] }],
    })
    expect(wrapper.text()).not.toContain('Pedal')
  })
})
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag sehen**

```bash
yarn vitest run tests/component/gearList.test.ts
```

Erwartet: FAIL — Datei existiert nicht.

- [ ] **Step 3: Komponente schreiben**

`app/components/GearList.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import type { RarityBase } from '#shared/utils/rarityBase'

export interface GearListEntry {
  id: string
  slug: string
  label: string
  detail: string | null
  rarity: RarityBase | null
}

export interface GearListGroup {
  key: string
  label: string
  entries: GearListEntry[]
}

const props = defineProps<{ groups: GearListGroup[] }>()

// Kategorien sind Trennlinien, keine Kaesten. Bei vier Geraeten ist das
// gleichgueltig, bei vierzig entscheidet es darueber, ob das Panel noch
// lesbar ist. Eine Gruppe ohne Eintraege waere eine leere Ueberschrift -
// die faellt hier raus statt im Template versteckt zu werden.
const filled = computed(() => props.groups.filter((group) => group.entries.length > 0))

function nameClass(rarity: RarityBase | null): string {
  if (rarity === 'rare') return 'text-rare font-medium'
  if (rarity === 'special') return 'text-special'
  return 'text-ink'
}
</script>

<template>
  <div class="flex flex-col gap-[1.15rem]">
    <div v-for="group in filled" :key="group.key" class="flex flex-col gap-1">
      <div
        class="flex items-baseline justify-between border-b border-line-soft pb-1 font-mono text-[.6875rem] uppercase tracking-[.1em] text-muted"
      >
        <span>{{ group.label }}</span>
        <span class="tabular-nums opacity-70">{{ group.entries.length }}</span>
      </div>
      <ul class="flex list-none flex-col p-0">
        <li v-for="entry in group.entries" :key="entry.id" class="flex items-baseline gap-[.45rem] py-[.28rem]">
          <RarityPip :rarity="entry.rarity" />
          <NuxtLink
            :to="`/gear/${entry.slug}`"
            class="border-b border-transparent text-[.9rem] leading-snug no-underline hover:border-current hover:text-accent"
            :class="nameClass(entry.rarity)"
          >
            {{ entry.label }}
          </NuxtLink>
          <span v-if="entry.detail" class="font-mono text-xs tabular-nums text-muted">{{ entry.detail }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>
```

- [ ] **Step 4: Test laufen lassen, gruen sehen**

```bash
yarn vitest run tests/component/gearList.test.ts
```

Erwartet: 5 Tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/components/GearList.vue tests/component/gearList.test.ts
git commit -m "feat(ui): GearList mit kategorisierten Gruppen und Seltenheitspunkten"
```

---

## Task 7: `SignalChain.vue` — Kette zum Ansehen

**Files:**
- Create: `app/components/SignalChain.vue`
- Create: `tests/component/signalChain.test.ts`

- [ ] **Step 1: Test schreiben**

```ts
// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import SignalChain from '../../app/components/SignalChain.vue'
import { de } from '../../app/locales/de'

const NuxtLinkStub = defineComponent({
  props: ['to'],
  setup(props, { slots }) {
    return () => h('a', { href: props.to }, slots.default?.())
  },
})

const stations = [
  {
    id: 'g1',
    slug: 'gretsch-white-falcon',
    category: 'Gitarre',
    label: 'Gretsch White Falcon',
    detail: '1997 · White',
    rarity: 'rare' as const,
  },
  { id: 'g2', slug: 'boss-ce-2', category: 'Pedal', label: 'Boss CE-2 Chorus', detail: null, rarity: 'special' as const },
  { id: 'g3', slug: 'marshall-jtm45', category: 'Amp', label: 'Marshall JTM45', detail: null, rarity: 'special' as const },
]

function mountChain(props: Record<string, unknown>) {
  return mount(SignalChain, {
    props: { stations, isOwn: false, ...props },
    global: { components: { NuxtLink: NuxtLinkStub } },
  })
}

describe('SignalChain', () => {
  it('zeigt jede Station in der uebergebenen Reihenfolge', () => {
    const wrapper = mountChain({})
    const names = wrapper.findAll('a').map((link) => link.text())
    expect(names).toEqual(['Gretsch White Falcon', 'Boss CE-2 Chorus', 'Marshall JTM45'])
  })

  it('setzt ein Kabel zwischen die Stationen, aber keins hinter die letzte', () => {
    const wrapper = mountChain({})
    // Ein Kabel ins Nichts liest sich als fehlendes Glied.
    expect(wrapper.findAll('[data-cable]')).toHaveLength(stations.length - 1)
  })

  it('zeigt bei einer einzigen Station gar kein Kabel', () => {
    const wrapper = mountChain({ stations: [stations[0]] })
    expect(wrapper.findAll('[data-cable]')).toHaveLength(0)
  })

  it('erklaert dem Eigentuemer die leere Kette', () => {
    const wrapper = mountChain({ stations: [], isOwn: true })
    expect(wrapper.text()).toContain(de.profile.chainEmptyOwn)
  })

  it('zeigt Besuchern bei leerer Kette gar nichts', () => {
    const wrapper = mountChain({ stations: [], isOwn: false })
    // Auf einem fremden Profil ist ein leerer Reiter eine Sackgasse.
    expect(wrapper.text().trim()).toBe('')
  })
})
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag sehen**

```bash
yarn vitest run tests/component/signalChain.test.ts
```

Erwartet: FAIL — Datei existiert nicht.

- [ ] **Step 3: Komponente schreiben**

`app/components/SignalChain.vue`:

```vue
<script setup lang="ts">
import type { RarityBase } from '#shared/utils/rarityBase'

export interface ChainStation {
  id: string
  slug: string
  category: string
  label: string
  detail: string | null
  rarity: RarityBase | null
}

defineProps<{ stations: ChainStation[]; isOwn: boolean }>()

const t = useText()

function nodeClass(rarity: RarityBase | null): string {
  if (rarity === 'rare') return 'bg-rare border-rare'
  if (rarity === 'special') return 'border-special'
  return 'bg-surface border-line'
}

function nameClass(rarity: RarityBase | null): string {
  if (rarity === 'rare') return 'text-rare'
  if (rarity === 'special') return 'text-special'
  return 'text-ink'
}
</script>

<template>
  <div v-if="stations.length > 0" class="flex flex-col">
    <template v-for="(station, index) in stations" :key="station.id">
      <div class="grid grid-cols-[1.1rem_1fr] gap-x-[.6rem]">
        <div class="flex justify-center">
          <span class="mt-[.42rem] size-[.6rem] rounded-full border-[1.5px]" :class="nodeClass(station.rarity)" />
        </div>
        <div class="min-w-0">
          <span class="block font-mono text-[.625rem] uppercase leading-relaxed tracking-[.11em] text-muted">
            {{ station.category }}
          </span>
          <NuxtLink
            :to="`/gear/${station.slug}`"
            class="inline-block border-b border-transparent font-display text-[.9375rem] font-semibold leading-tight no-underline hover:border-current hover:text-accent"
            :class="nameClass(station.rarity)"
          >
            {{ station.label }}
          </NuxtLink>
          <span v-if="station.detail" class="block font-mono text-xs tabular-nums text-muted">
            {{ station.detail }}
          </span>
        </div>
      </div>

      <!-- Patchkabel, mittig zwischen zwei Stationen. Nie hinter der
           letzten - ein Kabel ins Nichts liest sich als fehlendes Glied. -->
      <div v-if="index < stations.length - 1" data-cable class="flex h-[1.35rem] justify-center text-line" aria-hidden="true">
        <svg viewBox="0 0 20 24" preserveAspectRatio="none" class="h-full w-5 overflow-visible">
          <path d="M10 0 C10 7 17 9 17 12 C17 15 10 17 10 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
        </svg>
      </div>
    </template>

    <div class="mt-4 border-t border-line-soft pt-[.9rem] text-[.8125rem] text-muted">
      <span class="mb-1 block font-mono text-[.6875rem] uppercase tracking-[.1em]">
        {{ t.profile.chainOutsideTitle }}
      </span>
      {{ t.profile.chainOutsideHint }}
    </div>
  </div>

  <!-- Auf dem eigenen Profil ist die leere Kette eine Einladung. Auf einem
       fremden waere sie eine Sackgasse, deshalb dort gar nichts. -->
  <div
    v-else-if="isOwn"
    class="rounded-sm border border-dashed border-line px-4 py-[1.1rem] text-center text-sm text-muted"
  >
    <b class="mb-1 block font-display text-[.9375rem] text-ink">{{ t.profile.chainEmptyOwn }}</b>
    {{ t.profile.chainEmptyOwnHint }}
  </div>
</template>
```

- [ ] **Step 4: Test laufen lassen, gruen sehen**

```bash
yarn vitest run tests/component/signalChain.test.ts
```

Erwartet: 5 Tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/components/SignalChain.vue tests/component/signalChain.test.ts
git commit -m "feat(ui): SignalChain mit Patchkabeln und getrennten Leerzustaenden"
```

---

## Task 8: `useChainOrder.ts` — buendeln, schreiben, Fehler zeigen

Diese Datei traegt den gefaehrlichsten Zustand der ganzen Seite: die Oberflaeche zeigt die neue Reihenfolge sofort, auch wenn das Speichern scheitert.

> **Nachtrag aus der Umsetzung: der Entwurf unten reicht nicht.** Gegen die naive Fassung gemessen,
> wurden sechs Tests rot. Drei verschiedene Wettlaeufe, alle unsichtbar:
>
> 1. Eine **alte Antwort kommt zurueck**, nachdem der Nutzer weitersortiert hat → `status` springt auf
>    `'saved'`, obwohl der neuere Stand nirgends steht. Genau die Luege, gegen die die Datei gebaut ist.
> 2. **Umgekehrt:** die alte Antwort scheitert → `'error'`, obwohl der neuere Stand gleich erfolgreich
>    sein wird. Fehlalarm plus Flackern.
> 3. Bei langsamer Antwort fliegen **zwei `set_chain_order`-Aufrufe gleichzeitig**. Die Funktion setzt
>    die ganze Kette — je nach Laufzeit gewinnt auf der Datenbank die aeltere Reihenfolge.
>
> Gebaut ist es jetzt mit `queuedVersion`/`sentVersion`: eine Antwort wird nur dann zu einem Zustand,
> wenn sie noch zum angezeigten Stand gehoert; sonst geht sofort der neue Stand hinterher. Es laeuft
> immer nur ein Durchgang, und die Schleife loescht dabei den offenen Timer — sonst schickt er denselben
> Stand ein zweites Mal.
>
> Ausserdem dazugekommen, jeweils mit Test:
> - **`lastError`** in der Rueckgabe. RG001 (abgemeldet) und RG005 (fremdes Geraet, Ansicht veraltet)
>   verlangen von der Oberflaeche verschiedene Reaktionen; ohne den Code bleibt ihr ein Sammeltext fuer
>   fuenf Ursachen. Wird bei jedem neuen `save()` geleert.
> - **`flushNow()`**, oeffentlich und `await`bar. `onScopeDispose` schickt den offenen Stand **sofort**,
>   statt den Timer nur abzuraeumen — ein `clearTimeout` allein waere der stille Verlust in Reinform.
> - **`try/catch` um den `rpc`.** Eine geworfene Rejection waere sonst unbehandelt *und* wuerde den
>   Durchgang mitten im Nachziehen abbrechen, so dass der Rest der Kette fuer immer liegen bleibt.

**Files:**
- Create: `app/composables/useChainOrder.ts`
- Create: `tests/unit/useChainOrder.test.ts`

- [ ] **Step 1: Test schreiben**

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useChainOrder } from '../../app/composables/useChainOrder'
import { createSupabaseStub } from '../helpers/supabaseStub'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useChainOrder', () => {
  it('schickt erst nach der Ruhezeit, und dann nur einmal', async () => {
    const supabase = createSupabaseStub()
    const chain = useChainOrder(supabase as never)

    chain.save(['a'])
    chain.save(['a', 'b'])
    chain.save(['b', 'a'])
    expect(supabase.rpcCalls).toHaveLength(0)

    await vi.advanceTimersByTimeAsync(400)

    expect(supabase.rpcCalls).toHaveLength(1)
    expect(supabase.rpcCalls[0]).toEqual({
      name: 'set_chain_order',
      payload: { item_ids: ['b', 'a'] },
    })
  })

  it('meldet Erfolg als eigenen Zustand', async () => {
    const supabase = createSupabaseStub()
    const chain = useChainOrder(supabase as never)

    chain.save(['a'])
    await vi.advanceTimersByTimeAsync(400)

    expect(chain.status.value).toBe('saved')
    expect(chain.failed.value).toBe(false)
  })

  it('macht einen Fehlschlag sichtbar, statt ihn zu verschlucken', async () => {
    const supabase = createSupabaseStub({
      rpcResults: { set_chain_order: [{ error: { message: 'boom' } }] },
    })
    const chain = useChainOrder(supabase as never)

    chain.save(['a'])
    await vi.advanceTimersByTimeAsync(400)

    // Ohne diesen Zustand zeigt die Oberflaeche die neue Reihenfolge, und
    // nach einem Neuladen ist sie weg - ohne dass etwas kaputt aussah.
    expect(chain.status.value).toBe('error')
    expect(chain.failed.value).toBe(true)
  })

  it('schickt beim Wiederholen dieselbe Reihenfolge erneut', async () => {
    const supabase = createSupabaseStub({
      rpcResults: { set_chain_order: [{ error: { message: 'boom' } }, { error: null }] },
    })
    const chain = useChainOrder(supabase as never)

    chain.save(['a', 'b'])
    await vi.advanceTimersByTimeAsync(400)
    expect(chain.failed.value).toBe(true)

    chain.retry()
    await vi.advanceTimersByTimeAsync(400)

    expect(supabase.rpcCalls).toHaveLength(2)
    expect(supabase.rpcCalls[1].payload).toEqual({ item_ids: ['a', 'b'] })
    expect(chain.status.value).toBe('saved')
  })
})
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag sehen**

```bash
yarn vitest run tests/unit/useChainOrder.test.ts
```

Erwartet: FAIL — Datei existiert nicht.

- [ ] **Step 3: Composable schreiben**

`app/composables/useChainOrder.ts`:

```ts
import { ref, computed } from 'vue'
import type { SupabaseClient } from '@supabase/supabase-js'

export type ChainSaveStatus = 'idle' | 'pending' | 'saved' | 'error'

const SETTLE_MS = 400

/**
 * Schreibt die Kettenreihenfolge. Zwei Dinge macht das hier und nichts
 * anderes:
 *
 * 1. Buendeln. Eine Verschiebung ist ein Schreibvorgang; fuenf schnelle
 *    Zuege waeren fuenf Anfragen. Es zaehlt nur der letzte Stand.
 * 2. Den Ausgang sichtbar machen. Die Oberflaeche zeigt die neue
 *    Reihenfolge sofort - scheitert das Speichern still, ist die Aenderung
 *    nach einem Neuladen weg, ohne dass je etwas kaputt aussah. Das ist der
 *    wiederkehrende Fehler dieses Projekts.
 */
export function useChainOrder(supabase: SupabaseClient) {
  const status = ref<ChainSaveStatus>('idle')
  const failed = computed(() => status.value === 'error')

  let timer: ReturnType<typeof setTimeout> | null = null
  let pendingIds: string[] = []

  async function flush() {
    timer = null
    const ids = pendingIds
    const { error } = await supabase.rpc('set_chain_order', { item_ids: ids })
    status.value = error ? 'error' : 'saved'
  }

  function save(itemIds: string[]) {
    pendingIds = [...itemIds]
    status.value = 'pending'
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => void flush(), SETTLE_MS)
  }

  /** Nach einem Fehlschlag denselben Stand erneut schicken. */
  function retry() {
    if (pendingIds.length === 0 && status.value !== 'error') return
    save(pendingIds)
  }

  return { status, failed, save, retry }
}
```

- [ ] **Step 4: Test laufen lassen, gruen sehen**

```bash
yarn vitest run tests/unit/useChainOrder.test.ts
```

Erwartet: 4 Tests PASS.

- [ ] **Step 5: Gegenprobe, dass der Fehlertest wirklich greift**

In `useChainOrder.ts` voruebergehend `status.value = error ? 'error' : 'saved'` durch `status.value = 'saved'` ersetzen und den Test erneut laufen lassen.

Erwartet: der Fehlschlag-Test schlaegt fehl. Danach die Zeile zurueckaendern und erneut gruen sehen. **Diesen Schritt nicht ueberspringen** — genau hier waren in diesem Projekt schon sechs Tests aus dem falschen Grund gruen.

- [ ] **Step 6: Commit**

```bash
git add app/composables/useChainOrder.ts tests/unit/useChainOrder.test.ts
git commit -m "feat(rig): useChainOrder buendelt Schreibvorgaenge und zeigt Fehlschlaege"
```

---

## Task 9: `vuedraggable` installieren

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Richtige Version installieren**

```bash
yarn add vuedraggable@4.1.0
```

**Nicht `yarn add vuedraggable`** — `latest` ist 2.24.3 und das ist die Vue-2-Fassung. Die Vue-3-Variante ist 4.1.0 (peer `vue: ^3.0.1`), veroeffentlicht 2023-08.

- [ ] **Step 2: Version pruefen**

```bash
node -e "console.log(require('vuedraggable/package.json').version)"
```

Erwartet: `4.1.0`.

- [ ] **Step 3: Commit**

```bash
git add package.json yarn.lock
git commit -m "build: vuedraggable 4.1.0 fuer die Signalkette"
```

---

## Task 10: `SignalChainEditor.vue` — Kette bearbeiten

**Files:**
- Create: `app/components/SignalChainEditor.vue`
- Create: `tests/component/signalChainEditor.test.ts`

Die Komponente bekommt die Stationen als `v-model` und meldet jede Aenderung nach oben. Sie schreibt selbst nicht — das macht `useChainOrder` in `GearPanel`.

- [ ] **Step 1: Test schreiben**

```ts
// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SignalChainEditor from '../../app/components/SignalChainEditor.vue'
import { de } from '../../app/locales/de'

const stations = [
  { id: 'g1', slug: 'a', category: 'Gitarre', label: 'Gretsch White Falcon', detail: '1997', rarity: 'rare' as const },
  { id: 'g2', slug: 'b', category: 'Pedal', label: 'Boss CE-2 Chorus', detail: null, rarity: 'special' as const },
  { id: 'g3', slug: 'c', category: 'Amp', label: 'Marshall JTM45', detail: null, rarity: null },
]

function mountEditor(props: Record<string, unknown> = {}) {
  return mount(SignalChainEditor, {
    props: { stations, ...props },
    // vuedraggable braucht echtes DOM-Verhalten, das happy-dom nicht
    // vollstaendig nachbildet - fuer die Logik reicht ein Stub, der seinen
    // Default-Slot rendert. Das Ziehen selbst ist Bibliotheksverhalten und
    // wird hier nicht getestet, die Pfeile schon.
    global: {
      stubs: {
        draggable: {
          props: ['modelValue', 'itemKey'],
          template: '<div><slot v-for="el in modelValue" :element="el" :key="el.id" /></div>',
        },
      },
    },
  })
}

describe('SignalChainEditor', () => {
  it('schiebt eine Station mit dem Pfeil nach oben', async () => {
    const wrapper = mountEditor()
    await wrapper.findAll(`[aria-label="${de.profile.chainMoveUp}"]`)[1].trigger('click')

    const emitted = wrapper.emitted('update:stations')
    expect(emitted).toBeTruthy()
    expect((emitted!.at(-1)![0] as typeof stations).map((s) => s.id)).toEqual(['g2', 'g1', 'g3'])
  })

  it('schiebt eine Station mit dem Pfeil nach unten', async () => {
    const wrapper = mountEditor()
    await wrapper.findAll(`[aria-label="${de.profile.chainMoveDown}"]`)[0].trigger('click')

    const emitted = wrapper.emitted('update:stations')
    expect((emitted!.at(-1)![0] as typeof stations).map((s) => s.id)).toEqual(['g2', 'g1', 'g3'])
  })

  it('deaktiviert hoch bei der ersten und runter bei der letzten Station', () => {
    const wrapper = mountEditor()
    const up = wrapper.findAll(`[aria-label="${de.profile.chainMoveUp}"]`)
    const down = wrapper.findAll(`[aria-label="${de.profile.chainMoveDown}"]`)

    expect(up[0].attributes('disabled')).toBeDefined()
    expect(down.at(-1)!.attributes('disabled')).toBeDefined()
  })

  it('meldet das Herausnehmen als eigenes Ereignis, nicht als Loeschen', async () => {
    const wrapper = mountEditor()
    await wrapper.findAll(`[aria-label="${de.profile.chainRemove}"]`)[1].trigger('click')

    // Das Geraet bleibt im Rig - die Seite darueber schiebt es zurueck in
    // den Pool. Ein "removed"-Ereignis mit Id, kein Loeschen.
    expect(wrapper.emitted('remove')).toEqual([['g2']])
    expect((wrapper.emitted('update:stations')!.at(-1)![0] as typeof stations).map((s) => s.id)).toEqual(['g1', 'g3'])
  })

  it('nummeriert die Stationen sichtbar durch', () => {
    const wrapper = mountEditor()
    const text = wrapper.text()
    expect(text).toContain('1')
    expect(text).toContain('3')
  })
})
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag sehen**

```bash
yarn vitest run tests/component/signalChainEditor.test.ts
```

Erwartet: FAIL — Datei existiert nicht.

- [ ] **Step 3: Komponente schreiben**

`app/components/SignalChainEditor.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import draggable from 'vuedraggable'
import type { ChainStation } from './SignalChain.vue'

const props = defineProps<{ stations: ChainStation[] }>()
const emit = defineEmits<{
  'update:stations': [stations: ChainStation[]]
  remove: [id: string]
}>()

const t = useText()

// vuedraggable schreibt direkt in sein Modell. Wir reichen jede Aenderung
// nach oben durch, statt hier eine zweite Wahrheit zu halten.
const list = computed({
  get: () => props.stations,
  set: (next: ChainStation[]) => emit('update:stations', next),
})

function move(index: number, delta: number) {
  const next = [...props.stations]
  const [row] = next.splice(index, 1)
  next.splice(index + delta, 0, row)
  emit('update:stations', next)
}

function remove(index: number) {
  const row = props.stations[index]
  emit('update:stations', props.stations.filter((_, i) => i !== index))
  // Eigenes Ereignis, damit die Seite darueber das Geraet zurueck in den
  // Pool schiebt. Es wird aus der Kette genommen, nicht geloescht.
  emit('remove', row.id)
}

function boxClass(rarity: ChainStation['rarity']): string {
  if (rarity === 'rare') return 'border-rare/40 bg-rare-wash'
  if (rarity === 'special') return 'border-special/35'
  return 'border-line-soft'
}

function nameClass(rarity: ChainStation['rarity']): string {
  if (rarity === 'rare') return 'text-rare'
  if (rarity === 'special') return 'text-special'
  return 'text-ink'
}
</script>

<template>
  <draggable v-model="list" item-key="id" handle="[data-grip]" class="flex flex-col gap-[.15rem]">
    <template #item="{ element, index }">
      <div>
        <div
          class="grid grid-cols-[1.1rem_1fr_auto] items-start gap-x-2 rounded-sm border bg-surface py-2 pr-2"
          :class="boxClass(element.rarity)"
        >
          <span data-grip class="grid cursor-grab place-items-center pt-[.15rem] text-muted" :title="t.profile.chainDragHandle">
            <svg viewBox="0 0 16 16" class="size-3.5" aria-hidden="true">
              <g fill="currentColor">
                <circle cx="6" cy="3" r="1.3" /><circle cx="10" cy="3" r="1.3" />
                <circle cx="6" cy="8" r="1.3" /><circle cx="10" cy="8" r="1.3" />
                <circle cx="6" cy="13" r="1.3" /><circle cx="10" cy="13" r="1.3" />
              </g>
            </svg>
          </span>

          <span class="min-w-0">
            <span class="block font-mono text-[.625rem] uppercase tracking-[.11em] text-muted">
              {{ index + 1 }} &middot; {{ element.category }}
            </span>
            <span class="font-display text-[.9375rem] font-semibold leading-tight" :class="nameClass(element.rarity)">
              {{ element.label }}
            </span>
            <span v-if="element.detail" class="block font-mono text-xs tabular-nums text-muted">
              {{ element.detail }}
            </span>
          </span>

          <!-- Die Pfeile sind kein Zusatz. Ziehen ist per Tastatur nicht
               erreichbar, und auf schmalen Schirmen stehen die Spalten
               untereinander - dort tragen sie die ganze Bedienung. -->
          <span class="flex items-center gap-[.1rem]">
            <button
              type="button"
              class="rounded-sm p-1 text-muted disabled:opacity-30 enabled:hover:bg-surface-2 enabled:hover:text-accent"
              :aria-label="t.profile.chainMoveUp"
              :title="t.profile.chainMoveUp"
              :disabled="index === 0"
              @click="move(index, -1)"
            >
              <svg viewBox="0 0 16 16" class="size-3" aria-hidden="true">
                <path d="M8 12V4M4 8l4-4 4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              class="rounded-sm p-1 text-muted disabled:opacity-30 enabled:hover:bg-surface-2 enabled:hover:text-accent"
              :aria-label="t.profile.chainMoveDown"
              :title="t.profile.chainMoveDown"
              :disabled="index === stations.length - 1"
              @click="move(index, 1)"
            >
              <svg viewBox="0 0 16 16" class="size-3" aria-hidden="true">
                <path d="M8 4v8M4 8l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              class="rounded-sm p-1 text-muted hover:bg-surface-2 hover:text-accent"
              :aria-label="t.profile.chainRemove"
              :title="t.profile.chainRemove"
              @click="remove(index)"
            >
              <svg viewBox="0 0 16 16" class="size-3" aria-hidden="true">
                <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
              </svg>
            </button>
          </span>
        </div>

        <!-- Kabel mittig zwischen zwei Stationen, nie hinter der letzten. -->
        <div v-if="index < stations.length - 1" data-cable class="flex h-[1.35rem] justify-center text-line" aria-hidden="true">
          <svg viewBox="0 0 20 24" preserveAspectRatio="none" class="h-full w-5 overflow-visible">
            <path d="M10 0 C10 7 17 9 17 12 C17 15 10 17 10 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
          </svg>
        </div>
      </div>
    </template>
  </draggable>
</template>
```

- [ ] **Step 4: Test laufen lassen, gruen sehen**

```bash
yarn vitest run tests/component/signalChainEditor.test.ts
```

Erwartet: 5 Tests PASS.

Bringt der `draggable`-Stub das Slot-Rendering nicht zum Laufen, den Stub im Test so anpassen, dass er `#item` mit `{ element, index }` aufruft — **die Komponente nicht auf eine andere Slot-Form umbauen**, sonst weicht sie von vuedraggable ab.

- [ ] **Step 5: Commit**

```bash
git add app/components/SignalChainEditor.vue tests/component/signalChainEditor.test.ts
git commit -m "feat(rig): SignalChainEditor mit Ziehen, Pfeilen und Herausnehmen"
```

---

## Task 11: `GearPool.vue` — die rechte Spalte im Bearbeitungsmodus

**Files:**
- Create: `app/components/GearPool.vue`
- Create: `tests/component/gearPool.test.ts`

- [ ] **Step 1: Test schreiben**

```ts
// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import GearPool from '../../app/components/GearPool.vue'
import { de } from '../../app/locales/de'

const items = [
  { id: 'g3', slug: 'c', category: 'Amp', label: 'Marshall JTM45', detail: null, rarity: null },
  { id: 'g4', slug: 'd', category: 'Cabinet', label: 'Marshall 1960B', detail: null, rarity: null },
]

function mountPool(props: Record<string, unknown> = {}) {
  return mount(GearPool, {
    props: { items, ...props },
    global: {
      stubs: {
        draggable: {
          props: ['modelValue', 'itemKey'],
          template: '<div><slot v-for="el in modelValue" :element="el" :key="el.id" /></div>',
        },
      },
    },
  })
}

describe('GearPool', () => {
  it('listet jedes Geraet ausserhalb der Kette', () => {
    const wrapper = mountPool()
    expect(wrapper.text()).toContain('Marshall JTM45')
    expect(wrapper.text()).toContain('Marshall 1960B')
  })

  it('haengt ein Geraet per Knopf an, ohne Ziehen', async () => {
    const wrapper = mountPool()
    await wrapper.findAll('button')[1].trigger('click')
    // Der Knopf traegt die schmale Ansicht, wo nichts nach links gezogen wird.
    expect(wrapper.emitted('append')).toEqual([['g4']])
  })

  it('sagt es, wenn alles schon in der Kette steht', () => {
    const wrapper = mountPool({ items: [] })
    expect(wrapper.text()).toContain(de.profile.chainPoolEmpty)
  })

  it('zeigt bei leerem Pool keine Anhaengen-Knoepfe', () => {
    const wrapper = mountPool({ items: [] })
    expect(wrapper.findAll('button')).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag sehen**

```bash
yarn vitest run tests/component/gearPool.test.ts
```

Erwartet: FAIL — Datei existiert nicht.

- [ ] **Step 3: Komponente schreiben**

`app/components/GearPool.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import draggable from 'vuedraggable'
import type { ChainStation } from './SignalChain.vue'

const props = defineProps<{ items: ChainStation[] }>()
const emit = defineEmits<{ append: [id: string]; 'update:items': [items: ChainStation[]] }>()

const t = useText()

const list = computed({
  get: () => props.items,
  set: (next: ChainStation[]) => emit('update:items', next),
})

function boxClass(rarity: ChainStation['rarity']): string {
  if (rarity === 'rare') return 'border-rare/40'
  if (rarity === 'special') return 'border-special/35'
  return 'border-line-soft'
}
</script>

<template>
  <div>
    <h3 class="font-display text-[1.0625rem] font-bold tracking-tight">{{ t.profile.chainPoolTitle }}</h3>
    <p class="mb-4 mt-1 max-w-[34rem] text-sm text-muted">{{ t.profile.chainPoolHint }}</p>

    <p v-if="items.length === 0" class="py-4 text-sm text-muted">{{ t.profile.chainPoolEmpty }}</p>

    <draggable
      v-else
      v-model="list"
      item-key="id"
      :group="{ name: 'chain', pull: 'clone', put: true }"
      class="grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] content-start gap-2"
    >
      <template #item="{ element }">
        <div
          class="grid cursor-grab grid-cols-[1fr_auto] items-center gap-2 rounded-sm border bg-surface px-[.65rem] py-[.6rem]"
          :class="boxClass(element.rarity)"
        >
          <span class="min-w-0">
            <span class="block font-mono text-[.625rem] uppercase tracking-[.1em] text-muted">{{ element.category }}</span>
            <span class="font-display text-sm font-semibold leading-tight">{{ element.label }}</span>
          </span>
          <button
            type="button"
            class="whitespace-nowrap rounded-sm border border-line px-[.65rem] py-[.3rem] font-display text-xs font-semibold hover:border-accent hover:text-accent"
            @click="emit('append', element.id)"
          >
            {{ t.profile.chainAppend }}
          </button>
        </div>
      </template>
    </draggable>
  </div>
</template>
```

- [ ] **Step 4: Test laufen lassen, gruen sehen**

```bash
yarn vitest run tests/component/gearPool.test.ts
```

Erwartet: 4 Tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/components/GearPool.vue tests/component/gearPool.test.ts
git commit -m "feat(rig): GearPool als rechte Spalte im Bearbeitungsmodus"
```

---

## Task 11a: Seltenheitsdarstellung zusammenziehen

**Aus dem Spec-Review nach Task 7.** Die Zuordnung „Seltenheitsstufe → CSS-Klasse" steht inzwischen an
vier Stellen, und die Tasks 10 und 11 legen zwei weitere an:

| Datei | Funktion |
|---|---|
| `app/components/RarityPip.vue` | `pipClass` |
| `app/components/GearList.vue` | `nameClass` |
| `app/components/SignalChain.vue` | `nodeClass` — rare/special woertlich wie `pipClass` |
| `app/components/SignalChain.vue` | `nameClass` — identisch mit dem in GearList |
| `app/components/SignalChainEditor.vue` | aus Task 10 |
| `app/components/GearPool.vue` | aus Task 11 |

Das ist genau das Muster, gegen das `shared/utils/rarityBase.ts` angelegt wurde — dort steht im
Dateikopf, dass die Werteliste vorher dreifach existierte. **Sechs Kopien einer Regel, die die Kernmechanik
der Plattform sichtbar macht, laufen garantiert auseinander.**

**Files:**
- Create: `shared/utils/rarityStyle.ts`
- Create: `tests/unit/rarityStyle.test.ts`
- Modify: `RarityPip.vue`, `GearList.vue`, `SignalChain.vue`, `SignalChainEditor.vue`, `GearPool.vue`

- [ ] **Step 1: Die eine Wahrheit anlegen**

`shared/utils/rarityStyle.ts`, nach dem Muster von `shared/utils/rarityBase.ts` (lies dessen Dateikopf):

```ts
import type { RarityBase } from './rarityBase'

/**
 * Einziger Ort fuer die Zuordnung Seltenheitsstufe -> Darstellung.
 *
 * Nur zwei der vier Stufen werden ausgezeichnet: leuchten alle vier, sagt
 * die Auszeichnung nichts mehr. Bernstein gehoert in diesem Projekt
 * ausschliesslich der Seltenheit - sie ist die Mechanik, ueber die Menschen
 * einander finden, keine Verzierung.
 *
 * Vorher stand diese Zuordnung in vier Komponenten, und zwei weitere waren
 * geplant. Dieselbe Behandlung wie RarityBase und die Baujahr-Regel.
 */
export function rarityTextClass(rarity: RarityBase | null): string { /* ... */ }

/** Der Punkt bzw. Knoten: gefuellt bei rare, hohler Ring bei special. */
export function rarityDotClass(rarity: RarityBase | null): string { /* ... */ }
```

Die konkreten Klassen holst du aus den vorhandenen Komponenten. **Achtung, der stille Zustand darf NICHT vereinheitlicht werden.** `RarityPip` benutzt dafuer
`bg-line opacity-55`, der Kettenknoten `bg-surface border-line`. Die urspruengliche Begruendung in
`SignalChain.vue` („damit der Strang nicht durchscheint") ist falsch — der Strang laeuft nicht hinter dem
Knoten durch, die Stuecke sind Flex-Geschwister. **Aber das Ergebnis stimmt trotzdem, aus einem anderen
Grund:** der Knoten sitzt zwischen zwei `bg-line`-Segmenten **derselben Farbe**. Ein Punkt mit
`opacity-55` daneben liest sich nicht als Station, sondern als Stelle, an der die Linie duenner wird. Und
ohne Rand ist der Kreis im stillen Zustand gegen `bg-surface` praktisch unsichtbar — bei `RarityPip`
traegt ihn die Deckkraft, auf dem Kabel nicht.

**Also: zwei benannte Varianten statt einer Funktion mit Sonderfall.** Etwa `rarityDotClass()` fuer den
Punkt in einer Liste und `rarityNodeClass()` fuer den Knoten auf einem Kabel — `rare` und `special` sind
in beiden identisch, nur der stille Zustand unterscheidet sich. **Korrigiere dabei den falschen Kommentar
in `SignalChain.vue`**, sonst wird die richtige Loesung beim naechsten Mal mit der falschen Begruendung
wegoptimiert.

- [ ] **Step 2: Test schreiben**

`tests/unit/rarityStyle.test.ts` — je Funktion alle vier Stufen plus `null`, mit **positiven**
Zusicherungen. Nicht nur „enthaelt nicht `bg-rare`": ein leerer String waere sonst gruen und der Punkt
unsichtbar.

- [ ] **Step 3: Alle sechs Stellen umstellen**

Jede Komponente importiert aus `#shared/utils/rarityStyle` statt eine eigene Funktion zu halten. Wo eine
Komponente eine echte Variante braucht (Kasten-Hintergrund im Editor), bleibt die dort — aber getrennt von
Text- und Punktfarbe, nicht in einer gemischten Funktion.

- [ ] **Step 4: Gegenprobe**

Aendere `rarityTextClass` fuer `rare` probeweise auf `'text-ink'` und lass die volle Suite laufen.
**Mehrere** Tests in verschiedenen Dateien muessen rot werden — das beweist, dass die Komponenten
tatsaechlich an der gemeinsamen Quelle haengen und nicht an einer uebriggebliebenen Kopie. Danach
zurueckaendern.

- [ ] **Step 5: Volle Suite und Commit**

```bash
yarn test
git add shared/utils/rarityStyle.ts tests/unit/rarityStyle.test.ts app/components
git commit -m "refactor(ui): Seltenheitsdarstellung an einer Stelle"
```

---

## Task 11b: Testluecken schliessen

**Aus dem Spec-Review nach Task 7.** Fuenf Tests sind gruen, ohne das zu pruefen, was ihr Name behauptet.
Das ist die Schwester des wiederkehrenden Projektfehlers, und sie ist hier schon sechsmal vorgekommen.

**Files:**
- Modify: `tests/component/gearList.test.ts`, `tests/component/rarityPip.test.ts`
- Modify: `tests/component/signalChain.test.ts`

- [ ] **Step 1: `GearList` — der Seltenheitspunkt ist ungeprueft**

`RarityPip` ist im Test gestubbt und wird nie gesucht. **Man kann `<RarityPip>` ersatzlos aus der Liste
loeschen, und alle sieben Tests bleiben gruen** — obwohl der Punkt vor jedem Eintrag der Kern von
Abschnitt 4.2 der Spec ist. Ergaenze zwei Zusicherungen:

- dass je Eintrag ein Pip gerendert wird (ueber den Stub findbar machen, z.B. `stubs: { RarityPip: { props: ['rarity'], template: '<span data-pip :data-rarity="rarity" />' } }`)
- dass er die **richtige** Stufe bekommt — der Eintrag mit `rare` muss `data-rarity="rare"` tragen

- [ ] **Step 2: `GearList` — der Zaehler ist ungeprueft**

Der Test heisst „zeigt je Gruppe ein Label **mit der Anzahl**", prueft aber nur die Labels. Man kann
`{{ group.entries.length }}` ersatzlos streichen, alles bleibt gruen. Prueft den Zaehler gezielt, nicht
ueber `toContain` auf dem Gesamttext — eine „1" findet sich sonst in jedem Baujahr.

- [ ] **Step 3: `RarityPip` — stille Stufen nur negativ geprueft**

`mass`, `common` und `null` pruefen ausschliesslich `not.toContain(...)`. Gaebe `pipClass` fuer den stillen
Fall einen leeren String zurueck, waere der Punkt unsichtbar — und der Test gruen. Ergaenze eine positive
Zusicherung auf die Klasse, die den stillen Punkt tatsaechlich malt.

Ebenso beim „hohler Ring"-Test: `not.toContain('bg-special')` prueft eine Klasse, die keine Verzweigung je
erzeugt. Gemeint war „kein Hintergrund", geprueft wird „nicht dieser eine Hintergrund".

- [ ] **Step 4: `SignalChain` — Knoten- und Namensfarbe ganz ungeprueft**

`nodeClass` und `nameClass` haben keinen einzigen Test. Spec-Kernpunkt 7 verlangt, dass die Knoten
dieselbe Sprache sprechen wie die Punkte im Equipment-Reiter — genau das ist ungesichert. Ergaenze je
einen Test fuer `rare`, `special` und still.

- [ ] **Step 5: Jede Ergaenzung gegenpruefen**

Fuer **jeden** neuen Test: die gepruefte Stelle im Code kaputtmachen, den Test rot sehen, zurueckbauen.
Ein Test, der nach dieser Runde nicht nachweislich fehlschlagen kann, ist keine Verbesserung, sondern nur
mehr Zeilen.

- [ ] **Step 6: Volle Suite und Commit**

```bash
yarn test
git add tests/component
git commit -m "test: Luecken schliessen, die der Spec-Review gefunden hat"
```

---
## Task 12: `GearPanel.vue` — die beiden Reiter

**Files:**
- Create: `app/components/GearPanel.vue`
- Create: `tests/component/gearPanel.test.ts`

**Aus Task 11 — das Ziehen zwischen den Spalten funktioniert noch nicht.** `GearPool.vue` setzt
`:group="{ name: 'chain', pull: true, put: true }"`, `SignalChainEditor.vue` setzt **gar keine `group`**.
Ohne passende Gruppe auf beiden Seiten nimmt die Kette nichts an, was aus dem Pool kommt — und der Zug
laeuft ins Leere, ohne Fehlermeldung. Der Panel-Task muss dem Editor dieselbe Gruppe geben.

**Ebenfalls aus Task 11:** `SignalChainEditor.vue` rendert bei `stations: []` eine leere Liste — kein
Rahmen, keine Hoehe, nichts zum Hineinziehen. Der Text `profile.chainEmptyDrop` liegt in `de.ts` bereit
und wird bisher von niemandem benutzt. **Das Panel muss die Drop-Zone fuer die leere Kette stellen**,
sonst kann man die erste Station gar nicht per Ziehen setzen (nur ueber „Anhaengen").

**Aus Task 8:** `useChainOrder` liefert neben `status` auch `lastError` mit dem SQLSTATE-Code. Zwei davon
sagen dem Nutzer etwas und verdienen einen eigenen Text in `app/locales/de.ts` (echte Umlaute, es ist eine
`.ts`-Datei):

| Code | Lage | Vorschlag |
|---|---|---|
| `RG001` | Sitzung abgelaufen | „Du bist nicht mehr angemeldet. Melde dich neu an." |
| `RG005` | Ansicht veraltet, Geraet gehoert nicht mehr dir | „Dein Rig hat sich geaendert. Lad die Seite neu." |

`RG002`/`RG003`/`RG004` kann ein Nutzer nicht ausloesen — die bleiben beim Sammeltext `chainSaveError`.

**Beim Bauen von Task 6 aufgefallen:** `GearList` rendert bei `groups: []` buchstaeblich nichts — kein
Rahmen, keine Hoehe, kein Text. Das ist als Liste richtig, hinterlaesst im Panel aber eine wortlose
Luecke. **Das Panel muss die drei Zustaende auseinanderhalten:**

| Zustand | was zu sehen ist |
|---|---|
| Equipment vorhanden | die Liste |
| kein Equipment eingetragen | ein Satz, der das sagt — auf dem eigenen Profil mit Weg zum Eintragen |
| Laden fehlgeschlagen | eine Fehlermeldung in `text-danger`, unterscheidbar vom leeren Rig |

Der dritte Fall kommt als Prop von der Seite (die Liste selbst hat keine fehlbare Quelle). Ohne diese
Unterscheidung sieht ein kaputter Request aus wie ein leeres Rig — der wiederkehrende Fehler dieses
Projekts, sechsmal in achtzehn Tasks aufgetreten.

- [ ] **Step 1: Test schreiben**

```ts
// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import GearPanel from '../../app/components/GearPanel.vue'
import { de } from '../../app/locales/de'

const groups = [
  {
    key: 'guitar',
    label: 'Gitarre',
    entries: [{ id: 'g1', slug: 'a', label: 'Gretsch White Falcon', detail: '1997', rarity: 'rare' as const }],
  },
]
const stations = [
  { id: 'g1', slug: 'a', category: 'Gitarre', label: 'Gretsch White Falcon', detail: '1997', rarity: 'rare' as const },
]

function mountPanel(props: Record<string, unknown> = {}) {
  return mount(GearPanel, {
    props: { groups, stations, isOwn: false, editing: false, ...props },
    global: {
      stubs: { NuxtLink: true, SignalChainEditor: true },
    },
  })
}

describe('GearPanel', () => {
  it('startet auf dem Equipment-Reiter', () => {
    const wrapper = mountPanel()
    const tabs = wrapper.findAll('[role="tab"]')
    expect(tabs[0].attributes('aria-selected')).toBe('true')
    expect(tabs[1].attributes('aria-selected')).toBe('false')
  })

  it('wechselt auf Klick zur Kette', async () => {
    const wrapper = mountPanel()
    await wrapper.findAll('[role="tab"]')[1].trigger('click')

    const tabs = wrapper.findAll('[role="tab"]')
    expect(tabs[1].attributes('aria-selected')).toBe('true')
    expect(wrapper.findAll('[role="tabpanel"]:not([hidden])')).toHaveLength(1)
  })

  it('blendet den Ketten-Reiter auf fremden Profilen aus, wenn keine Kette da ist', () => {
    const wrapper = mountPanel({ stations: [], isOwn: false })
    // Ein leerer Reiter auf einem fremden Profil ist eine Sackgasse.
    expect(wrapper.findAll('[role="tab"]')).toHaveLength(1)
  })

  it('zeigt dem Eigentuemer den Ketten-Reiter auch ohne Kette', () => {
    const wrapper = mountPanel({ stations: [], isOwn: true })
    expect(wrapper.findAll('[role="tab"]')).toHaveLength(2)
  })

  it('bietet dem Eigentuemer auf dem Ketten-Reiter das Bearbeiten an', async () => {
    const wrapper = mountPanel({ isOwn: true })
    await wrapper.findAll('[role="tab"]')[1].trigger('click')

    const button = wrapper.findAll('button').find((b) => b.text() === de.profile.chainEdit)
    expect(button).toBeDefined()
    await button!.trigger('click')
    expect(wrapper.emitted('edit')).toBeTruthy()
  })

  it('bietet Besuchern kein Bearbeiten an', async () => {
    const wrapper = mountPanel({ isOwn: false })
    await wrapper.findAll('[role="tab"]')[1].trigger('click')

    expect(wrapper.findAll('button').some((b) => b.text() === de.profile.chainEdit)).toBe(false)
  })

  it('meldet einen Speicherfehler sichtbar', async () => {
    const wrapper = mountPanel({ isOwn: true, editing: true, saveStatus: 'error' })
    await wrapper.findAll('[role="tab"]')[1].trigger('click')
    expect(wrapper.text()).toContain(de.profile.chainSaveError)
  })
})
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag sehen**

```bash
yarn vitest run tests/component/gearPanel.test.ts
```

Erwartet: FAIL — Datei existiert nicht.

- [ ] **Step 3: Komponente schreiben**

`app/components/GearPanel.vue`:

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import type { GearListGroup } from './GearList.vue'
import type { ChainStation } from './SignalChain.vue'
import type { ChainSaveStatus } from '../composables/useChainOrder'

const props = withDefaults(
  defineProps<{
    groups: GearListGroup[]
    stations: ChainStation[]
    isOwn: boolean
    editing: boolean
    saveStatus?: ChainSaveStatus
  }>(),
  { saveStatus: 'idle' },
)

const emit = defineEmits<{
  edit: []
  done: []
  'update:stations': [stations: ChainStation[]]
  remove: [id: string]
  retry: []
}>()

const t = useText()
const active = ref<'equipment' | 'chain'>('equipment')

// Auf einem fremden Profil ohne Kette gibt es nichts zu sehen - der Reiter
// waere eine Sackgasse. Auf dem eigenen ist er eine Einladung.
const showChainTab = computed(() => props.isOwn || props.stations.length > 0)
</script>

<template>
  <aside class="min-w-0">
    <div class="mb-4 flex border-b border-line" role="tablist" :aria-label="t.profile.tabsLabel">
      <button
        type="button"
        role="tab"
        class="-mb-px grow whitespace-nowrap border-b-2 px-1 pb-[.55rem] pt-2 font-display text-[.8125rem] font-semibold hover:text-ink"
        :class="active === 'equipment' ? 'border-accent text-ink' : 'border-transparent text-muted'"
        :aria-selected="active === 'equipment'"
        @click="active = 'equipment'"
      >
        {{ t.profile.tabEquipment }}
      </button>
      <button
        v-if="showChainTab"
        type="button"
        role="tab"
        class="-mb-px grow whitespace-nowrap border-b-2 px-1 pb-[.55rem] pt-2 font-display text-[.8125rem] font-semibold hover:text-ink"
        :class="active === 'chain' ? 'border-accent text-ink' : 'border-transparent text-muted'"
        :aria-selected="active === 'chain'"
        @click="active = 'chain'"
      >
        {{ t.profile.tabChain }}
      </button>
    </div>

    <div role="tabpanel" :hidden="active !== 'equipment'">
      <GearList :groups="groups" />
    </div>

    <div role="tabpanel" :hidden="active !== 'chain'">
      <!-- Der Reiter allein tauscht die rechte Spalte nicht: ansehen soll
           nicht den Feed kosten. Erst dieser Knopf wechselt. -->
      <div v-if="isOwn" class="mb-[.6rem] flex items-baseline justify-between gap-2">
        <span class="font-mono text-[.6875rem] uppercase tracking-[.1em] text-muted">{{ t.profile.tabChain }}</span>
        <button type="button" class="font-mono text-xs text-accent hover:underline" @click="editing ? emit('done') : emit('edit')">
          {{ editing ? t.profile.chainDone : t.profile.chainEdit }}
        </button>
      </div>

      <SignalChainEditor
        v-if="editing"
        :stations="stations"
        @update:stations="emit('update:stations', $event)"
        @remove="emit('remove', $event)"
      />
      <SignalChain v-else :stations="stations" :is-own="isOwn" :outside-count="poolItems.length" />

      <!-- Der Ausgang des Speicherns muss sichtbar sein: die Oberflaeche
           zeigt die neue Reihenfolge bereits, ein stiller Fehlschlag waere
           nach einem Neuladen spurlos weg. -->
      <div v-if="editing" class="mt-[.9rem] flex items-center gap-2 border-t border-line-soft pt-3 font-mono text-[.7rem]">
        <span v-if="saveStatus === 'error'" class="text-danger">{{ t.profile.chainSaveError }}</span>
        <button v-if="saveStatus === 'error'" type="button" class="text-accent hover:underline" @click="emit('retry')">
          {{ t.profile.chainRetry }}
        </button>
        <span v-else-if="saveStatus === 'pending'" class="text-muted">{{ t.profile.chainSaving }}</span>
        <span v-else-if="saveStatus === 'saved'" class="text-muted">{{ t.profile.chainSaved }}</span>
      </div>
    </div>
  </aside>
</template>
```

- [ ] **Step 4: Test laufen lassen, gruen sehen**

```bash
yarn vitest run tests/component/gearPanel.test.ts
```

Erwartet: 7 Tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/components/GearPanel.vue tests/component/gearPanel.test.ts
git commit -m "feat(ui): GearPanel mit Equipment- und Signal-Chain-Reiter"
```

---

## Task 13: Rig-Ereignisse ableiten

Der Feed lebt ab Tag 1 von vorhandenen Daten: `gear_items.created_at`. Keine neue Tabelle.

**Files:**
- Create: `shared/utils/rigEvents.ts`
- Create: `tests/unit/rigEvents.test.ts`

- [ ] **Step 1: Test schreiben**

```ts
import { describe, it, expect } from 'vitest'
import { buildRigEvents, type RigEventSource } from '../../shared/utils/rigEvents'

function row(overrides: Partial<RigEventSource> = {}): RigEventSource {
  return {
    id: 'g1',
    label: 'Gretsch White Falcon',
    slug: 'gretsch-white-falcon',
    detail: '1997',
    rarity: 'rare',
    createdAt: '2026-09-06T17:19:19.062Z',
    ...overrides,
  }
}

describe('buildRigEvents', () => {
  it('fasst Geraete desselben Tages zu einem Ereignis zusammen', () => {
    const events = buildRigEvents([
      row({ id: 'a', createdAt: '2026-09-06T10:00:00Z' }),
      row({ id: 'b', createdAt: '2026-09-06T18:00:00Z' }),
    ])

    // Eine Erstbefuellung des Rigs wuerde sonst zwanzig fast identische
    // Zeilen erzeugen.
    expect(events).toHaveLength(1)
    expect(events[0].items).toHaveLength(2)
  })

  it('trennt verschiedene Tage', () => {
    const events = buildRigEvents([
      row({ id: 'a', createdAt: '2026-09-06T10:00:00Z' }),
      row({ id: 'b', createdAt: '2026-09-07T10:00:00Z' }),
    ])
    expect(events).toHaveLength(2)
  })

  it('sortiert das neueste Ereignis nach vorn', () => {
    const events = buildRigEvents([
      row({ id: 'alt', createdAt: '2026-09-01T10:00:00Z' }),
      row({ id: 'neu', createdAt: '2026-09-07T10:00:00Z' }),
    ])
    expect(events[0].items[0].id).toBe('neu')
  })

  it('merkt sich, ob ein Ereignis eine Rarität enthaelt', () => {
    const withRare = buildRigEvents([row({ rarity: 'rare' })])
    const without = buildRigEvents([row({ rarity: 'common' })])

    expect(withRare[0].hasRarity).toBe(true)
    expect(without[0].hasRarity).toBe(false)
  })

  it('gibt bei leerer Eingabe eine leere Liste zurueck, nicht null', () => {
    expect(buildRigEvents([])).toEqual([])
  })
})
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag sehen**

```bash
yarn vitest run tests/unit/rigEvents.test.ts
```

Erwartet: FAIL — Datei existiert nicht.

- [ ] **Step 3: Implementierung schreiben**

`shared/utils/rigEvents.ts`:

```ts
import type { RarityBase } from './rarityBase'

export interface RigEventSource {
  id: string
  label: string
  slug: string
  detail: string | null
  rarity: RarityBase | null
  createdAt: string
}

export interface RigEvent {
  /** Tagesdatum als ISO-Praefix, zugleich der Schluessel im Template. */
  day: string
  items: RigEventSource[]
  hasRarity: boolean
}

/**
 * Leitet Feed-Ereignisse aus vorhandenen Gear-Zeilen ab - Stufe 2 braucht es
 * dafuer nicht, `gear_items.created_at` liegt langst in der Datenbank.
 *
 * Zusammengefasst wird je Tag: eine Erstbefuellung des Rigs wuerde sonst
 * zwanzig fast identische Zeilen erzeugen.
 */
export function buildRigEvents(rows: RigEventSource[]): RigEvent[] {
  const byDay = new Map<string, RigEventSource[]>()

  for (const row of rows) {
    const day = row.createdAt.slice(0, 10)
    const bucket = byDay.get(day)
    if (bucket) bucket.push(row)
    else byDay.set(day, [row])
  }

  return [...byDay.entries()]
    .map(([day, items]) => {
      const sorted = [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      return {
        day,
        items: sorted,
        hasRarity: sorted.some((item) => item.rarity === 'rare' || item.rarity === 'special'),
      }
    })
    .sort((a, b) => b.day.localeCompare(a.day))
}
```

- [ ] **Step 4: Test laufen lassen, gruen sehen**

```bash
yarn vitest run tests/unit/rigEvents.test.ts
```

Erwartet: 5 Tests PASS.

- [ ] **Step 5: Commit**

```bash
git add shared/utils/rigEvents.ts tests/unit/rigEvents.test.ts
git commit -m "feat(feed): Rig-Ereignisse aus vorhandenen Gear-Daten ableiten"
```

---

## Task 14: `ProfileHeader.vue` und `FeedItem.vue`

**Files:**
- Create: `app/components/ProfileHeader.vue`
- Create: `app/components/FeedItem.vue`
- Create: `tests/component/profileHeader.test.ts`

- [ ] **Step 1: Test schreiben**

```ts
// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ProfileHeader from '../../app/components/ProfileHeader.vue'
import { de } from '../../app/locales/de'

const base = {
  displayName: 'Roehrenglut Ruediger',
  realName: null,
  bio: 'Alles vor 1975 war besser.',
  bands: ['Tanzpalast'],
  avatarUrl: null,
  deviceCount: 4,
  rarityCount: 1,
  specialCount: 2,
  mateCount: 0,
  mateCountFailed: false,
  isOwn: false,
}

describe('ProfileHeader', () => {
  it('zeigt Name, Bio und Band', () => {
    const wrapper = mount(ProfileHeader, { props: base, global: { stubs: { NuxtLink: true } } })
    const text = wrapper.text()
    expect(text).toContain('Roehrenglut Ruediger')
    expect(text).toContain('Alles vor 1975 war besser.')
    expect(text).toContain('Tanzpalast')
  })

  it('zeigt null Rig-Kollegen als echte Null, nicht als Leerstelle', () => {
    const wrapper = mount(ProfileHeader, { props: base, global: { stubs: { NuxtLink: true } } })
    expect(wrapper.text()).toContain('0')
    expect(wrapper.text()).toContain(de.profile.statMates)
  })

  it('unterscheidet eine fehlgeschlagene Kollegenzahl von der Null', () => {
    const wrapper = mount(ProfileHeader, {
      props: { ...base, mateCount: null, mateCountFailed: true },
      global: { stubs: { NuxtLink: true } },
    })
    expect(wrapper.text()).toContain(de.profile.statMatesError)
  })

  it('zeigt Folgen und Nachricht deaktiviert, statt sie zu verstecken', () => {
    const wrapper = mount(ProfileHeader, { props: base, global: { stubs: { NuxtLink: true } } })
    const buttons = wrapper.findAll('button')
    expect(buttons.length).toBeGreaterThanOrEqual(2)
    expect(buttons.every((b) => b.attributes('disabled') !== undefined)).toBe(true)
  })

  it('bietet auf dem eigenen Profil das Bearbeiten an, statt Folgen', () => {
    const wrapper = mount(ProfileHeader, {
      props: { ...base, isOwn: true },
      global: { stubs: { NuxtLink: { template: '<a><slot /></a>' } } },
    })
    expect(wrapper.text()).not.toContain(de.profile.follow)
  })
})
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag sehen**

```bash
yarn vitest run tests/component/profileHeader.test.ts
```

Erwartet: FAIL — Datei existiert nicht.

- [ ] **Step 3: `ProfileHeader.vue` schreiben**

```vue
<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  displayName: string
  realName: string | null
  bio: string | null
  bands: string[]
  avatarUrl: string | null
  deviceCount: number
  rarityCount: number
  specialCount: number
  mateCount: number | null
  mateCountFailed: boolean
  isOwn: boolean
}>()

const t = useText()

const initials = computed(() =>
  props.displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase(),
)
</script>

<template>
  <header class="flex flex-wrap items-start gap-5 border-b border-line-soft pb-5">
    <img
      v-if="avatarUrl"
      :src="avatarUrl"
      :alt="displayName"
      class="size-[4.75rem] shrink-0 rounded-full border border-line-soft object-cover"
    />
    <span
      v-else
      class="grid size-[4.75rem] shrink-0 place-items-center rounded-full border border-line-soft bg-accent-wash font-display text-2xl font-bold text-accent"
      aria-hidden="true"
    >{{ initials }}</span>

    <div class="flex-1 basis-[17rem]">
      <h1 class="font-display text-2xl font-bold leading-tight tracking-tight">{{ displayName }}</h1>
      <p v-if="realName" class="text-sm text-muted">{{ realName }}</p>
      <p v-if="bio" class="mt-1.5 max-w-[34rem] text-[.9375rem]">{{ bio }}</p>
      <p v-if="bands.length > 0" class="mt-0.5 text-sm text-muted">{{ bands.join(', ') }}</p>

      <div class="mt-3 flex flex-wrap gap-5 text-[.8125rem] text-muted">
        <div><b class="mr-1 font-display text-base tabular-nums text-ink">{{ deviceCount }}</b>{{ t.profile.statDevices }}</div>
        <div><b class="mr-1 font-display text-base tabular-nums text-rare">{{ rarityCount }}</b>{{ t.profile.statRarities }}</div>
        <div><b class="mr-1 font-display text-base tabular-nums text-ink">{{ specialCount }}</b>{{ t.profile.statSpecials }}</div>
        <!-- Null Rig-Kollegen ist ein echtes Ergebnis und sieht anders aus
             als eine fehlgeschlagene Abfrage. -->
        <div v-if="mateCountFailed" class="text-danger">{{ t.profile.statMatesError }}</div>
        <div v-else><b class="mr-1 font-display text-base tabular-nums text-ink">{{ mateCount }}</b>{{ t.profile.statMates }}</div>
      </div>
    </div>

    <div class="flex gap-2">
      <NuxtLink
        v-if="isOwn"
        to="/settings"
        class="whitespace-nowrap rounded-sm border border-line px-4 py-2 font-display text-[.8125rem] font-semibold no-underline"
      >
        {{ t.profile.editCta }}
      </NuxtLink>
      <template v-else>
        <!-- Bis Stufe 2 deaktiviert statt versteckt: sie spaeter
             einzublenden hiesse, den Kopf zweimal zu entwerfen. -->
        <button
          type="button"
          disabled
          class="whitespace-nowrap rounded-sm border border-accent bg-accent px-4 py-2 font-display text-[.8125rem] font-semibold text-accent-ink opacity-50"
          :title="t.profile.stageTwoHint"
        >
          {{ t.profile.follow }}
        </button>
        <button
          type="button"
          disabled
          class="whitespace-nowrap rounded-sm border border-line px-4 py-2 font-display text-[.8125rem] font-semibold opacity-50"
          :title="t.profile.stageTwoHint"
        >
          {{ t.profile.message }}
        </button>
      </template>
    </div>
  </header>
</template>
```

- [ ] **Step 4: `FeedItem.vue` schreiben**

```vue
<script setup lang="ts">
import type { RigEvent } from '#shared/utils/rigEvents'

defineProps<{ event: RigEvent; displayName: string }>()

const t = useText()
</script>

<template>
  <article class="rounded-sm border border-line-soft bg-surface px-[1.1rem] py-4">
    <div class="mb-2 flex flex-wrap items-center gap-2">
      <span class="font-semibold text-sm">{{ displayName }}</span>
      <span class="ml-auto font-mono text-[.7rem] tabular-nums text-muted">{{ event.day }}</span>
    </div>

    <span class="font-mono text-[.6875rem] uppercase tracking-wider text-muted">{{ t.profile.feedEventLabel }}</span>
    <p class="mt-1.5 text-[.9375rem]">
      {{ event.items.length === 1 ? t.profile.feedAddedOne : t.profile.feedAddedMany }}
    </p>

    <ul class="mt-2 flex list-none flex-col gap-1 p-0">
      <li v-for="item in event.items" :key="item.id" class="flex flex-wrap items-baseline gap-2">
        <NuxtLink
          :to="`/gear/${item.slug}`"
          class="border-b border-line no-underline hover:border-current hover:text-accent"
          :class="item.rarity === 'rare' ? 'font-medium text-rare' : item.rarity === 'special' ? 'text-special' : 'text-ink'"
        >
          {{ item.label }}
        </NuxtLink>
        <span v-if="item.detail" class="font-mono text-xs tabular-nums text-muted">{{ item.detail }}</span>
      </li>
    </ul>

    <div
      v-if="event.hasRarity"
      class="mt-2.5 flex gap-2 rounded-r-sm border-l-2 border-rare bg-rare-wash px-2.5 py-2 text-[.8125rem]"
    >
      <span class="font-semibold text-rare">{{ t.profile.feedRareTitle }}</span>
    </div>
  </article>
</template>
```

- [ ] **Step 5: Tests laufen lassen, gruen sehen**

```bash
yarn vitest run tests/component/profileHeader.test.ts
```

Erwartet: 5 Tests PASS.

- [ ] **Step 6: Commit**

```bash
git add app/components/ProfileHeader.vue app/components/FeedItem.vue tests/component/profileHeader.test.ts
git commit -m "feat(ui): ProfileHeader mit Kennzahlen und FeedItem fuer Rig-Ereignisse"
```

---

## Task 15: Rig-Kollegen als Server-Route

Aggregiert ueber alle Nutzer, gehoert also laut Architekturregel auf den Server.

**Files:**
- Create: `server/api/profile/[id]/mates.get.ts`
- Create: `tests/api/profileMates.test.ts`

- [ ] **Step 1: Vorhandene Server-Route als Vorbild lesen**

```bash
cat server/api/recommendations.get.ts
```

Auf zwei Dinge achten: `serverSupabaseServiceRole(event)` ist **synchron** (kein `await`), `serverSupabaseClient(event)` ist **asynchron**.

- [ ] **Step 2: Route schreiben**

`server/api/profile/[id]/mates.get.ts`:

```ts
import { serverSupabaseServiceRole } from '#supabase/server'
import { authUser } from '../../../utils/authUser'

/**
 * Anzahl Personen, die mindestens einen Katalogeintrag mit dieser Person
 * teilen. Aggregiert ueber alle Nutzer, gehoert deshalb auf den Server.
 *
 * Achtung, Datenschutz: diese Zahl erlaubt bei ungewoehnlichem Equipment
 * Rueckschluesse darauf, wie klein die Plattform ist - siehe Abschnitt 8
 * der Profil-Spec. Deshalb nur fuer Angemeldete.
 */
export default defineEventHandler(async (event) => {
  const user = await authUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Nicht angemeldet' })

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Profil fehlt' })

  const admin = serverSupabaseServiceRole(event)

  const { data: own, error: ownError } = await admin
    .from('gear_items')
    .select('catalog_item_id')
    .eq('owner_id', id)
  if (ownError) throw createError({ statusCode: 500, statusMessage: ownError.message })

  const catalogIds = [...new Set((own ?? []).map((row) => row.catalog_item_id))]
  if (catalogIds.length === 0) return { mateCount: 0 }

  const { data: others, error: othersError } = await admin
    .from('gear_items')
    .select('owner_id')
    .in('catalog_item_id', catalogIds)
    .neq('owner_id', id)
  if (othersError) throw createError({ statusCode: 500, statusMessage: othersError.message })

  return { mateCount: new Set((others ?? []).map((row) => row.owner_id)).size }
})
```

- [ ] **Step 3: API-Test schreiben**

Zuerst eine vorhandene API-Testdatei als Vorbild lesen — sie zeigt den Cookie-Helfer, den es hier gibt:

```bash
sed -n '1,40p' tests/api/recommendations.test.ts
```

**`serverSupabaseUser` liest nur das Session-Cookie, keinen Bearer-Header.** Ein Test mit Bearer-Token prueft still den anonymen Pfad, statt laut zu scheitern.

`tests/api/profileMates.test.ts`:

```ts
import { describe, it, expect, beforeAll } from 'vitest'
import { serviceClient } from '../helpers/supabase'
// Den Anmelde-/Cookie-Helfer aus tests/api/recommendations.test.ts
// uebernehmen und hier unter dem Namen `signedInFetch` benutzen. Er baut
// eine Anfrage MIT Session-Cookie. Ein Bearer-Token taete es NICHT:
// serverSupabaseUser liest nur das Cookie, und ein Bearer-Test wuerde still
// den anonymen Pfad pruefen, statt laut zu scheitern.

const BASE = 'http://localhost:3000'

describe('GET /api/profile/:id/mates', () => {
  const admin = serviceClient()
  let lonelyId = ''
  let sharedId = ''
  let sharedExpected = 0

  beforeAll(async () => {
    // Ruediger teilt kein einziges Geraet - seine echte Antwort ist 0.
    const { data: lonely } = await admin
      .from('profiles')
      .select('id')
      .like('display_name', 'R%hrenglut%')
      .single()
    lonelyId = lonely!.id

    // Der Klon Centaur wird von mehreren gespielt. Wir rechnen die
    // Erwartung aus den echten Daten aus, statt eine Zahl zu raten.
    const { data: klon } = await admin
      .from('catalog_items')
      .select('id')
      .eq('name', 'Centaur')
      .single()
    const { data: owners } = await admin
      .from('gear_items')
      .select('owner_id')
      .eq('catalog_item_id', klon!.id)

    const ids = [...new Set(owners!.map((row) => row.owner_id))]
    sharedId = ids[0]

    const { data: own } = await admin
      .from('gear_items')
      .select('catalog_item_id')
      .eq('owner_id', sharedId)
    const catalogIds = [...new Set(own!.map((row) => row.catalog_item_id))]
    const { data: others } = await admin
      .from('gear_items')
      .select('owner_id')
      .in('catalog_item_id', catalogIds)
      .neq('owner_id', sharedId)
    sharedExpected = new Set(others!.map((row) => row.owner_id)).size

    // Sonst prueft der Test unten 0 gegen 0 und ist aus dem falschen Grund
    // gruen - genau der Fehler, der in diesem Projekt sechsmal vorkam.
    expect(sharedExpected).toBeGreaterThan(0)
  })

  it('weist Nicht-Angemeldete ab', async () => {
    const response = await fetch(`${BASE}/api/profile/${lonelyId}/mates`)
    expect(response.status).toBe(401)
  })

  it('liefert die echte Null fuer jemanden, der nichts teilt', async () => {
    const response = await signedInFetch(`${BASE}/api/profile/${lonelyId}/mates`)
    expect(response.status).toBe(200)
    expect((await response.json()).mateCount).toBe(0)
  })

  it('zaehlt genau die Personen, die Equipment teilen', async () => {
    const response = await signedInFetch(`${BASE}/api/profile/${sharedId}/mates`)
    // Genauigkeit, kein toBeGreaterThanOrEqual: die erwartete Zahl steht
    // oben aus den echten Daten fest.
    expect((await response.json()).mateCount).toBe(sharedExpected)
  })
})
```

Heisst der Helfer in `recommendations.test.ts` anders, die Aufrufe hier umbenennen — **den Helfer nicht umbauen**.

- [ ] **Step 4: Dev-Server starten und Test laufen lassen**

```bash
yarn dev
```

In einem zweiten Fenster:

```bash
yarn vitest run tests/api/profileMates.test.ts
```

Erwartet: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/api/profile tests/api/profileMates.test.ts
git commit -m "feat(profile): Rig-Kollegen als Server-Route"
```

---

## Task 16: Die Profilseite zusammenbauen

**Files:**
- Modify: `app/pages/profile/[id].vue`
- Modify: `tests/component/profile.test.ts`

- [ ] **Step 1: Die heutige Seite und ihren Test lesen**

```bash
cat app/pages/profile/[id].vue
cat tests/component/profile.test.ts
```

Die vier getrennten Fehler-Flags aus der heutigen Fassung bleiben erhalten — sie sind der Grund, warum diese Seite als Vorbild in CLAUDE.md steht.

- [ ] **Step 2: Seite umbauen**

`app/pages/profile/[id].vue` — `<script setup>` um diese Teile ergaenzen (die vorhandenen vier `useAsyncData`-Bloecke bleiben, `chain_position` kommt in die Gear-Abfrage):

```ts
import { buildRigEvents, type RigEventSource } from '#shared/utils/rigEvents'
import type { GearListGroup } from '~/components/GearList.vue'
import type { ChainStation } from '~/components/SignalChain.vue'

// Eigenes Flag, weil eine fehlgeschlagene Abfrage anders aussehen muss als
// die ehrliche Null. Bei Ruediger ist 0 das echte Ergebnis.
const mateCountFailed = ref(false)
const { data: mates } = await useAsyncData(`profile-mates-${id.value}`, async () => {
  try {
    return await $fetch<{ mateCount: number }>(`/api/profile/${id.value}/mates`)
  } catch {
    mateCountFailed.value = true
    return null
  }
})

const editing = ref(false)
const supabaseClient = useSupabaseClient()
const chainOrder = useChainOrder(supabaseClient)

function detailOf(row: any): string | null {
  return [row.year, row.finish].filter(Boolean).join(' · ') || null
}

function labelOf(row: any): string {
  return `${row.catalog_items.brands.name} ${row.catalog_items.name}`
}

// Kategorien werden zu Gruppen, die Wunschliste haengt als letzte an. Die
// Praeferenzen bekommen KEINE eigene Gruppe - sie zeigen auf dieselben
// Katalogeintraege und wuerden sich sonst verdoppeln.
const gearGroups = computed<GearListGroup[]>(() => {
  const byCategory = new Map<string, GearListGroup>()
  for (const row of rig.value ?? []) {
    const key = row.catalog_items.category_id
    const group = byCategory.get(key) ?? {
      key,
      label: (t.categories as Record<string, string>)[key] ?? key,
      entries: [],
    }
    group.entries.push({
      id: row.id,
      slug: row.catalog_items.slug,
      label: labelOf(row),
      detail: detailOf(row),
      rarity: row.catalog_items.rarity_base ?? null,
    })
    byCategory.set(key, group)
  }

  const groups = [...byCategory.values()]
  if ((wishlist.value ?? []).length > 0) {
    groups.push({
      key: 'wishlist',
      label: t.profile.wishlist,
      entries: (wishlist.value ?? []).map((row: any) => ({
        id: row.id,
        slug: row.catalog_items.slug,
        label: labelOf(row),
        detail: row.note ?? null,
        rarity: null,
      })),
    })
  }
  return groups
})

const stations = ref<ChainStation[]>([])
watchEffect(() => {
  stations.value = (rig.value ?? [])
    .filter((row: any) => row.chain_position !== null)
    .sort((a: any, b: any) => a.chain_position - b.chain_position)
    .map((row: any) => ({
      id: row.id,
      slug: row.catalog_items.slug,
      category: (t.categories as Record<string, string>)[row.catalog_items.category_id] ?? row.catalog_items.category_id,
      label: labelOf(row),
      detail: detailOf(row),
      rarity: row.catalog_items.rarity_base ?? null,
    }))
})

const poolItems = computed<ChainStation[]>(() => {
  const inChain = new Set(stations.value.map((station) => station.id))
  return (rig.value ?? [])
    .filter((row: any) => !inChain.has(row.id))
    .map((row: any) => ({
      id: row.id,
      slug: row.catalog_items.slug,
      category: (t.categories as Record<string, string>)[row.catalog_items.category_id] ?? row.catalog_items.category_id,
      label: labelOf(row),
      detail: detailOf(row),
      rarity: row.catalog_items.rarity_base ?? null,
    }))
})

function applyChain(next: ChainStation[]) {
  stations.value = next
  chainOrder.save(next.map((station) => station.id))
}

function appendToChain(gearId: string) {
  const row = poolItems.value.find((item) => item.id === gearId)
  if (row) applyChain([...stations.value, row])
}

// Bei leerer Kette gibt es nichts anzusehen - dann steht die Geraeteliste
// sofort rechts, der Umweg ueber einen Knopf waere Schikane.
//
// Bewusst EINMALIG und nicht als watchEffect: der wuerde nach jedem
// Leerwerden erneut zuschlagen und "Fertig" sofort wieder aufheben - man
// kaeme aus der Bearbeitung nicht mehr heraus.
const chainAutoOpened = ref(false)
watchEffect(() => {
  if (chainAutoOpened.value) return
  if (rig.value === null) return
  chainAutoOpened.value = true
  if (isOwn.value && stations.value.length === 0) editing.value = true
})

// "Aus der Kette genommen" ist kein Loeschen: das Geraet steht danach
// wieder im Pool. Der Hinweis sagt das, weil ein "X" sonst nach Loeschen
// aussieht - und Loeschen waere hier ein teurer Irrtum.
const removedHint = ref(false)
function noteRemoved() {
  removedHint.value = true
}

const rigEvents = computed(() =>
  buildRigEvents(
    (rig.value ?? []).map((row: any): RigEventSource => ({
      id: row.id,
      label: labelOf(row),
      slug: row.catalog_items.slug,
      detail: detailOf(row),
      rarity: row.catalog_items.rarity_base ?? null,
      createdAt: row.created_at,
    })),
  ),
)

const rarityCount = computed(
  () => (rig.value ?? []).filter((row: any) => row.catalog_items.rarity_base === 'rare').length,
)
const specialCount = computed(
  () => (rig.value ?? []).filter((row: any) => row.catalog_items.rarity_base === 'special').length,
)
```

Die Gear-Abfrage muss `chain_position`, `created_at` und `rarity_base` mitlesen:

```ts
    .select('id, year, finish, modifications, chain_position, created_at, catalog_items ( slug, name, category_id, rarity_base, brands ( name ) )')
```

Und das Template:

```vue
<template>
  <div v-if="profile" class="flex flex-col gap-f-8">
    <ProfileHeader
      :display-name="profile.display_name"
      :real-name="profile.real_name"
      :bio="profile.bio"
      :bands="profile.bands"
      :avatar-url="avatarUrl"
      :device-count="(rig ?? []).length"
      :rarity-count="rarityCount"
      :special-count="specialCount"
      :mate-count="mates?.mateCount ?? null"
      :mate-count-failed="mateCountFailed"
      :is-own="isOwn"
    />

    <p v-if="rigError" class="text-danger">{{ t.profile.loadError }}</p>

    <div v-else class="grid gap-7 lg:grid-cols-[15.5rem_1fr]">
      <GearPanel
        :groups="gearGroups"
        :stations="stations"
        :is-own="isOwn"
        :editing="editing"
        :save-status="chainOrder.status.value"
        @edit="editing = true"
        @done="editing = false"
        @update:stations="applyChain"
        @remove="noteRemoved"
        @retry="chainOrder.retry()"
      />

      <!-- Bearbeiten tauscht die rechte Spalte: kein eigener Screen, kein
           Overlay. Besucher sehen davon nichts, bei ihnen bleibt der Feed. -->
      <ClientOnly v-if="editing && isOwn">
        <div class="flex min-w-0 flex-col gap-2">
          <p v-if="removedHint" class="font-mono text-xs text-muted">{{ t.profile.chainRemovedHint }}</p>
          <GearPool :items="poolItems" @append="appendToChain" />
        </div>
      </ClientOnly>

      <div v-else class="flex min-w-0 flex-col gap-3.5">
        <p v-if="rigEvents.length === 0" class="text-muted">{{ t.profile.feedEmpty }}</p>
        <FeedItem
          v-for="event in rigEvents"
          :key="event.day"
          :event="event"
          :display-name="profile.display_name"
        />
      </div>
    </div>
  </div>
  <p v-else-if="profileError" class="text-danger">{{ t.profile.loadError }}</p>
  <p v-else class="text-muted">{{ t.profile.notFound }}</p>
</template>
```

**`<ClientOnly>` ist Pflicht** um alles, was `vuedraggable` enthaelt — die Bibliothek greift auf `document` zu und bricht sonst den Server-Render.

- [ ] **Step 3: Bestehenden Seitentest anpassen**

`tests/component/profile.test.ts` prueft heute Markup, das es nicht mehr gibt. Die Struktur des Tests bleibt (Suspense-Mount, Supabase-Stub), die Erwartungen wandern auf die neuen Komponenten. Der Stub braucht jetzt auch `rarity_base`, `chain_position` und `created_at` in `fakeGearRow`, und `$fetch` muss gestubbt werden:

```ts
vi.stubGlobal('$fetch', vi.fn(() => Promise.resolve({ mateCount: 0 })))
```

Diese vier Erwartungen muessen bleiben oder neu entstehen — sie halten den wiederkehrenden Fehler in Schach:

```ts
  it('zeigt einen Ladefehler des Rigs, statt ein leeres Rig vorzutaeuschen', async () => {
    const wrapper = await mountProfile('alice-1', 'alice-1', {
      profiles: { data: fakeProfile() },
      gear_items: { error: { message: 'boom' } },
    })
    expect(wrapper.text()).toContain(de.profile.loadError)
  })

  it('zeigt ein leeres Rig als leeres Rig, nicht als Fehler', async () => {
    const wrapper = await mountProfile('alice-1', 'alice-1', {
      profiles: { data: fakeProfile() },
      gear_items: { data: [] },
    })
    expect(wrapper.text()).not.toContain(de.profile.loadError)
  })
```

- [ ] **Step 4: Tests laufen lassen**

```bash
yarn vitest run tests/component/profile.test.ts
```

Erwartet: PASS.

- [ ] **Step 5: In der echten App ansehen**

```bash
yarn dev
```

Mit `demo-halbtakt-hanno@rigmate.invalid` anmelden (Passwort in `scripts/seed-users.ts`), dann ein Profil oeffnen. Pruefen:

1. Zweispaltig ab breitem Fenster, gestapelt am schmalen
2. Reiter wechselt zwischen Liste und Kette
3. Auf dem eigenen Profil: „Kette bearbeiten" tauscht die rechte Spalte
4. Ziehen funktioniert, die Pfeile auch
5. Nach dem Neuladen ist die Reihenfolge noch da

- [ ] **Step 6: Commit**

```bash
git add app/pages/profile tests/component/profile.test.ts
git commit -m "feat(profile): zweispaltiges Profil mit Equipment-Panel und Feed"
```

---

## Task 17: Fehlerfarbe nachziehen

Beim Umstellen der Seiten fiel auf: **die Tokens haben keine Farbe fuer Fehlermeldungen.** Die Seiten
benutzen heute `text-red-600`. Dafuer `--rm-rare` zu nehmen waere falsch — Bernstein gehoert
ausschliesslich der Seltenheit, sonst ist genau die Trennung kaputt, auf der das Farbkonzept steht.

**Files:**
- Modify: `app/assets/css/main.css`

- [x] **Step 1: Token in allen drei Bloecken ergaenzen**

In `:root`, in `@media (prefers-color-scheme: dark) :root:not([data-theme="light"])` und in
`:root[data-theme="dark"]` — **in allen dreien**, sonst faellt die Farbe in einem Zustand auf nichts zurueck:

```css
  /* Fehler und Zerstoerendes. Eigene Farbe, weil --rm-rare ausschliesslich
     der Seltenheit gehoert - ein roter Fehlertext in Bernstein waere
     doppeldeutig genau dort, wo Eindeutigkeit zaehlt. */
  --rm-danger: #a33a2b;          /* dunkel: #e0897a */
```

Und im `@theme inline`-Block:

```css
  --color-danger: var(--rm-danger);
```

- [x] **Step 2: Pruefen, dass die Utility entsteht**

```bash
yarn dev
```

Auf einer beliebigen Seite in den DevTools pruefen, dass `text-danger` eine Regel erzeugt. Nuxt bindet auf
`[::1]:3000` (IPv6); auf deutschem Windows heisst der Zustand in `netstat` **`ABHOEREN`**.

- [x] **Step 3: Commit**

```bash
git add app/assets/css/main.css
git commit -m "feat(ui): eigenes Token fuer Fehlerfarbe"
```

---

**Nachtrag zur Umsetzung.** Der Task legte nur das Token an. Die drei Stellen mit `// TODO Task 17`
liegen aber in `GearPanel.vue`, `ProfileHeader.vue` und `profile/[id].vue` — und keine dieser drei
Dateien steht in der Dateiliste von Task 18 oder 19. Sie waeren durchgefallen und sind hier
mitgenommen worden.

Step 2 ist nicht als Blick in die DevTools erledigt, sondern als Abruf: `curl` auf
`/_nuxt/assets/css/main.css`, darin `.text-danger` gesucht und `--rm-danger` gezaehlt — einmal hell,
zweimal dunkel. **Der erste Anlauf hatte es nur in zwei von drei Bloecken.** Der `@media`-Block ist
vier Leerzeichen eingerueckt, das Ersetzungsmuster passte auf zwei; genau der Fehler, vor dem der
Task selbst warnt. Ein Blick auf eine gerenderte Seite haette das nicht gezeigt.

---

## Task 18: Seiten auf die Tokens umstellen

Rein mechanisch, kein neues Design. Ziel: kein `neutral-*`, kein `bg-white`, kein `text-red-*` mehr in
`app/`. Danach ist die App im Dunkelmodus durchgaengig statt halb.

**Files (7 Seiten):**
- Modify: `app/pages/login.vue`, `app/pages/register.vue`, `app/pages/confirm.vue`,
  `app/pages/index.vue`, `app/pages/search.vue`, `app/pages/settings.vue`, `app/pages/onboarding.vue`

- [x] **Step 1: Ersetzungstabelle anwenden**

| alt | neu |
|---|---|
| `bg-neutral-50` | `bg-bg` |
| `bg-white` | `bg-surface` |
| `bg-neutral-100` | `bg-surface-2` |
| `text-neutral-900` | `text-ink` |
| `text-neutral-600`, `text-neutral-500` | `text-muted` |
| `border-neutral-200`, `border-neutral-300` | `border-line` |
| `border` ohne Farbe | `border border-line-soft` |
| `bg-neutral-900` (Schaltflaeche) | `bg-accent` |
| `text-white` **auf** `bg-accent` | `text-accent-ink` |
| `text-red-600`, `text-red-700` | `text-danger` |
| `underline` bei Links | `text-accent hover:underline` |

**Nicht blind ersetzen.** Sieh dir jede Stelle an: `text-white` auf einem dunklen Knopf wird
`text-accent-ink`, `text-white` auf einem Bild bleibt `text-white`. Und wo `border` ohne Farbangabe steht,
erbt es heute Tailwinds Standardgrau — das muss explizit werden.

- [x] **Step 2: Sprachtest und volle Suite**

```bash
yarn test
```

Erwartet: gruen. Haengt ein Komponententest an einer alten Klasse, **passe den Test an — dreh die Klasse
nicht zurueck.** Genau dafuer sind die Tests da.

- [x] **Step 3: Beide Themes ansehen**

`yarn dev`, dann jede der sieben Seiten einmal hell und einmal dunkel. Dunkel erreichst du ueber die
System-Einstellung oder indem du in den DevTools `data-theme="dark"` ans `<html>` haengst.

Achte auf: weisse Flaechen, die dunkel bleiben muessten; Text, der auf seinem Grund verschwindet;
Rahmen, die im Dunkeln unsichtbar werden.

- [x] **Step 4: Commit**

```bash
git add app/pages
git commit -m "refactor(ui): Seiten auf die Farbtokens umgestellt"
```

---

**Nachtrag zur Umsetzung.** Zwei Zeilen der Ersetzungstabelle stimmten nicht:

- `border` ohne Farbe erbt in **Tailwind v4 `currentColor`**, nicht Tailwinds Standardgrau — das war
  v3. Die Raender standen also in Ink-Farbe, und der Sprung auf `border-line-soft` waere einer ins
  fast Unsichtbare gewesen. Formularfelder und Listenrahmen haben `border-line` bekommen.
- `divide-y` ohne Farbe faellt aus demselben Grund auf `currentColor`. Die drei Listen haben
  `divide-line-soft` bekommen.

Ausserdem trug `settings.vue` ein `text-green-700` fuer die Erfolgsmeldung, das weder die Tabelle
oben noch der Kontrollgrep aus Task 19 erfasst. Es ist `text-muted` geworden — dasselbe, was
`GearPanel` fuer „Reihenfolge gespeichert" benutzt.

Step 3 ist **nur messbar** erledigt: jede benutzte Utility existiert im generierten CSS (auch
`divide-line-soft`, das einen Kindselektor bekommt und mit einem Muster auf `.name {` faelschlich als
fehlend gilt), die beiden Dunkel-Bloecke sind zeichengleich, und jedes benutzte Farbpaar hat einen
Kontrastwert. Dabei kam heraus: **`muted` auf `bg` liegt im Hellmodus bei 4,01:1** und damit unter
den 4,5:1 aus WCAG AA fuer Fliesstext; `rare` bei 3,80, `special` bei 4,05. Im Dunkelmodus bestehen
alle Paare. Das sind Werte aus Task 3, nicht aus diesem Task — aber `text-muted` reicht jetzt weiter
als vorher. **Entscheidung offen, und das Ansehen mit eigenen Augen steht noch aus.**

---

## Task 19: Gear-Seite, Rig und die Komponenten umstellen

Dieselbe Tabelle wie Task 18, aber diese Dateien sind groesser und haben mehr Zustaende.

**Files (5):**
- Modify: `app/pages/gear/[slug].vue`, `app/pages/rig.vue`
- Modify: `app/components/CatalogPicker.vue`, `app/components/GearItemForm.vue`,
  `app/components/PersonSuggestion.vue`

- [x] **Step 1: Ersetzungstabelle aus Task 18 anwenden**

Zwei Besonderheiten:

- **`app/pages/gear/[slug].vue` ist oeffentlich** (Abschnitt 10 der Hauptspec) und zeigt Seltenheit an.
  Die Seltenheitsstufe dort bekommt jetzt dieselbe Farbe wie im Profil-Panel: `text-rare` fuer `rare`,
  `text-special` fuer `special`, sonst nichts. **Das ist der einzige Ort ausser dem Profil, an dem
  Bernstein auftauchen darf.**
- **`app/components/CatalogPicker.vue`** hat eine Auswahlliste mit Hover- und Aktiv-Zustaenden. Dort
  `bg-neutral-100` als Hover → `bg-surface-2`, ausgewaehlt → `bg-accent-wash`.

- [x] **Step 2: Volle Suite**

```bash
yarn test
```

- [x] **Step 3: Kontrolle, dass wirklich nichts uebrig ist**

```bash
grep -rn "neutral-\|bg-white\|text-red-\|border-red-" app/ || echo "sauber"
```

Erwartet: `sauber`. Findet der Befehl noch etwas, gehoert es entweder umgestellt oder es gibt einen
Grund — dann Kommentar an die Stelle.

- [x] **Step 4: Beide Themes ansehen**

`yarn dev`, dann `/gear/<beliebiger-slug>`, `/rig` und ein Formular mit dem CatalogPicker, jeweils hell
und dunkel.

- [x] **Step 5: Commit**

```bash
git add app/pages app/components
git commit -m "refactor(ui): Gear-Seite, Rig und Komponenten auf die Farbtokens umgestellt"
```

---

**Nachtrag zur Umsetzung.** Drei Annahmen des Tasks trafen nicht zu:

- **Der Kontrollgrep aus Step 3 ist zu eng.** Er meldete „sauber", waehrend `text-amber-700`,
  `text-green-700` und `text-neutral-400` unangetastet dastanden. Gescannt wurde stattdessen ueber
  alle Tailwind-Farbfamilien.
- **`CatalogPicker` hat weder einen `bg-neutral-100`-Hover noch einen Auswahlzustand.** Die Optionen
  hatten ueberhaupt keine Rueckmeldung. Gebaut ist der gemeinte Hover (`hover:bg-surface-2`, dazu
  `focus-visible` fuer die Tastatur); einen Auswahlzustand gibt es nicht, ein Klick waehlt sofort.
- **Links sind `text-accent underline` geworden statt `text-accent hover:underline`.** `accent` gegen
  `ink` sind nur 2,16:1 — ohne bleibende Unterstreichung waeren Links im Fliesstext allein ueber die
  Farbe unterscheidbar, und das unterhalb der 3:1 aus WCAG 1.4.1.

Bernstein hat drei Fremdnutzungen abgegeben — „ungeprueft" auf der Gear-Seite (`text-amber-700`) und
im Picker (`text-amber-600`), dazu der Praezisions-Hinweis in `GearItemForm` (`bg-amber-50`). Weil das
Abzeichen im Picker dadurch von der Stufenangabe daneben nicht mehr zu unterscheiden war, traegt es
seine Auszeichnung jetzt ueber die Form (Rahmen) statt ueber die Farbe.

Dafuer bekommt die Seltenheit auf der Gear-Seite ihre Farbe, ueber `rarityNameClass()` statt
abgeschrieben. Zwei Tests decken **beide** Richtungen ab: dass Bernstein bei einer Rarissime kommt
und dass es bei Massenware ausbleibt. Ohne die zweite Haelfte bestuende der Test auch, wenn jeder
Eintrag leuchtete.

`tests/component/index.test.ts` hing an `.text-neutral-400`. Da die Klasse jetzt fuer zwei Elemente
derselben Karte gilt, laeuft der Selektor ueber `data-fallback`.

---

## Task 20: Abschluss

**Files:**
- Modify: `CLAUDE.md`

- [x] **Step 1: Volle Testsuite**

```bash
yarn test
```

Erwartet: alles gruen, deutlich ueber 259 Tests.

- [x] **Step 2: API-Tests**

```bash
yarn dev
```

In einem zweiten Fenster:

```bash
yarn test:api
```

Erwartet: alles gruen.

- [x] **Step 3: Build und Geheimnis-Kontrolle**

```bash
yarn build
grep -r "service_role" .output/public/
```

Erwartet: `grep` findet **nichts**. Findet es etwas, ist der Service-Key im Client-Bundle gelandet — dann sofort stoppen und die Ursache suchen.

- [x] **Step 4: `CLAUDE.md` um die neuen Fallstricke ergaenzen**

Unter „Fallstricke, die uns beim Bauen Zeit gekostet haben":

```markdown
- **`yarn add vuedraggable` installiert die Vue-2-Fassung.** `latest` ist 2.24.3. Die Vue-3-Variante ist `vuedraggable@4.1.0` vom `next`-Tag. Und sie vertraegt kein SSR — alles, was sie enthaelt, gehoert in `<ClientOnly>`.
- **Kein eindeutiger Index auf `(owner_id, chain_position)`.** Er wuerde jedes Umsortieren blockieren, weil der Zwischenzustand ihn verletzt; `deferrable` geht bei einem partiellen Index nicht. `set_chain_order()` haelt die Positionen stattdessen geschlossen.
- **`gear_items.installed_in_id` ist nicht die Signalkette.** Es heisst „Tonabnehmer ist in Gitarre verbaut" und haengt an einer Ein-Ebenen-Invariante mit eigenem Trigger. Die Kette ist `chain_position`.
- **Ein HTML-Kommentar im `<template>` kostet den Attribute-Fallthrough.** Kommentar plus Element sind zwei Wurzelknoten, Vue reicht dann kein `class` von aussen mehr durch — `wrapper.classes()` kommt im Test leer zurueck, ohne jede Fehlermeldung. Erklaerende Kommentare gehoeren ins `<script setup>`.
- **`mt-*` auf einem textlosen Flex-Kind unter `items-baseline` verschiebt nichts.** Flexbox richtet einen Kasten ohne Text an seiner unteren Margin-Kante aus; das `margin-top` treibt nur die Zeilenhoehe hoch. Im Profil-Panel waren das 2,19px je Zeile fuer null Wirkung. Wer einen Punkt vertikal ausrichten will, aendert die Ausrichtung, nicht den Abstand.
- **`data-*`-Attribute als Testselektoren** gibt es seit dem Profilumbau (`data-cable` in `SignalChain.vue`). Vorher wurde ueber Tags und einmal ueber eine Klasse selektiert. Ueber ein Tag zu selektieren zaehlt jedes kuenftige Icon mit, ueber eine Klasse koppelt den Test ans Styling — fuer strukturelle Elemente ist `data-*` das robustere Mittel.
```

Und unter „Architekturregeln":

```markdown
- **Farben und Schriften kommen aus den Tokens in [main.css](app/assets/css/main.css)**, nie als `neutral-*` oder Hex im Template. `--rm-rare` und `--rm-special` gehoeren **ausschliesslich** der Seltenheit — wer Bernstein woanders benutzt, macht die Auszeichnung unlesbar.
```

- [x] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: Fallstricke aus dem Profilumbau in CLAUDE.md"
```

---

**Nachtrag zur Umsetzung.** Step 4 war beim Erreichen dieses Tasks schon erledigt — die dort
aufgezaehlten Fallstricke stehen seit dem Commit „docs: CLAUDE.md auf den Stand des Profilumbaus
bringen" in der Datei. Ergaenzt wurden stattdessen die vier, die beim Umstellen dazukamen
(Tailwind-v4-Rahmenfarbe, `TEST_BASE_URL`, der zu enge Kontrollgrep, Utility statt Token pruefen).

**Zu Step 2 ein Fund, der fast einen stillen Fehlgriff ergeben haette:** `TEST_BASE_URL` steht auf
`http://localhost:3000`, und Nuxt weicht auf **3001** aus, wenn 3000 belegt ist. Genau das war der
Fall — auf 3000 lief eine fremde App. `yarn test:api` haette diese befragt. Gegenprobe: gegen 3000
fallen 36 von 38 Tests, gegen 3001 sind alle 38 gruen. Vor dem Lauf gehoert ein HTTP-Aufruf, der
belegt, welche App antwortet.

Bei Step 3 ist der Grep um seine eigene Gegenprobe ergaenzt worden: derselbe Ausdruck findet
`service_role` im **Server**-Bundle, wo er hingehoert. Ohne diesen zweiten Lauf beweist ein leeres
Ergebnis nur, dass der Pfad stimmt — nicht, dass nichts geleakt ist.

---

## Was dieser Plan bewusst offen laesst

- **Das Layout der uebrigen Seiten bleibt unveraendert.** Tasks 18 und 19 stellen nur ihre Farben auf die Tokens um, damit der Dunkelmodus durchgaengig ist — sie bekommen kein neues Design. Danach faellt der Rest der App gestalterisch weiterhin gegen das Profil ab, aber nichts sieht mehr kaputt aus.
- **Posts, Kommentare, Likes, Folgen** bleiben Stufe 2. Ihre Schaltflaechen sind entworfen und deaktiviert.
- **Gerätefotos.** `catalog_items.image_path` existiert, ist aber leer. Kommen Bilder dazu, aendert sich das Layout nicht.
- **Die Kette auf dem Handy.** Die Spalten stehen dort untereinander, gezogen wird nichts — „Anhaengen" und die Pfeile tragen die Bedienung. Das ist gebaut, aber auf einem echten Geraet nicht erprobt.

---

## Offen nach dem ersten Browserlauf (Stand Task 16)

Beim ersten Rendern der fertigen Seite gefunden. Zwei Fehler wurden sofort behoben (der
`vuedraggable`-Absturz durch einen Kommentar im Item-Slot, der Ueberlauf durch `minmax(auto,1fr)`), diese
Punkte stehen noch offen:

### Entschieden, noch nicht gebaut

- **Die linke Spalte wird im Bearbeitungsmodus breiter** (~22rem statt 15,5rem), die rechte schrumpft
  entsprechend. *(Robbys Entscheidung.)* Grund: Griff und drei Knoepfe fressen ~85 von 248px, die
  Geraetenamen werden abgeschnitten („Fender Strat…"). Der sichtbare Sprung beim Umschalten ist der
  bewusst akzeptierte Preis; die Alternativen waren Knoepfe unter dem Namen (jede Station deutlich
  hoeher) oder kuerzere Namen (zwei Strats verschiedener Marken nicht mehr unterscheidbar).

### Gemeldet, noch nicht entschieden

- **`GearPool`-Karten kuerzen auch im Normalfall** („Fender Deluxe Rever…") — `minmax(11rem,1fr)` plus
  `truncate`. Bei kurzen Namen unauffaellig.
- **Auch die Ansichtsfassung ist eng:** Name und Detail teilen sich eine Baseline-Zeile, „Gretsch White
  Falcon" bricht auf zwei Zeilen, „1997 · White" daneben auch. Gehoert zu `GearList`.
- ~~**„Reihenfolge gespeichert" bleibt nach „Fertig" stehen**~~ — **behoben.** Die Quittung geht
  jetzt mit dem Bearbeitungsmodus. Ausdruecklich nur sie: `pending` und `error` bleiben auch nach
  „Fertig" sichtbar, sonst waere der Fix genau der stille Fehlschlag, den der Kommentar ueber
  `showSaveState` seit Task 12 verhindern soll. Eine Gegenprobe mit dem groben Fix
  (`return props.editing`) laesst fuenf Tests fallen.

### Nebenbefund ausserhalb dieses Plans, unbestaetigt

- **`login.vue` navigiert nach erfolgreichem Anmelden womoeglich nicht weiter.** Die Sitzung steht (die
  Navigation wechselt auf „Abmelden"), die Route bleibt `/login`. Der Code sieht richtig aus
  (`navigateTo(safeRedirect(route.query.redirect))`, und `safeRedirect` liefert bei leerem Query
  korrekt `/`), und der Befund stammt aus einer headless-Umgebung. **Vor einem Fix reproduzieren.**

### Demo-Daten, die beim Bauen veraendert wurden

Auf der geteilten Instanz: **Halbtakt-Hanno hat eine Signalkette** (Strat → DS-1 → TS9) und **zwei
Profil-Links**. Kein Demo-Nutzer hatte vorher beides, und ohne ist die halbe Seite nicht anzusehen.
`yarn seed:users` raeumt die Kette wieder weg, die Links nicht.
