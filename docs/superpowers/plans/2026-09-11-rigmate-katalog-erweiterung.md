# Katalogerweiterung und Rig-Eingabe — Umsetzungsplan

> **Für agentische Arbeiter:** ERFORDERLICHE SUB-SKILL: `superpowers:subagent-driven-development` (empfohlen) oder `superpowers:executing-plans`, um diesen Plan Task für Task umzusetzen. Die Schritte nutzen Checkbox-Syntax (`- [ ]`) zur Verfolgung.

**Ziel:** Der Katalog nimmt digitales und virtuelles Equipment auf, führt das Setup des ersten echten Nutzers, und die Rig-Seite nimmt alles über ein einziges Eingabefeld an und gliedert die Ausgabe nach Kategorie.

**Architektur:** Drei neue Kategorien kommen per Migration, der Inhalt über den kuratierten Seed. Die Bereinigung der überladenen `preamp`-Schublade läuft ebenfalls über den Seed, weil `ensureItem` `category_id` bei jedem Lauf mitschreibt. Die Saitenstärken sind der Sonderfall: sie benennen referenzierte Einträge um und brauchen deshalb eine Migration, keinen Seed-Lauf. Die Rig-Seite verliert ihre kategorisierte Eingabe und gruppiert stattdessen die Ausgabe.

**Tech-Stack:** Nuxt 4 (SSR), Supabase (Postgres, RLS), Vitest, Vue Test Utils mit happy-dom, yarn.

**Spec:** [docs/superpowers/specs/2026-09-11-rigmate-katalog-erweiterung-design.md](../specs/2026-09-11-rigmate-katalog-erweiterung-design.md)

## Globale Vorgaben

- **Arbeitsbranch ist `development`.** `main` bleibt stabil, gemergt wird per fast-forward.
- **Schema ist Code.** Jede DB-Änderung als Migration unter `supabase/migrations/`, angelegt mit `yarn db:new <name>`, angewandt mit `yarn db:push`. Niemals von Hand im Dashboard oder per MCP.
- **Die Instanz ist geteilt.** Migrationen und Seeds wirken sofort für beide Rechner.
- **Sichtbare Texte** liegen deutsch in `app/locales/de.ts`, Bezeichner englisch.
- **In `.vue`-Dateien keine echten Umlaute**, auch nicht in Kommentaren — „ae", „oe", „ue", „ss". Der Sprachtest ist ein AST-Scan über die ganze Datei. In `.ts` und `.sql` sind Umlaute erlaubt.
- **Kommentare deutsch** — Ausnahme `scripts/data/catalog.ts`, die durchgehend englisch kommentiert ist; dort dem Dateistil folgen.
- **Jede Supabase-Antwort und jedes `$fetch` prüft seinen Fehler** und macht ihn vom legitimen Leerergebnis unterscheidbar. Das ist der wiederkehrende Fehler dieses Projekts.
- **Bei jedem neuen Test fragen: kann der überhaupt fehlschlagen?**
- `yarn test` = Unit, Komponenten, DB (444 vor diesem Plan). `yarn test:api` braucht einen laufenden `yarn dev` auf Port 3000.

---

## Task 1: Die drei neuen Kategorien

**Dateien:**
- Anlegen: `supabase/migrations/<zeitstempel>_digital_categories.sql`
- Ändern: `app/locales/de.ts:25-36`
- Test: `tests/db/catalog.test.ts`

**Schnittstellen:**
- Liefert: die Kategorie-IDs `modeller`, `loadbox`, `plugin` in `categories`, jeweils `is_consumable = false`, mit `sort_order` 35, 45, 47. Task 2 und Task 4 hängen Katalogeinträge daran, Task 6 liest `sort_order` für die Gruppierung.

- [ ] **Schritt 1: Den fehlschlagenden Test schreiben**

Ans Ende von `tests/db/catalog.test.ts` anfügen:

```ts
describe('Digitale Kategorien', () => {
  it('kennt modeller, loadbox und plugin als nicht-verbrauchbare Kategorien', async () => {
    const { data, error } = await admin
      .from('categories')
      .select('id, is_consumable, sort_order')
      .in('id', ['modeller', 'loadbox', 'plugin'])
      .order('sort_order')

    expect(error).toBeNull()
    expect(data).toEqual([
      { id: 'modeller', is_consumable: false, sort_order: 35 },
      { id: 'loadbox', is_consumable: false, sort_order: 45 },
      { id: 'plugin', is_consumable: false, sort_order: 47 },
    ])
  })

  it('sortiert die neuen Kategorien in die Verstaerkungskette ein', async () => {
    const { data, error } = await admin.from('categories').select('id').order('sort_order')

    expect(error).toBeNull()
    expect(data?.map((row) => row.id)).toEqual([
      'guitar', 'bass', 'amp', 'modeller', 'cabinet', 'loadbox', 'plugin',
      'pedal', 'pickup', 'preamp', 'accessory', 'strings', 'pick',
    ])
  })
})
```

Der zweite Test prüft die **vollständige** Reihenfolge, nicht nur die Anwesenheit der drei Neuen. Ein `toContain` bestünde auch, wenn `plugin` hinter `pick` landete.

- [ ] **Schritt 2: Test laufen lassen und Fehlschlag sehen**

```bash
yarn vitest run tests/db/catalog.test.ts -t "Digitale Kategorien"
```

Erwartet: FAIL — `data` ist ein leeres Array, weil die Kategorien nicht existieren.

- [ ] **Schritt 3: Migration anlegen**

```bash
yarn db:new digital_categories
```

In die erzeugte Datei:

```sql
-- Drei Kategorien fuer Equipment, das den Klang formt, ohne ein klassisches
-- Geraet zu sein. Begruendung in Abschnitt 3 der Spec vom 11.09.2026: rein
-- kommt, was den Klang formt, draussen bleibt, was das Signal nur
-- transportiert oder aufzeichnet (Interface, DAW, DI-Box).
--
-- Die sort_order-Werte liegen in den Luecken der bestehenden Zehnerschritte
-- und halten die Verstaerkungskette zusammen:
-- amp 30 -> modeller 35 -> cabinet 40 -> loadbox 45 -> plugin 47 -> pedal 50
insert into categories (id, is_consumable, sort_order) values
  ('modeller', false, 35),
  ('loadbox',  false, 45),
  ('plugin',   false, 47)
on conflict (id) do nothing;
```

`on conflict do nothing`, damit ein zweiter Lauf auf der geteilten Instanz nicht scheitert.

- [ ] **Schritt 4: Migration anwenden und Test laufen lassen**

```bash
yarn db:push
yarn vitest run tests/db/catalog.test.ts -t "Digitale Kategorien"
```

Erwartet: PASS.

- [ ] **Schritt 5: Labels ergänzen**

In `app/locales/de.ts` den `categories`-Block erweitern — in derselben Reihenfolge wie `sort_order`, damit die Datei lesbar bleibt:

```ts
  categories: {
    guitar: 'Gitarre',
    bass: 'Bass',
    amp: 'Amp',
    modeller: 'Modeller',
    cabinet: 'Cabinet',
    loadbox: 'Loadbox',
    plugin: 'Plugin',
    pedal: 'Pedal',
    pickup: 'Tonabnehmer',
    preamp: 'Preamp',
    accessory: 'Zubehör',
    strings: 'Saiten',
    pick: 'Plektrum',
  },
```

- [ ] **Schritt 6: Test, dass kein Label fehlt**

In `tests/db/catalog.test.ts` im neuen `describe` ergänzen:

```ts
  it('hat fuer jede Kategorie in der Datenbank ein deutsches Label', async () => {
    const { data, error } = await admin.from('categories').select('id')

    expect(error).toBeNull()
    expect(data!.length).toBeGreaterThan(0)
    const labels = de.categories as Record<string, string>
    const ohneLabel = data!.map((row) => row.id).filter((id) => !labels[id])
    expect(ohneLabel).toEqual([])
  })
```

Dafür oben in der Datei `import { de } from '../../app/locales/de'` ergänzen, falls noch nicht vorhanden.

Dieser Test schlägt in Zukunft fehl, sobald jemand eine Kategorie anlegt und das Label vergisst — genau der stille Leerzustand, der sonst als „" in der Oberfläche landet.

- [ ] **Schritt 7: Volle Testsuite und Commit**

```bash
yarn test
git add supabase/migrations app/locales/de.ts tests/db/catalog.test.ts
git commit -m "feat(catalog): Kategorien fuer Modeller, Loadbox und Plugins

Drei Kategorien fuer Equipment, das den Klang formt, ohne ein
klassisches Geraet zu sein. Die sort_order haelt die
Verstaerkungskette zusammen, statt die Neuen hinten anzuhaengen.

Dazu ein Test, der fehlschlaegt, sobald eine Kategorie ohne
deutsches Label existiert.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Die `preamp`-Schublade bereinigen

**Dateien:**
- Ändern: `scripts/data/catalog.ts` (fünf Einträge, Zeilen um 1363-1405)
- Test: `tests/db/catalogSeed.test.ts`

**Schnittstellen:**
- Nutzt: die Kategorien aus Task 1.
- Liefert: Kemper Profiler, Quad Cortex, Axe-Fx III und Helix in `modeller`, Torpedo Captor X in `loadbox`. Keine Namensänderung, also bleiben alle IDs und Referenzen bestehen.

- [ ] **Schritt 1: Den fehlschlagenden Test schreiben**

Ans Ende von `tests/db/catalogSeed.test.ts` anfügen:

```ts
describe('Bereinigte preamp-Kategorie', () => {
  // Einzeln geprueft statt ueber ein "preamp enthaelt nichts Digitales
  // mehr" - eine solche Bedingung bestuende auch auf leerer Tabelle.
  const UMZUEGE: Array<[string, string]> = [
    ['Profiler', 'modeller'],
    ['Quad Cortex', 'modeller'],
    ['Axe-Fx III', 'modeller'],
    ['Helix', 'modeller'],
    ['Torpedo Captor X', 'loadbox'],
  ]

  it.each(UMZUEGE)('fuehrt "%s" in der Kategorie %s', (name, kategorie) => {
    const line = CATALOG.find((entry) => entry.name === name)
    expect(line, `"${name}" fehlt im Katalog`).toBeDefined()
    expect(line!.category).toBe(kategorie)
  })

  it('laesst keinen Modeller und keine Loadbox mehr unter preamp stehen', () => {
    const preamps = CATALOG.filter((entry) => entry.category === 'preamp').map((e) => e.name)
    for (const [name] of UMZUEGE) {
      expect(preamps).not.toContain(name)
    }
    // Die Kategorie bleibt bewohnt - sonst haette ein versehentliches
    // Leerraeumen denselben gruenen Test.
    expect(preamps.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Schritt 2: Test laufen lassen und Fehlschlag sehen**

```bash
yarn vitest run tests/db/catalogSeed.test.ts -t "Bereinigte preamp"
```

Erwartet: FAIL — alle fünf stehen noch auf `preamp`.

- [ ] **Schritt 3: Die fünf Kategorien im Seed ändern**

In `scripts/data/catalog.ts` bei den fünf Einträgen `category` austauschen. Beispiel für den ersten:

```ts
  {
    brand: 'Kemper',
    name: 'Profiler',
    category: 'modeller',
    synonyms: ['kemper', 'profiler'],
    rarity: 'special',
  },
```

Ebenso `Quad Cortex`, `Axe-Fx III` und `Helix` auf `'modeller'`, `Torpedo Captor X` auf `'loadbox'`.

Über den vier Modellern einen Kommentar setzen (englisch, wie die Datei):

```ts
  // Modellers, not preamps. They were filed under `preamp` because there was
  // nowhere else to put them -- which stayed invisible while the rig list was
  // flat, and stops being invisible the moment that list groups by category.
```

- [ ] **Schritt 4: Test laufen lassen**

```bash
yarn vitest run tests/db/catalogSeed.test.ts -t "Bereinigte preamp"
```

Erwartet: PASS.

- [ ] **Schritt 5: Seed anwenden und gegen die Instanz prüfen**

```bash
yarn seed:catalog
```

Danach prüfen, dass der Umzug wirklich in der Datenbank steht und nicht nur in der Datei:

```bash
yarn vitest run tests/db/catalogSeed.test.ts
```

- [ ] **Schritt 6: Volle Testsuite und Commit**

```bash
yarn test
git add scripts/data/catalog.ts tests/db/catalogSeed.test.ts
git commit -m "refactor(catalog): Modeller und Loadbox raus aus preamp

Ein Kemper Profiler ist kein Preamp. Die Einordnung war eine
Wohin-sonst-Entscheidung und blieb folgenlos, solange die Rig-Liste
flach war - sobald sie nach Kategorie gruppiert, steht der Profiler
fuer jeden sichtbar unter der Ueberschrift Preamp.

Namen und IDs bleiben, also bleiben alle Referenzen bestehen.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Saitenstärken an den Namen

**Dateien:**
- Anlegen: `supabase/migrations/<zeitstempel>_string_gauges_in_name.sql`
- Ändern: `scripts/data/catalog.ts` (drei Saiten-Einträge um Zeile 1450-1472)
- Ändern: `scripts/data/demoUsers.ts` (fünf Stellen: Zeilen 68, 153, 166, 278, 290)
- Ändern: `tests/db/catalogSeed.test.ts` (`PROTECTED_NAMES`, Zeile 43)
- Test: `tests/db/catalogSeed.test.ts`

**Schnittstellen:**
- Liefert: die Katalognamen `EXL110 (10-46)`, `EXL120 (9-42)`, `NYXL1046 (10-46)`. Task 4 legt `EXL140 (10-52)` und `NYXL0980 (9-80)` im selben Format an.

**Das ist der heikelste Task des Plans.** Die drei Einträge sind von fünf Demo-Präferenzen referenziert, und auf `catalog_items` liegt überall `on delete restrict`. Läuft die Umbenennung über den Seed, sucht `ensureItem` per `(brand_id, name)`, findet unter dem neuen Namen nichts, legt einen **zweiten** Eintrag an und lässt den alten als referenzierte Waise stehen. Deshalb: Migration.

- [ ] **Schritt 1: Den fehlschlagenden Test schreiben**

Ans Ende von `tests/db/catalogSeed.test.ts` anfügen:

```ts
describe('Saitenstaerken im Namen', () => {
  const UMBENANNT = ['EXL110 (10-46)', 'EXL120 (9-42)', 'NYXL1046 (10-46)']
  const ALT = ['EXL110', 'EXL120', 'NYXL1046']

  it.each(UMBENANNT)('fuehrt "%s" genau einmal', async (name) => {
    const { data, error } = await admin.from('catalog_items').select('id').eq('name', name)

    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  // Der eigentliche Punkt: die Umbenennung darf keine Dublette erzeugt
  // haben. Genau das passiert, wenn jemand sie ueber den Seed loest.
  it.each(ALT)('hat "%s" nicht als zweiten Eintrag stehen lassen', async (name) => {
    const { data, error } = await admin.from('catalog_items').select('id').eq('name', name)

    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('haelt die bestehenden Praeferenzen an den umbenannten Eintraegen', async () => {
    const { data: items, error: itemsError } = await admin
      .from('catalog_items')
      .select('id')
      .in('name', UMBENANNT)
    expect(itemsError).toBeNull()
    expect(items).toHaveLength(3)

    const { count, error } = await admin
      .from('preferences')
      .select('id', { count: 'exact', head: true })
      .in('catalog_item_id', items!.map((row) => row.id))

    expect(error).toBeNull()
    // Fuenf Demo-Nutzer bevorzugen diese drei Saetze. Waere die Umbenennung
    // ueber den Seed gelaufen, zeigten sie weiter auf die alten Eintraege
    // und dieser Wert waere 0.
    expect(count).toBe(5)
  })
})
```

- [ ] **Schritt 2: Test laufen lassen und Fehlschlag sehen**

```bash
yarn vitest run tests/db/catalogSeed.test.ts -t "Saitenstaerken"
```

Erwartet: FAIL — die neuen Namen existieren nicht, die alten schon.

- [ ] **Schritt 3: Migration anlegen**

```bash
yarn db:new string_gauges_in_name
```

In die erzeugte Datei:

```sql
-- Die Saitenstaerke gehoert an den Namen (Abschnitt 7 der Spec vom
-- 11.09.2026): ein EXL140 IST 10-52, das ist Produkteigenschaft und keine
-- Besitzinformation. Die Regel "kein Baujahr im Modellnamen" bleibt
-- unberuehrt, sie zielt auf Besitzdetails.
--
-- Warum das hier steht und nicht im Seed: ensureItem() in
-- scripts/seed-catalog.ts sucht per (brand_id, name). Unter dem neuen Namen
-- faende es nichts, legte einen ZWEITEN Eintrag an und liesse den alten als
-- Waise stehen -- referenziert von fuenf Demo-Praeferenzen, und
-- catalog_items traegt ueberall on delete restrict. Ein --prune liefe damit
-- ins Messer. Ein update behaelt die id und alle Referenzen.
--
-- Nebenwirkung, bewusst in Kauf genommen: der Trigger regeneriert bei
-- Namensaenderung den slug, die drei oeffentlichen Gear-Seiten bekommen
-- also neue URLs.
update catalog_items ci
set name = v.neu
from (values
  ('EXL110',   'EXL110 (10-46)'),
  ('EXL120',   'EXL120 (9-42)'),
  ('NYXL1046', 'NYXL1046 (10-46)')
) as v (alt, neu)
join brands b on b.name = 'D''Addario'
where ci.name = v.alt and ci.brand_id = b.id;
```

- [ ] **Schritt 4: Migration anwenden**

```bash
yarn db:push
```

- [ ] **Schritt 5: Seed-Daten nachziehen**

In `scripts/data/catalog.ts` die drei Namen angleichen und die Stärke als Synonym ergänzen — sonst schriebe der nächste Seed-Lauf die alten Namen zurück und erzeugte genau die Dublette, die die Migration vermeidet:

```ts
  {
    brand: "D'Addario",
    name: 'EXL110 (10-46)',
    category: 'strings',
    synonyms: ['exl110', 'exl 110', '10-46'],
    rarity: 'mass',
  },
  {
    brand: "D'Addario",
    name: 'EXL120 (9-42)',
    category: 'strings',
    synonyms: ['exl120', 'exl 120', '9-42'],
    rarity: 'common',
  },
  {
    brand: "D'Addario",
    name: 'NYXL1046 (10-46)',
    category: 'strings',
    synonyms: ['nyxl', 'nyxl1046', '10-46'],
    rarity: 'common',
  },
```

Darüber einen Kommentar (englisch):

```ts
  // Gauge belongs in the name where an entry denotes ONE concrete set: an
  // EXL110 is 10-46, always. Entries that denote a SERIES sold in many
  // gauges -- Elixir Nanoweb, Ernie Ball Slinky -- stay without one, because
  // a gauge on those would simply be wrong.
```

- [ ] **Schritt 6: Die fünf Demo-Referenzen nachziehen**

In `scripts/data/demoUsers.ts` alle fünf Vorkommen ersetzen:
- Zeile 68: `preferences: ['EXL110 (10-46)', 'Jazz III']`
- Zeile 153: `preferences: ['EXL110 (10-46)', 'Nylon Standard']`
- Zeile 166: `preferences: ['EXL120 (9-42)', 'Jazz III']`
- Zeile 278: `preferences: ['EXL110 (10-46)', 'Nylon Standard']`
- Zeile 290: `preferences: ['NYXL1046 (10-46)', 'Tortex']`

Kontrolle, dass keine übersehen wurde:

```bash
grep -n "'EXL110'\|'EXL120'\|'NYXL1046'" scripts/data/demoUsers.ts
```

Erwartet: keine Ausgabe. `seed-users.ts` prüft die Namen zwar vorab und wirft laut („Demo-Daten fehlerhaft"), aber ein Fehlschlag beim Seed-Lauf ist der teurere Weg, das zu merken.

- [ ] **Schritt 7: `PROTECTED_NAMES` nachziehen**

In `tests/db/catalogSeed.test.ts` Zeile 43 `'EXL110'` durch `'EXL110 (10-46)'` ersetzen. Die Liste schützt Namen, die anderswo nachgeschlagen werden — sie muss den neuen Namen schützen, nicht den alten.

- [ ] **Schritt 8: Tests laufen lassen**

```bash
yarn vitest run tests/db/catalogSeed.test.ts
yarn vitest run tests/unit/modelYearRule.test.ts
```

Erwartet: beide PASS. Der Baujahr-Test führt `EXL110` als Beispiel für einen Namen mit Ziffern, der **kein** Baujahr enthält — das Muster `/\b(19|20)\d{2}\b|\b\d{2}er\b|['’]\d{2}\b/` greift bei `(10-46)` nicht, der Test bleibt gültig.

- [ ] **Schritt 9: Demo-Seed prüfen**

```bash
yarn seed:catalog
yarn seed:users
yarn vitest run tests/db/demoSeed.test.ts
```

Erwartet: PASS. Läuft `seed:users` mit „Demo-Daten fehlerhaft: unbekannter Katalog-Eintrag", wurde in Schritt 6 eine Stelle übersehen.

- [ ] **Schritt 10: Volle Testsuite und Commit**

```bash
yarn test
git add supabase/migrations scripts/data/catalog.ts scripts/data/demoUsers.ts tests/db/catalogSeed.test.ts
git commit -m "feat(catalog): Saitenstaerke steht im Namen

Ein EXL140 IST 10-52 - Produkteigenschaft, keine Besitzinformation.
Die Regel kein-Baujahr-im-Namen bleibt unberuehrt, sie zielt auf
Besitzdetails.

Die Umbenennung laeuft als Migration, nicht ueber den Seed:
ensureItem sucht per (brand_id, name), faende unter dem neuen Namen
nichts und legte einen zweiten Eintrag an - waehrend der alte als von
fuenf Praeferenzen referenzierte Waise stehen bliebe. Der Test prueft
darum ausdruecklich, dass es die alten Namen NICHT mehr gibt und die
Praeferenzen mitgewandert sind.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Die neuen Katalogeinträge

**Dateien:**
- Ändern: `scripts/data/catalog.ts` (neue Einträge in den jeweiligen Kategorieblöcken)
- Test: `tests/db/catalogSeed.test.ts`, `tests/unit/catalogMatch.test.ts`

**Schnittstellen:**
- Nutzt: die Kategorien aus Task 1, das Namensformat aus Task 3.
- Liefert: 19 Einträge unter drei neuen Marken (Randall, Fortin, Edwards) und sechs bestehenden.

- [ ] **Schritt 1: Den fehlschlagenden Test schreiben**

Ans Ende von `tests/db/catalogSeed.test.ts`:

```ts
describe('Setup des ersten echten Nutzers', () => {
  const ERWARTET: Array<{ brand: string; name: string; category: string; rarity: RarityBase }> = [
    { brand: 'LTD', name: 'Alexi-600', category: 'guitar', rarity: 'special' },
    { brand: 'Edwards', name: 'Alexi Arrowhead', category: 'guitar', rarity: 'rare' },
    { brand: 'EMG', name: 'HZ-H2', category: 'pickup', rarity: 'common' },
    { brand: 'EMG', name: 'ABQ', category: 'preamp', rarity: 'special' },
    { brand: 'ESP', name: 'MM-04', category: 'preamp', rarity: 'rare' },
    { brand: 'Randall', name: 'Satan 120', category: 'amp', rarity: 'special' },
    { brand: 'Fortin', name: 'Grind', category: 'pedal', rarity: 'special' },
    { brand: 'Fortin', name: 'Zuul+', category: 'pedal', rarity: 'common' },
    { brand: 'Fortin', name: 'Natas Distortion', category: 'pedal', rarity: 'common' },
    { brand: 'Two Notes', name: 'Torpedo Reload', category: 'loadbox', rarity: 'special' },
    { brand: 'Neural DSP', name: 'Fortin NTS Suite', category: 'plugin', rarity: 'special' },
    { brand: "D'Addario", name: 'EXL140 (10-52)', category: 'strings', rarity: 'mass' },
    { brand: "D'Addario", name: 'NYXL0980 (9-80)', category: 'strings', rarity: 'special' },
  ]

  it.each(ERWARTET)('fuehrt $brand $name als $category ($rarity)', ({ brand, name, category, rarity }) => {
    const line = CATALOG.find((entry) => entry.name === name)
    expect(line, `"${name}" fehlt im Katalog`).toBeDefined()
    expect(line!.brand).toBe(brand)
    expect(line!.category).toBe(category)
    expect(line!.rarity).toBe(rarity)
  })

  // Zweistufig nur dort, wo die Seltenheit wirklich spreizt. Eine Linie mit
  // genau einer Ausfuehrung behauptet eine Spreizung, die es nicht gibt -
  // darum wird die jeweils verbreitete Ausfuehrung mit angelegt.
  it.each([
    { linie: 'Blackjack ATX', ausfuehrungen: ['Blackjack ATX C-1', 'Blackjack ATX C-8'] },
    { linie: 'Nazgul', ausfuehrungen: ['Nazgul 7', 'Nazgul 8'] },
  ])('spreizt $linie ueber mehrere Ausfuehrungen', ({ linie, ausfuehrungen }) => {
    const line = CATALOG.find((entry) => entry.name === linie)
    expect(line, `Linie "${linie}" fehlt`).toBeDefined()
    const namen = line!.variants?.map((v) => v.name) ?? []
    expect(namen).toEqual(ausfuehrungen)

    const stufen = new Set([line!.rarity, ...(line!.variants?.map((v) => v.rarity) ?? [])])
    expect(stufen.size).toBeGreaterThan(1)
  })

  it.each(['Randall', 'Fortin', 'Edwards'])('kennt die Marke %s', (brand) => {
    expect(CATALOG.some((entry) => entry.brand === brand)).toBe(true)
  })
})
```

- [ ] **Schritt 2: Test laufen lassen und Fehlschlag sehen**

```bash
yarn vitest run tests/db/catalogSeed.test.ts -t "Setup des ersten"
```

Erwartet: FAIL für alle Einträge — „fehlt im Katalog".

- [ ] **Schritt 3: Die Gitarren ergänzen**

In `scripts/data/catalog.ts` im Gitarrenblock, in der Nähe der bestehenden ESP- und LTD-Einträge:

```ts
  {
    // Edwards is ESP's Japanese sub-brand, and gets its own brand row for
    // the same reason LTD does: price bracket and rarity stay separable.
    // The synonyms carry discoverability through the parent brand, since
    // `buildSearchable` also matches "brand + synonym".
    brand: 'Edwards',
    name: 'Alexi Arrowhead',
    category: 'guitar',
    synonyms: ['esp alexi', 'edwards alexi', 'alexi arrowhead', 'arrowhead', 'alexi laiho'],
    rarity: 'rare',
  },
  {
    brand: 'LTD',
    name: 'Alexi-600',
    category: 'guitar',
    synonyms: ['alexi 600', 'alexi600', 'esp alexi', 'alexi laiho'],
    rarity: 'special',
  },
  {
    // The C-8 is the reason this line is two-tiered: an eight-string ATX is
    // a different proposition from the six-string one.
    brand: 'Schecter',
    name: 'Blackjack ATX',
    category: 'guitar',
    synonyms: ['blackjack atx', 'blackjack'],
    rarity: 'special',
    variants: [
      { name: 'Blackjack ATX C-1', synonyms: ['atx c1', 'blackjack c1'], rarity: 'common' },
      { name: 'Blackjack ATX C-8', synonyms: ['atx c8', 'blackjack c8', '8 string'], rarity: 'rare' },
    ],
  },
```

- [ ] **Schritt 4: Tonabnehmer und Preamps ergänzen**

Im Pickup-Block:

```ts
  {
    brand: 'EMG',
    name: 'HZ-H2',
    category: 'pickup',
    synonyms: ['hz h2', 'hzh2', 'emg hz'],
    rarity: 'common',
  },
  {
    brand: 'Seymour Duncan',
    name: 'Nazgul',
    category: 'pickup',
    synonyms: ['nazgul'],
    rarity: 'common',
    variants: [
      { name: 'Nazgul 7', synonyms: ['nazgul 7 string', 'nazgul7'], rarity: 'special' },
      { name: 'Nazgul 8', synonyms: ['nazgul 8 string', 'nazgul8'], rarity: 'special' },
    ],
  },
```

Im Preamp-Block — beide sind Onboard-Preamps, die in einem Instrument sitzen; dass sie verbaut sind, sagt `installed_in_id`, nicht die Kategorie:

```ts
  {
    // Onboard preamps, not rack units. The category holds both; what tells
    // them apart on a rig page is `installed_in_id`, not the category.
    brand: 'EMG',
    name: 'ABQ',
    category: 'preamp',
    synonyms: ['abq', 'emg abq'],
    rarity: 'special',
  },
  {
    brand: 'ESP',
    name: 'MM-04',
    category: 'preamp',
    synonyms: ['mm04', 'mm 04', 'esp mm04'],
    rarity: 'rare',
  },
```

- [ ] **Schritt 5: Amp, Pedale, Loadbox und Plugin ergänzen**

Im Amp-Block:

```ts
  {
    brand: 'Randall',
    name: 'Satan 120',
    category: 'amp',
    synonyms: ['satan', 'satan 120', 'ola englund'],
    rarity: 'special',
  },
```

Im Pedal-Block:

```ts
  // Fortin is a boutique brand, and that is NOT what rarity measures. The
  // Zuul sits on half the metal boards there are, and the Natas pedal is
  // more common than its price suggests. Price and prestige are not the
  // scale -- how surprising a shared ownership would be is.
  {
    brand: 'Fortin',
    name: 'Grind',
    category: 'pedal',
    synonyms: ['grind', 'fortin grind'],
    rarity: 'special',
  },
  {
    brand: 'Fortin',
    name: 'Zuul+',
    category: 'pedal',
    synonyms: ['zuul', 'zuul plus', 'fortin zuul'],
    rarity: 'common',
  },
  {
    // Named "Natas Distortion" so Fortin's actual Natas amp can sit beside
    // it later without a name collision -- names are unique file-wide.
    brand: 'Fortin',
    name: 'Natas Distortion',
    category: 'pedal',
    synonyms: ['natas', 'fortin natas'],
    rarity: 'common',
  },
```

Neu, hinter den Modellern:

```ts
  {
    brand: 'Two Notes',
    name: 'Torpedo Reload',
    category: 'loadbox',
    synonyms: ['reload', 'torpedo reload'],
    rarity: 'special',
  },
  {
    // A plugin is its own product under its own brand -- Neural DSP, not
    // Fortin. It is deliberately NOT a variant of any physical cabinet: the
    // database enforces that a variant shares its line's brand, so a
    // third-party IR could never hang under the original anyway.
    brand: 'Neural DSP',
    name: 'Fortin NTS Suite',
    category: 'plugin',
    synonyms: ['nts', 'fortin nts', 'nts suite'],
    rarity: 'special',
  },
```

Im Saiten-Block:

```ts
  {
    brand: "D'Addario",
    name: 'EXL140 (10-52)',
    category: 'strings',
    synonyms: ['exl140', 'exl 140', '10-52'],
    rarity: 'mass',
  },
  {
    // An eight-string set is a strong signal: it says downtuned before the
    // owner says anything.
    brand: "D'Addario",
    name: 'NYXL0980 (9-80)',
    category: 'strings',
    synonyms: ['nyxl0980', 'nyxl 0980', '9-80'],
    rarity: 'special',
  },
```

- [ ] **Schritt 6: Tests laufen lassen**

```bash
yarn vitest run tests/db/catalogSeed.test.ts -t "Setup des ersten"
```

Erwartet: PASS.

- [ ] **Schritt 7: Den Suchtest schreiben**

In `tests/unit/catalogMatch.test.ts` ergänzen — die Suche ist der Grund, warum Edwards eine eigene Marke bleiben darf:

```ts
describe('Auffindbarkeit ueber die Dachmarke', () => {
  it('findet die Edwards ueber "ESP Alexi", obwohl die Marke Edwards heisst', () => {
    const entries = buildSearchable([
      {
        id: 'edwards-alexi',
        name: 'Alexi Arrowhead',
        slug: 'edwards-alexi-arrowhead',
        brandName: 'Edwards',
        categoryId: 'guitar',
        parentId: null,
        lineId: 'edwards-alexi',
        synonyms: ['esp alexi', 'edwards alexi', 'arrowhead', 'alexi laiho'],
        rarityBase: 'rare',
        isVerified: true,
      },
    ])

    const treffer = matchCatalog('ESP Alexi', entries, { limit: 5 })

    expect(treffer.map((m) => m.entry.id)).toContain('edwards-alexi')
  })

  it('findet einen Saitensatz ueber seine Staerke', () => {
    const entries = buildSearchable([
      {
        id: 'exl140',
        name: 'EXL140 (10-52)',
        slug: 'daddario-exl140-10-52',
        brandName: "D'Addario",
        categoryId: 'strings',
        parentId: null,
        lineId: 'exl140',
        synonyms: ['exl140', 'exl 140', '10-52'],
        rarityBase: 'mass',
        isVerified: true,
      },
    ])

    const treffer = matchCatalog('10-52', entries, { limit: 5 })

    expect(treffer.map((m) => m.entry.id)).toContain('exl140')
  })
})
```

Falls `buildSearchable` und `matchCatalog` in der Datei noch nicht importiert sind, den Import oben ergänzen.

- [ ] **Schritt 8: Suchtest laufen lassen**

```bash
yarn vitest run tests/unit/catalogMatch.test.ts -t "Auffindbarkeit"
```

Erwartet: PASS. Schlägt der erste Test fehl, fehlt `'esp alexi'` in den Synonymen — das Synonym ist der ganze Mechanismus.

- [ ] **Schritt 9: Seed anwenden**

```bash
yarn seed:catalog
yarn test
```

- [ ] **Schritt 10: Commit**

```bash
git add scripts/data/catalog.ts tests/db/catalogSeed.test.ts tests/unit/catalogMatch.test.ts
git commit -m "feat(catalog): Setup des ersten echten Nutzers aufgenommen

19 Eintraege unter drei neuen Marken (Randall, Fortin, Edwards). Zwei
Linien sind zweistufig, weil dort die Seltenheit wirklich spreizt -
die jeweils verbreitete Ausfuehrung wird mit angelegt, sonst behauptet
die Linie eine Spreizung, die es nicht gibt.

Edwards bleibt eine eigene Markenzeile wie LTD; die Auffindbarkeit
ueber ESP tragen Synonyme, weil buildSearchable auch Marke+Synonym
vergleicht. Ein Test belegt das, statt es zu behaupten.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Ein Eingabefeld auf der Rig-Seite

**Dateien:**
- Ändern: `app/pages/rig.vue:160-200` (Template: die drei Sektionen)
- Ändern: `app/locales/de.ts` (`rig`-Block)
- Test: `tests/component/rig.test.ts`

**Schnittstellen:**
- Nutzt: `is_consumable` aus `categories` (Task 1).
- Liefert: `addToRig(result)` in `rig.vue` — nimmt ein `CatalogSearchResult`, legt daraus je nach Kategorie eine Präferenz an oder öffnet das Exemplar-Formular. Task 6 baut auf derselben Datenlage auf.

- [ ] **Schritt 1: Den fehlschlagenden Test schreiben**

In `tests/component/rig.test.ts` ergänzen:

```ts
describe('rig.vue - ein Eingabefeld fuer alles', () => {
  it('legt Verbrauchsmaterial still als Praeferenz an, ohne Exemplar-Formular', async () => {
    const supabase = createSupabaseStub({
      initialReads: {
        ...EMPTY_RIG,
        categories: { data: [
          { id: 'guitar', is_consumable: false, sort_order: 10 },
          { id: 'strings', is_consumable: true, sort_order: 90 },
        ] },
      },
      writes: { preferences: [{ data: [{ id: 'pref-1' }] }] },
    })
    const wrapper = await mountRig(supabase)

    await selectGearItem(wrapper, fakeSearchResult({
      id: 'exl140', name: 'EXL140 (10-52)', brandName: "D'Addario", categoryId: 'strings',
    }))

    // Kein Formular: bei Verbrauchsmaterial gibt es kein Baujahr und keine
    // Modifikation, danach zu fragen waere eine Rueckfrage nach etwas
    // bereits Bekanntem.
    expect(wrapper.findComponent(GearItemForm).exists()).toBe(false)
    // Die Nutzlast wird gelesen, nicht nur der Aufruf beobachtet.
    expect(supabase.inserts.preferences[0]).toMatchObject({
      user_id: 'test-user',
      catalog_item_id: 'exl140',
    })
    expect(supabase.inserts.gear_items ?? []).toHaveLength(0)
  })

  it('oeffnet fuer ein Geraet weiterhin das Exemplar-Formular', async () => {
    const supabase = createSupabaseStub({
      initialReads: {
        ...EMPTY_RIG,
        categories: { data: [{ id: 'guitar', is_consumable: false, sort_order: 10 }] },
      },
    })
    const wrapper = await mountRig(supabase)

    await selectGearItem(wrapper, fakeSearchResult())

    expect(wrapper.findComponent(GearItemForm).exists()).toBe(true)
    expect(supabase.inserts.preferences ?? []).toHaveLength(0)
  })

  it('zeigt einen Fehler, wenn die Kategorien nicht geladen werden koennen', async () => {
    const supabase = createSupabaseStub({
      initialReads: {
        ...EMPTY_RIG,
        categories: { error: { message: 'permission denied for table categories' } },
      },
    })
    const wrapper = await mountRig(supabase)

    // Ohne Kategorien ist unentscheidbar, was Verbrauchsmaterial ist. Das
    // muss sichtbar scheitern statt alles als Geraet zu behandeln.
    expect(wrapper.text()).toContain(de.rig.loadError)
  })
})
```

- [ ] **Schritt 2: Test laufen lassen und Fehlschlag sehen**

```bash
yarn vitest run tests/component/rig.test.ts -t "ein Eingabefeld"
```

Erwartet: FAIL — die Seite lädt keine Kategorien und legt für Saiten kein `preferences` an.

- [ ] **Schritt 3: Kategorien laden**

In `app/pages/rig.vue` im `<script setup>` nach den bestehenden `useAsyncData`-Aufrufen:

```ts
const categoriesLoadError = ref(false)

// Welche Kategorie Verbrauchsmaterial ist, weiss die Datenbank. Eine Kopie
// im Frontend waere eine zweite Wahrheit, die auseinanderlaeuft.
const { data: categories } = await useAsyncData('rig-categories', async () => {
  const { data, error } = await supabase.from('categories').select('id, is_consumable, sort_order')
  if (error) {
    categoriesLoadError.value = true
    return []
  }
  return data ?? []
})

const consumableIds = computed(
  () => new Set((categories.value ?? []).filter((row: any) => row.is_consumable).map((row: any) => row.id)),
)
```

- [ ] **Schritt 4: Die Weiche einbauen**

Ebenfalls in `rig.vue`:

```ts
// Autovervollstaendigung statt Rueckfrage (Abschnitt 5 der Hauptspec): was
// aus einem Treffer wird, entscheidet seine Kategorie, nicht der Nutzer.
async function addToRig(result: any) {
  if (consumableIds.value.has(result.categoryId)) {
    await addPreference(result)
    return
  }
  pendingItem.value = result
}
```

- [ ] **Schritt 5: Das Template umbauen**

**Nur die Eingabe, nicht die Ausgabe.** Die beiden Saiten-Picker verschwinden, der Equipment-Picker leitet über `addToRig`. Die **beiden bestehenden Listen bleiben in diesem Task unverändert stehen** — würden sie hier schon fallen, wäre der Zwischenstand kaputt: Präferenzen ließen sich anlegen, wären aber unsichtbar, bis Task 6 sie wieder einblendet. Task 6 ersetzt dann beide Listen auf einmal.

Die erste Sektion bekommt den Picker, der auf `addToRig` zeigt:

```vue
    <section class="flex flex-col gap-4">
      <h2 class="text-f-2xl font-semibold">{{ t.rig.gear }}</h2>
      <CatalogPicker v-if="!pendingItem" :create-handler="createCatalogItem" @select="addToRig" />
      <GearItemForm
        v-else
        :catalog-item-label="`${pendingItem.brandName} ${pendingItem.name}`"
        :owned-gear="ownedGear"
        :show-precision-hint="pendingItem.needsPrecisionHint"
        @save="saveGear"
        @cancel="pendingItem = null"
      />
      <p v-if="gearError" class="text-sm text-danger">{{ gearError }}</p>
      <p v-if="preferencesError" class="text-sm text-danger">{{ preferencesError }}</p>
      <p v-if="categoriesLoadError" class="text-sm text-danger">{{ t.rig.loadError }}</p>
      <!-- Liste bleibt hier unveraendert, Task 6 ersetzt sie -->
```

Aus der Sektion „Saiten und Plektren" werden **nur die beiden `<CatalogPicker>`-Zeilen** entfernt; ihre Überschrift, ihre Fehlermeldungen und ihre Liste bleiben, bis Task 6 sie auflöst.

Die Wunschlisten-Sektion bleibt vollständig unverändert — „habe ich" gegen „suche ich" kann das System nicht raten.

- [ ] **Schritt 6: Texte anpassen**

In `app/locales/de.ts` im `rig`-Block `gear` umbenennen, weil die Sektion jetzt alles aufnimmt:

```ts
    gear: 'Mein Equipment',
```

Der Schlüssel `preferences` („Saiten und Plektren") bleibt in diesem Task **unangetastet** — die Sektion existiert bis Task 6 weiter. Aufgeräumt wird er dort.

- [ ] **Schritt 7: Tests laufen lassen**

```bash
yarn vitest run tests/component/rig.test.ts
```

Erwartet: PASS für die neuen Tests. **Der bestehende Test „zeigt die eigene Meldung, wenn Verbrauchsmaterial als Equipment abgelehnt wird" schlägt jetzt fehl** — das ist richtig so: dieser Pfad ist unerreichbar geworden. Den Test **nicht löschen**, sondern umschreiben, sodass er den Trigger als letzte Instanz prüft statt die Oberfläche:

```ts
  it('zeigt die eigene Meldung, wenn die Datenbank Verbrauchsmaterial als Geraet ablehnt', async () => {
    // Unerreichbar ueber die Oberflaeche, seit die Kategorie entscheidet -
    // aber der Trigger bleibt die letzte Instanz, und wenn er zuschlaegt,
    // muss die Meldung stimmen statt generisch zu sein.
    const supabase = createSupabaseStub({
      initialReads: {
        ...EMPTY_RIG,
        categories: { data: [{ id: 'strings', is_consumable: false, sort_order: 90 }] },
      },
      writes: { gear_items: [{ error: { message: 'consumable items belong in preferences, not in gear_items' } }] },
    })
    const wrapper = await mountRig(supabase)
    await selectGearItem(wrapper, fakeSearchResult({ categoryId: 'strings' }))

    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain(de.rig.errorConsumableAsGear)
  })
```

- [ ] **Schritt 8: Volle Testsuite und Commit**

```bash
yarn test
git add app/pages/rig.vue app/locales/de.ts tests/component/rig.test.ts
git commit -m "feat(rig): ein Eingabefeld statt drei nach Kategorie

Die Vorsortierung war ueberfluessig - der Equipment-Picker filterte
ohnehin nie eine Kategorie heraus. Was aus einem Treffer wird,
entscheidet jetzt seine Kategorie: Verbrauchsmaterial wird still zur
Praeferenz, alles andere oeffnet das Exemplar-Formular.

Damit verschwindet auch der Fehlerfall Verbrauchsmaterial-als-Geraet
aus der Bedienung. Der Trigger bleibt als letzte Instanz, und sein
Test prueft ihn jetzt als solche.

Scheitert das Laden der Kategorien, sagt die Seite das - sonst waere
unentscheidbar, was Verbrauchsmaterial ist, und alles landete
stillschweigend als Geraet.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Gruppierte Ausgabe

**Dateien:**
- Ändern: `app/pages/rig.vue` (Lesezugriff auf `preferences`, Template der Liste)
- Test: `tests/component/rig.test.ts`

**Schnittstellen:**
- Nutzt: `categories` mit `sort_order` aus Task 5, `addToRig` aus Task 5.
- Liefert: `groupedRig` — eine nach `sort_order` geordnete Liste aus `{ categoryId, label, rows }`, leere Gruppen ausgelassen.

- [ ] **Schritt 1: Den fehlschlagenden Test schreiben**

```ts
describe('rig.vue - gruppierte Ausgabe', () => {
  const KATEGORIEN = [
    { id: 'guitar', is_consumable: false, sort_order: 10 },
    { id: 'amp', is_consumable: false, sort_order: 30 },
    { id: 'pedal', is_consumable: false, sort_order: 50 },
    { id: 'strings', is_consumable: true, sort_order: 90 },
  ]

  function rigMitInhalt() {
    return createSupabaseStub({
      initialReads: {
        categories: { data: KATEGORIEN },
        gear_items: { data: [
          { id: 'g1', year: null, finish: null, installed_in_id: null,
            catalog_items: { id: 'c1', name: 'Satan 120', category_id: 'amp', brands: { name: 'Randall' } } },
          { id: 'g2', year: null, finish: null, installed_in_id: null,
            catalog_items: { id: 'c2', name: 'Alexi-600', category_id: 'guitar', brands: { name: 'LTD' } } },
        ] },
        preferences: { data: [
          { id: 'p1', catalog_items: { id: 'c3', name: 'EXL140 (10-52)', category_id: 'strings', brands: { name: "D'Addario" } } },
        ] },
        wishlist_items: { data: [] },
      },
    })
  }

  it('gruppiert nach Kategorie in sort_order-Reihenfolge', async () => {
    const wrapper = await mountRig(rigMitInhalt())

    const ueberschriften = wrapper.findAll('[data-test="rig-group-label"]').map((n) => n.text())

    // Vollstaendiger Vergleich, keine Teilmenge: ein toContain bestuende
    // auch, wenn die Reihenfolge falsch waere.
    expect(ueberschriften).toEqual([de.categories.guitar, de.categories.amp, de.categories.strings])
  })

  it('laesst leere Kategorien weg', async () => {
    const wrapper = await mountRig(rigMitInhalt())

    // "pedal" ist als Kategorie bekannt, aber nichts liegt darin - sonst
    // staenden dreizehn Ueberschriften ueber einem fast leeren Rig.
    expect(wrapper.findAll('[data-test="rig-group-label"]').map((n) => n.text()))
      .not.toContain(de.categories.pedal)
  })

  it('zeigt Verbrauchsmaterial in derselben Liste', async () => {
    const wrapper = await mountRig(rigMitInhalt())

    const saiten = wrapper.get('[data-test="rig-group-strings"]')
    expect(saiten.text()).toContain("D'Addario EXL140 (10-52)")
  })

  it('zeigt den Leerzustand, wenn nichts eingetragen ist', async () => {
    const supabase = createSupabaseStub({
      initialReads: { ...EMPTY_RIG, categories: { data: KATEGORIEN } },
    })
    const wrapper = await mountRig(supabase)

    expect(wrapper.text()).toContain(de.rig.empty)
    expect(wrapper.findAll('[data-test="rig-group-label"]')).toHaveLength(0)
  })
})
```

- [ ] **Schritt 2: Test laufen lassen und Fehlschlag sehen**

```bash
yarn vitest run tests/component/rig.test.ts -t "gruppierte Ausgabe"
```

Erwartet: FAIL — es gibt keine Elemente mit `data-test="rig-group-label"`.

- [ ] **Schritt 3: `category_id` bei den Präferenzen mitlesen**

In `app/pages/rig.vue` den Lesezugriff erweitern — ohne `category_id` lässt sich eine Präferenz nicht einsortieren:

```ts
  const { data, error } = await supabase
    .from('preferences')
    .select('id, catalog_items ( id, name, category_id, brands ( name ) )')
    .eq('user_id', userId.value!)
```

- [ ] **Schritt 4: Die Gruppierung berechnen**

```ts
// Gruppiert Exemplare und Praeferenzen gemeinsam nach Kategorie. Die
// Reihenfolge kommt aus sort_order in der Datenbank, nicht aus einer
// Reihenfolge im Frontend - sonst gaebe es zwei Wahrheiten.
const groupedRig = computed(() => {
  const labels = t.categories as Record<string, string>
  const zeilen = [
    ...(gear.value ?? []).map((row: any) => ({
      key: `gear-${row.id}`,
      table: 'gear_items' as const,
      id: row.id,
      label: label(row),
      detail: [row.year, row.finish].filter(Boolean).join(' · '),
      categoryId: row.catalog_items.category_id,
    })),
    ...(preferences.value ?? []).map((row: any) => ({
      key: `pref-${row.id}`,
      table: 'preferences' as const,
      id: row.id,
      label: label(row),
      detail: '',
      categoryId: row.catalog_items.category_id,
    })),
  ]

  return (categories.value ?? [])
    .slice()
    .sort((a: any, b: any) => a.sort_order - b.sort_order)
    .map((category: any) => ({
      categoryId: category.id,
      label: labels[category.id] ?? category.id,
      rows: zeilen.filter((zeile) => zeile.categoryId === category.id),
    }))
    .filter((group: any) => group.rows.length > 0)
})

const rigIstLeer = computed(() => groupedRig.value.length === 0)
```

- [ ] **Schritt 5: Das Template umbauen**

Jetzt fällt die aus Task 5 stehengebliebene Sektion „Saiten und Plektren" **ganz** weg — Überschrift, Fehlermeldungen und Liste — und die Gear-Liste der ersten Sektion wird durch die gruppierte ersetzt. Die Fehlermeldung `preferencesLoadError` wandert dabei in die verbleibende Sektion, sonst verschwindet sie mit ihrer alten Heimat.

Damit wird auch `t.rig.preferences` („Saiten und Plektren") als Überschrift frei; der Schlüssel kann aus `app/locales/de.ts` entfernt werden, sobald `grep -rn "rig.preferences" app/ tests/` nichts mehr findet.

```vue
      <p v-if="gearLoadError || preferencesLoadError" class="text-sm text-danger">{{ t.rig.loadError }}</p>
      <p v-else-if="rigIstLeer" class="text-muted">{{ t.rig.empty }}</p>
      <div v-else class="flex flex-col gap-6">
        <div v-for="group in groupedRig" :key="group.categoryId" class="flex flex-col gap-2">
          <h3 data-test="rig-group-label" class="text-f-sm font-semibold uppercase tracking-wide text-muted">
            {{ group.label }}
          </h3>
          <ul :data-test="`rig-group-${group.categoryId}`" class="divide-y divide-line-soft rounded border border-line">
            <li v-for="row in group.rows" :key="row.key" class="flex items-center gap-2 px-3 py-2">
              <span>{{ row.label }}</span>
              <span v-if="row.detail" class="text-sm text-muted">{{ row.detail }}</span>
              <button type="button" class="ml-auto text-sm underline" @click="removeRow(row.table, row.id)">
                {{ t.rig.remove }}
              </button>
            </li>
          </ul>
        </div>
      </div>
```

Der Fehlerzustand steht **vor** dem Leerzustand: ein fehlgeschlagener Lesezugriff darf nicht wie ein leeres Rig aussehen.

- [ ] **Schritt 6: Tests laufen lassen**

```bash
yarn vitest run tests/component/rig.test.ts
```

Erwartet: PASS.

- [ ] **Schritt 7: Sprachtest und volle Suite**

```bash
yarn test
```

Der Sprachtest ist ein AST-Scan über jede `.vue`-Datei: keine statischen Textknoten, keine literalen `placeholder`/`title`/`aria-label`/`alt`, und **keine echten Umlaute, auch nicht in Kommentaren**. Die Kommentare im neuen Code entsprechend mit „ae"/„oe"/„ue"/„ss" schreiben.

- [ ] **Schritt 8: Im Browser ansehen**

```bash
yarn dev
```

Auf `/rig` mit dem eigenen Konto prüfen: Gitarren, Amp, Loadbox, Plugin, Pedale, Tonabnehmer, Preamps und Saiten stehen als eigene Gruppen in dieser Reihenfolge, und ein Saitensatz landet über dasselbe Feld wie eine Gitarre. **Einmal hell und einmal dunkel** — der vollständige visuelle Durchgang steht ohnehin noch aus.

- [ ] **Schritt 9: Commit**

```bash
git add app/pages/rig.vue tests/component/rig.test.ts
git commit -m "feat(rig): Liste gruppiert nach Kategorie

Die Kategorisierung gehoert in die Ausgabe, nicht in die Eingabe.
Reihenfolge und Zugehoerigkeit kommen aus sort_order in der Datenbank
statt aus einer zweiten Wahrheit im Frontend; leere Gruppen fallen
weg, sonst staenden dreizehn Ueberschriften ueber einem leeren Rig.

Der Fehlerzustand steht vor dem Leerzustand - ein fehlgeschlagener
Lesezugriff darf nicht wie ein leeres Rig aussehen.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Abschluss

**Dateien:**
- Ändern: `CLAUDE.md`
- Ändern: `docs/superpowers/specs/2026-09-11-rigmate-katalog-erweiterung-design.md` (Status)

- [ ] **Schritt 1: Alle Tests, beide Suiten**

```bash
yarn test
```

Ein `yarn dev` muss auf Port 3000 laufen — vorher prüfen, wer dort antwortet, sonst befragen die API-Tests still etwas anderes:

```bash
curl -s -o /dev/null -w "%{http_code}\n" --max-time 3 http://localhost:3000/api/catalog/search?q=stratocaster
yarn test:api
```

- [ ] **Schritt 2: Prüfen, dass kein Service-Key im Build landet**

```bash
yarn build && grep -r "service_role" .output/public/
```

Erwartet: keine Ausgabe.

- [ ] **Schritt 3: CLAUDE.md nachziehen**

Unter „Was noch aussteht" ergänzen, was dieser Plan offen gelassen hat:

- Selbst angelegte Katalogeinträge landen weiterhin auf `rarity_base = 'common'` (Tabellen-Default) — der Fehlanreiz aus Abschnitt 12 der Spec bleibt, solange es kein Backoffice gibt.
- Der Katalog bleibt dünn für Nischen-Setups; dieser Plan füllt genau ein reales Rig auf.
- Die Testzahlen in der Befehlstabelle auf den neuen Stand bringen.

- [ ] **Schritt 4: Commit und Push**

```bash
git add CLAUDE.md docs/superpowers/specs/2026-09-11-rigmate-katalog-erweiterung-design.md
git commit -m "docs: Katalogerweiterung abgeschlossen

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
git push origin development
```

---

## Was dieser Plan über die Spec hinaus festlegt

- **Die Reihenfolge der Tasks.** Kategorien vor Inhalten, Umbenennung vor neuen Saiten-Einträgen (sonst stünden im selben Block zwei Namensformate), Eingabe vor Gruppierung.
- **Die Kategorien-Reihenfolge kommt zur Laufzeit aus der Datenbank**, nicht aus einer Konstante im Frontend. Eine Kopie wäre eine zweite Wahrheit, die bei der nächsten Kategorie auseinanderläuft.
- **Der Test zum Fehlerfall „Verbrauchsmaterial als Gerät" wird umgeschrieben, nicht gelöscht.** Der Pfad ist über die Oberfläche unerreichbar geworden, der Trigger bleibt aber die letzte Instanz — und ein gelöschter Test wäre ein stillschweigend aufgegebener Schutz.
- **`Blackjack ATX C-1` und `Nazgul 7` werden mit angelegt**, obwohl sie niemandem gehören. Eine Linie mit genau einer Ausführung behauptet eine Spreizung, die es nicht gibt.
- **Der Sektionstitel „Equipment" wird zu „Mein Equipment"**, weil die Sektion jetzt auch Saiten aufnimmt.
