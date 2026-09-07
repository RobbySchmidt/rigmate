# Rigmate

Soziales Netzwerk für Gitarristen, bei dem **das Equipment den sozialen Graphen bildet**. Nicht „Facebook für Musiker", sondern näher an Letterboxd: ein strukturierter Gear-Katalog als Rückgrat, an dem das Soziale hochwächst. Man findet Menschen über ihr Equipment — gewichtet nach Seltenheit, damit nicht jeder mit einem Standard-Pedal jedem vorgeschlagen wird.

**Ausbaustufe 1 ist gebaut und auf `main` gemergt.** Der Gear-Graph funktioniert nachweislich: wer eine Rarität teilt, steht mit Faktor 3–5 über dem, der ein Allerweltspedal teilt.

**Aktuell in Arbeit: der Profilumbau auf `feature/profil-umbau`.** 43 Commits, 13 Migrationen, 444 Unit- und Komponententests plus 38 API-Tests, alle grün. Die Profilseite ist zweispaltig neu gebaut (Equipment-Panel links, Feed rechts), die Signalkette lässt sich per Drag and Drop pflegen. **Alle 20 Tasks sind durch**; was danach noch offen ist, steht unter „Was noch aussteht".

## Zuerst lesen

> **[docs/superpowers/specs/2026-09-06-rigmate-design.md](docs/superpowers/specs/2026-09-06-rigmate-design.md)**

Das ist die **Quelle der Wahrheit** für alles Inhaltliche: Datenmodell, Empfehlungslogik, Beziehungen, Feed, Sichtbarkeit, Ausbaustufen. Der Anhang listet jede Entscheidung mit Begründung — **vor dem Ändern einer Designentscheidung dort nachsehen, warum sie so getroffen wurde.** Vieles wirkt beliebig und ist es nicht.

**Die Spec wartet weiterhin auf das Review durch Robby.** Sie war beim Bauen bindend; wo der Implementierungsplan ihr widersprach, hat die Spec gewonnen.

> **[docs/superpowers/plans/2026-09-06-rigmate-stufe-1.md](docs/superpowers/plans/2026-09-06-rigmate-stufe-1.md)**

Der Plan für Stufe 1, vollständig abgearbeitet. Sein Abschnitt „Was dieser Plan über die Spec hinaus festlegt" listet die Entscheidungen, die beim Planen dazukamen. **Achtung: der Plan ist an mehreren Stellen überholt** — während der Umsetzung wurden Fehler darin gefunden und gegen ihn entschieden. Im Zweifel gilt der Code, nicht der Plan. Stufe 2 und 3 haben noch keine Pläne.

### Für den laufenden Profilumbau

> **[docs/superpowers/specs/2026-09-07-rigmate-profil-design.md](docs/superpowers/specs/2026-09-07-rigmate-profil-design.md)**

Designsprache und Aufbau der Profilseite. Ergänzt die Hauptspec, widerspricht ihr an genau einer benannten Stelle (Abschnitt 8). Hat wie die Hauptspec einen **Anhang mit jeder Entscheidung und ihrem Grund** — vor dem Ändern dort nachsehen.

> **[docs/superpowers/plans/2026-09-07-rigmate-profil-umbau.md](docs/superpowers/plans/2026-09-07-rigmate-profil-umbau.md)**

Der Umsetzungsplan, 20 Tasks. **Er wurde während der Umsetzung mehrfach korrigiert** — wo etwas gebaut wurde, das dem Plan widerspricht, steht der Grund als Nachtrag im Task selbst. Ganz unten der Abschnitt **„Offen nach dem ersten Browserlauf"** mit dem, was noch aussteht.

## Stack

Nuxt 4 (SSR) · Supabase (Postgres, Auth, Storage) über `@nuxtjs/supabase` · Tailwind v4 · Vitest · yarn

Directus wurde bewusst **nicht** genommen — Begründung in Abschnitt 12 der Spec.

## Setup auf einem neuen Rechner

Drei Dinge sind **gitignored** und müssen lokal neu entstehen:

1. **`.env`** (Vorlage: `.env.example`)
   - `SUPABASE_URL`, `SUPABASE_KEY` (anon), `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_DB_PASSWORD` — braucht `supabase db push`, steht in den Project Settings unter Database
2. **`.mcp.json`** (Vorlage: `.mcp.json.example`) — Supabase-MCP, lesend, auf das Projekt beschränkt. Der `SUPABASE_ACCESS_TOKEN` ist ein **Personal Access Token** aus den Account-Einstellungen, nicht einer der Projekt-Keys.
3. **Die CLI-Verbindung.** `supabase/.temp` ist gitignored, also ist das Projekt auf einem frischen Rechner **nicht verlinkt**:
   ```
   yarn install
   yarn supabase link --project-ref ipqrylwgdjxqmjvrarvq
   ```
   Die CLI braucht dafür einen Token. Statt eines eigenen `supabase login` reicht es, den PAT aus `.mcp.json` als `SUPABASE_ACCESS_TOKEN` in die Umgebung zu geben — derselbe Token, derselbe Zweck. Der `--read-only`-Schalter beschränkt den MCP-Server, nicht den Token.

**Keys nie in den Chat kopieren** — sie landen sonst im Verlauf; direkt in die Dateien eintragen.

Supabase-Projekt: `rigmate`, Region `eu-west-1`, Postgres 17.6. Lokales Supabase über Docker nutzen wir bewusst nicht — die Instanz ist gehostet, damit beide Rechner am selben Stand arbeiten. **Das heißt aber: Migrationen und Seeds wirken sofort für beide.**

## Befehle

| | |
|---|---|
| `yarn dev` | Dev-Server auf Port 3000 |
| `yarn test` | Unit-, Komponenten- und DB-Tests (444 auf dem Profil-Branch, 259 auf `main`) |
| `yarn test:api` | API-Tests (38 bzw. 33) — **braucht einen laufenden `yarn dev`**, und zwar auf Port 3000; sonst `TEST_BASE_URL` setzen (siehe Fallstricke) |
| `yarn db:new <name>` | neue Migration anlegen |
| `yarn db:push` | Migrationen auf die Instanz anwenden |
| `yarn seed:catalog` | Katalog einspielen, idempotent |
| `yarn seed:catalog --prune` | zusätzlich Einträge löschen, die nicht mehr in den Seed-Daten stehen |
| `yarn seed:users` | 20 Demo-Musiker anlegen, idempotent |

**Demo-Login zum Ausprobieren:** `demo-halbtakt-hanno@rigmate.invalid`, Passwort steht in [scripts/seed-users.ts](scripts/seed-users.ts). Nach dem Anmelden zeigt `/` echte Vorschläge mit Begründung, und „Mein Profil" in der Navigation führt auf die umgebaute Profilseite. Der interessanteste Demo-Fall ist **Röhrenglut Rüdiger** (über die Suche): vier Geräte, eine Rarität, zwei Besonderheiten — und **null Rig-Kollegen**, weil er nichts mit irgendwem teilt. Seltenheit verbindet nicht nur, sie isoliert auch.

## Architekturregeln

- **Logik gehört in Nuxt-Server-Routen**, nicht in den Client. Empfehlungen, Checker und die öffentliche Gear-Seite aggregieren über alle Nutzer — das rechnet der Browser nicht.
- Einfaches Lesen und Schreiben (Profil, Rig) darf direkt vom Client gegen Supabase laufen, abgesichert über RLS.
- **RLS ist Pflicht.** Ohne aktivierte Policies ist bei Supabase alles offen.
- **Schema ist Code.** Alle Änderungen als versionierte Migrationen unter `supabase/migrations/`, niemals von Hand im Dashboard oder per MCP. Stand: 13 Migrationen, lokal und auf der Instanz synchron.
- `service_role` key bleibt **serverseitig** — `server/`, `scripts/`, `tests/`, nie in `app/`. Nach jedem Build prüfen: `yarn build && grep -r "service_role" .output/public/` muss leer bleiben.
- In [nuxt.config.ts](nuxt.config.ts) steht `supabase.redirect: false` mit Absicht — sonst würde jeder Nicht-Angemeldete auf `/login` geschickt, aber Gear-Seiten sollen laut Abschnitt 10 öffentlich sein. Der Schutz läuft stattdessen per Seite über `app/middleware/auth.ts`.
- **Gemeinsame Regeln liegen unter `shared/utils/`** und dürfen nicht kopiert werden: `modelYearRule.ts` (kein Baujahr im Modellnamen), `rarityBase.ts`, `suggestionReason.ts`, `rarityStyle.ts` (Seltenheitsstufe → CSS-Klasse), `rigEvents.ts` (Feed-Ereignisse aus `gear_items.created_at`). Jede dieser Dateien entstand, weil eine Regel vorher zwei- bis sechsmal existierte und auseinanderlief.
- **Farben und Schriften kommen aus den Tokens in [app/assets/css/main.css](app/assets/css/main.css)**, nie als `neutral-*` oder Hex im Template. Die Tokens stehen dreifach: heller Grund vollständig in `:root`, dunkel als Überschreibung in `@media (prefers-color-scheme: dark)` **und** `[data-theme="dark"]`. Ein Token, das nur in einem der Dunkel-Blöcke steht, rendert im un-gestempelten Zustand die Textfarbe des einen Themes auf dem Grund des anderen.
- **`--rm-rare` und `--rm-special` (Bernstein) gehören ausschließlich der Seltenheit.** Sie ist die Mechanik, über die Menschen einander finden, keine Verzierung — wer Bernstein woanders benutzt, macht die Auszeichnung unlesbar. Für Fehler gibt es `--rm-danger`.

## Fallstricke, die uns beim Bauen Zeit gekostet haben

Das ist die wertvollste Liste in dieser Datei. Jeder Punkt hat mindestens einen echten Fehler verursacht.

- **`@nuxtjs/supabase` 2.0.10 liefert JWT-Claims, keine User-Objekte** — also `sub`, nie `.id`, und zwar aus `serverSupabaseUser` **und** `useSupabaseUser`. Das hat acht Schreibstellen lahmgelegt und blieb vierzehn Tasks unentdeckt. **Immer über `app/composables/useUserId.ts` (Client) und `server/utils/authUser.ts` (Server) gehen**, nie direkt in die Claims greifen.
- **`serverSupabaseUser` liest nur das Session-Cookie, keinen Bearer-Header.** Ein API-Test mit Bearer-Token prüft still den anonymen Pfad, statt laut zu scheitern. Es gibt einen Cookie-Helfer in `tests/`, den die bestehenden API-Tests nutzen.
- **`serverSupabaseClient(event)` ist asynchron** und muss `await`ed werden; **`serverSupabaseServiceRole(event)` ist synchron** und darf es nicht.
- **Die Views `user_catalog_entries` und `catalog_item_stats` sind `anon` und `authenticated` entzogen.** Nur `service_role` liest sie. Das war Absicht: über einen LEFT JOIN lieferten sie sonst stille Nullen statt einer Fehlermeldung, und die öffentliche Gear-Seite hätte überall „Spieler: 0" gezeigt, ohne dass etwas kaputt aussieht. **Nie neu gewähren.**
- **Nuxt bindet auf `[::1]:3000`, also IPv6.** Eine Prüfung, ob der Port frei ist, muss das mitfangen — und auf deutschem Windows heißt der Zustand in `netstat` **`ABHÖREN`**, nicht `LISTENING`. Ein Filter auf „listening" übersieht den laufenden Server.
- **Drei Tests in `tests/db/demoSeed.test.ts` setzen voraus, dass `yarn seed:users` gelaufen ist.** Sie sagen das inzwischen selbst, wenn sie fehlschlagen — keine Regression suchen, erst den Seed laufen lassen.
- **Der Sprachtest ist ein AST-Scan, keine Stichwortsuche.** Er zerlegt jede `.vue`-Datei und schlägt fehl bei statischen Textknoten, bei literalen `placeholder`/`title`/`aria-label`/`alt` (die müssen gebunden sein: `:placeholder="t.x"`) und bei jeder Datei, die er nicht parsen kann.
- **In `.vue`-Dateien Umlaute als „ae"/„oe"/„ue"/„ss" schreiben**, auch in Kommentaren — der Sprachtest scannt die ganze Datei. In `.ts` und `.sql` sind echte Umlaute in Ordnung (in SQL trotzdem lieber umschreiben). **Ausnahme: sichtbare Texte in `app/locales/de.ts` bekommen echte Umlaute** — sie landen unverändert auf dem Bildschirm. Die Kommentare in derselben Datei sind trotzdem transliteriert.

### Beim Profilumbau dazugekommen

- **Ein HTML-Kommentar im `<template>` kann teuer werden.** Am Wurzelknoten macht er zwei Wurzelknoten, Vue schaltet den Attribute-Fallthrough ab, und ein von außen gesetztes `class` kommt nicht mehr an — `wrapper.classes()` ist im Test leer, ohne jede Fehlermeldung. Im `#item`-Slot von `vuedraggable` ist er ein **Absturz**: „Item slot must have only one child", und zwar erst, sobald die Liste ihr erstes Element bekommt. Erklärende Kommentare gehören ins `<script setup>`. Ein Quelltext-Guard dafür steht in `tests/unit/draggableItemSlot.test.ts`.
- **`yarn add vuedraggable` installiert die Vue-2-Fassung.** `latest` ist 2.24.3; die Vue-3-Variante ist `vuedraggable@4.1.0` vom `next`-Tag. Sie verträgt **kein SSR** — alles, was sie enthält, gehört in `<ClientOnly>`.
- **`grid-cols-[1.1rem_1fr]` bedeutet `minmax(auto,1fr)`**, und dieses `auto` ist die Min-Content-Breite des Inhalts. Ein langer Gerätename schiebt damit die ganze Spalte über ihre Grenze. Für Spalten, die sich klein machen dürfen, `minmax(0,1fr)`.
- **`mt-*` auf einem textlosen Flex-Kind unter `items-baseline` verschiebt nichts.** Flexbox richtet einen Kasten ohne Text an seiner unteren Margin-Kante aus; das `margin-top` treibt nur die Zeilenhöhe hoch (gemessen: 0,00px Wirkung, 2,19px Kosten je Zeile).
- **`$fetch` nimmt im SSR die Cookies des eingehenden Requests nicht mit.** Eine Server-Route hinter `requireUserId()` antwortet dann mit 401, und die Seite zeigt dauerhaft einen Fehlerzustand, ohne dass etwas kaputt ist. In Seiten `useRequestFetch()` benutzen.
- **Nitro braucht ~13 Sekunden zum Neubauen.** Wer eine Gegenprobe an einer Server-Route fährt und sofort testet, prüft den alten Build — die Gegenprobe ist dann wertlos und **grün**. Vor dem Testlauf per direktem HTTP-Aufruf belegen, dass der geänderte Stand wirklich ausgeliefert wird.
- **Zwei gleichzeitige `yarn test`-Läufe zerschießen sich.** `deleteTestUsers()` räumt **jeden** `rigmate-test-*`-Account auf der geteilten Instanz ab, nicht nur die eigenen. `fileParallelism: false` schützt nur innerhalb eines Laufs. Immer nur ein Lauf gleichzeitig.
- **`data-*`-Attribute als Testselektoren** sind seit dem Profilumbau etabliert (`data-cable`, `data-station`, `data-pip`, `data-count`). Über ein Tag zu selektieren zählt jedes künftige Icon mit, über eine Klasse koppelt den Test ans Styling.
- **`gear_items.installed_in_id` ist nicht die Signalkette.** Es heißt „Tonabnehmer ist in Gitarre verbaut" und hängt an einer Ein-Ebenen-Invariante mit eigenem Trigger. Die Kette ist `chain_position`, geschrieben ausschließlich über `set_chain_order()`.
- **Kein eindeutiger Index auf `(owner_id, chain_position)`.** Er würde jedes Umsortieren blockieren, weil der Zwischenzustand ihn verletzt, und `deferrable` geht bei einem partiellen Index nicht.
- **`revoke ... from public` entzieht `anon` nichts.** Supabase vergibt per `alter default privileges` einen **expliziten** Grant an `anon`, den nur ein `revoke ... from anon` entfernt. Vorbild: `supabase/migrations/20260906120155_profiles_fix_round_1.sql`. **Nach so einer Migration die ACL auf der Instanz nachmessen**, nicht annehmen.
- **`set_chain_order()` wirft mit eigenen SQLSTATE-Codes** `RG001`–`RG005` (nicht angemeldet, null, null-Element, Dublette, fremdes Gerät). Die Codes sind die Schnittstelle, die englischen Meldungstexte dürfen sich ändern. Rohe Postgres-Meldungen gehören nie auf den Bildschirm.

### Beim Umstellen auf die Farbtokens dazugekommen

- **In Tailwind v4 ist die Vorgabe für `border` und `divide-y` `currentColor`, nicht Grau.** In v3 war es `gray-200`. Ein farbloses `border` steht hier also in Textfarbe — und funktioniert im Dunkelmodus sogar, sieht aber viel schwerer aus als gedacht. Der Plan hatte die v3-Annahme und leitete daraus eine falsche Ersetzung ab (`border-line-soft`, fast unsichtbar). **Vor jeder Ersetzungstabelle für Rahmen erst nachsehen, was heute wirklich rauskommt.**
- **`TEST_BASE_URL` steht auf `http://localhost:3000`, und Nuxt weicht auf 3001 aus, wenn 3000 belegt ist.** Läuft dort eine andere App, befragt `yarn test:api` still diese. Hier fielen 36 von 38 Tests — sie merken es also, aber die Meldungen führen in die Irre. **Vor dem API-Lauf mit einem HTTP-Aufruf belegen, welche App antwortet**, und notfalls `TEST_BASE_URL=http://localhost:3001 yarn test:api`.
- **Ein Kontrollgrep über eine Handvoll Klassennamen beweist nichts.** Das Muster aus dem Plan (`neutral-|bg-white|text-red-|border-red-`) meldete „sauber", während `text-amber-700`, `text-green-700` und `text-neutral-400` unangetastet dastanden. Über **alle** Tailwind-Farbfamilien scannen, nicht über die, an die man gerade denkt.
- **Ein Farbwert wird erst durch die Utility wahr.** Ein Token, das in `:root` steht, aber im `@theme inline`-Block fehlt, erzeugt keine Klasse — und eine Klasse, die es nicht gibt, fällt wortlos auf den geerbten Wert zurück. Gegenprobe: `curl` auf `/_nuxt/assets/css/main.css` und die Regel suchen. **Achtung, `divide-*` bekommt einen Kindselektor** (`.divide-line-soft > :not(:last-child)`), ein Muster auf `.name {` findet es nicht und meldet fälschlich „fehlt".

## Der wiederkehrende Fehler dieses Projekts

**Ein Fehlschlag, der aussieht, als sei nichts passiert.** Ein verworfenes `{ error }`, eine geschluckte Rejection, ein Leerzustand, der in Wahrheit ein kaputter Request ist. Das ist in achtzehn Tasks **sechsmal** aufgetreten, zuletzt noch im Abschluss-Review auf drei Hauptbildschirmen.

Jede Supabase-Antwort und jedes `$fetch` muss seinen Fehler prüfen, sichtbar machen und **vom legitimen Leerergebnis unterscheidbar** machen. Vorbilder im Code: [app/pages/search.vue](app/pages/search.vue) und [app/pages/profile/[id].vue](app/pages/profile/[id].vue).

**Der Profilumbau hat sieben weitere gefunden**, jeden einzelnen erst durch eine Gegenprobe:

| | |
|---|---|
| `set_chain_order(null)` | tat nichts und meldete nichts |
| doppelte Ids in der Kette | erzeugten kommentarlos eine Lücke in der Nummerierung |
| `revoke ... from public` | behauptete Schutz und lieferte keinen — `anon` durfte weiterhin ausführen |
| `useChainOrder` | drei Wettläufe: „gespeichert" ohne Schreibvorgang, Fehlalarm, zwei gleichzeitige Aufrufe |
| fehlendes `outsideCount` | hätte einen Hinweis **wortlos** verschwinden lassen, mit nichts als einer Konsolenwarnung |
| „Niemand sonst hier spielt das." | eine Behauptung über andere Nutzer, die aus den Daten nicht folgt |
| kein Profil-Link in der Navigation | das eigene Profil war überhaupt nicht erreichbar — **kein Test hätte das gefunden, das kam aus dem Ausprobieren** |

Die Schwester davon: **Tests, die aus dem falschen Grund grün sind.** Ebenfalls sechsmal gefunden — `toBeGreaterThanOrEqual`, wo Genauigkeit gemeint war; ein Vergleich von 0 mit 0 auf leerer Datenbank; Assertions, die einen Schreibvorgang beobachten, ohne die Nutzlast zu lesen; `indexOf(a) < indexOf(b)`, das auch bestand, wenn `a` fehlte. **Bei jedem neuen Test fragen: kann der überhaupt fehlschlagen?** Und im Zweifel: Fix zurücknehmen, Test scheitern sehen, Fix wieder einbauen.

## Was noch aussteht

### Zuerst: der Profilumbau auf `feature/profil-umbau`

> **Wiedereinstieg (Stand 7. September 2026).** Der Branch ist fertig umgesetzt und **nicht gemergt** — bewusst, weil der visuelle Durchgang noch aussteht. In dieser Reihenfolge weitermachen:
>
> 1. `yarn dev`, dann die sieben umgestellten Seiten plus `/gear/<slug>` und `/rig` **je einmal hell und einmal dunkel** ansehen. Dunkel erreichst du über die System-Einstellung oder mit `data-theme="dark"` am `<html>` in den DevTools.
> 2. Die Kontrastfrage zu `--rm-muted` entscheiden (siehe unten). Sie trifft die ganze App, also besser vor dem Merge.
> 3. Danach mergen oder die drei übrigen Punkte unten noch mitnehmen.
>
> **Achtung beim Testen:** `yarn test:api` zeigt fest auf Port 3000. Ist der belegt, weicht Nuxt auf 3001 aus, und die Tests befragen still, was auf 3000 antwortet. Vorher mit einem HTTP-Aufruf belegen, wer da ist — Einzelheiten unter „Fallstricke".

**Alle 20 Tasks sind durch.** `app/` enthält keine fest verdrahtete Palettenfarbe mehr — geprüft über einen Scan aller Tailwind-Farbfamilien, nicht über die vier Muster aus dem Plan (die ließen `amber-*`, `green-700` und `neutral-400` durch). Der Dunkelmodus ist damit durchgängig statt halb, der Branch ist auslieferbar.

Offen ist noch **das Ansehen mit eigenen Augen.** Messbar geprüft sind: alle Utilities existieren im generierten CSS, die beiden Dunkel-Blöcke sind zeichengleich, jedes benutzte Farbpaar hat einen Kontrastwert. Nicht geprüft ist, ob es gut aussieht — dafür braucht es einen Menschen vor `yarn dev`, hell und dunkel.

**Eine Designentscheidung wartet auf Robby:** Im Hellmodus liegt `muted` auf `bg` bei **4,01:1** und damit unter den 4,5:1, die WCAG AA für Fließtext verlangt; `rare` liegt bei 3,80, `special` bei 4,05. Im Dunkelmodus bestehen alle Paare. Das sind Werte aus Task 3, keine Folge der Umstellung — aber `text-muted` reicht seit Task 18/19 deutlich weiter als vorher. Ein etwas dunkleres `--rm-muted` im `:root`-Block würde es lösen und die ganze App treffen. Nachrechnen lässt sich das jederzeit neu; die Formel steht in dieser Datei nicht, die Werte stehen in [app/assets/css/main.css](app/assets/css/main.css).

Entschieden, noch nicht gebaut: **die linke Spalte wird im Bearbeitungsmodus breiter** (~22rem statt 15,5rem), weil Griff und drei Knöpfe ~85 von 248px fressen und die Gerätenamen abgeschnitten werden.

Gemeldet, noch nicht entschieden — Einzelheiten im Plan unter „Offen nach dem ersten Browserlauf":

- `GearPool`-Karten kürzen auch im Normalfall
- Name und Detail teilen sich in `GearList` eine Zeile und brechen um
- **Unbestätigt:** `login.vue` navigiert nach dem Anmelden womöglich nicht weiter. Der Code sieht richtig aus, der Befund stammt aus einer headless-Umgebung — **vor einem Fix reproduzieren**

**Demo-Daten, die dabei verändert wurden:** Halbtakt-Hanno hat auf der geteilten Instanz jetzt eine Signalkette (Strat → DS-1 → TS9) und zwei Profil-Links. Kein Demo-Nutzer hatte vorher beides, und ohne ist die halbe Profilseite nicht anzusehen. `yarn seed:users` räumt die Kette weg, die Links nicht.

### Danach

- **Review der Spec durch Robby** — nach wie vor offen, und der günstigste Zeitpunkt für Kurskorrekturen
- **Pläne für Stufe 2** (Feed, Posts, Kommentare, Likes, Folgen, Freundschaft, DMs, Benachrichtigungen) **und Stufe 3**
- Registrierung mit einem echten Konto über `/register` einmal komplett durchspielen — Mail, Bestätigungslink, Anmelden. Das hat noch **niemand** end-to-end getestet, weil die Automatisierung keine Mails empfangen kann. Achtung: das Projekt hat kein eigenes SMTP, der eingebaute Dienst schickt nur an Adressen von Mitgliedern der Supabase-Organisation und ist auf **2 Mails pro Stunde** begrenzt.
- Offene Punkte aus Abschnitt 14 der Spec: **Hosting des Frontends**, **Reaktionstypen** und **Bild-Limits** (die letzten beiden betreffen erst Stufe 2)
- shadcn-nuxt fehlt weiterhin (Registry war beim Aufsetzen nicht erreichbar). Die fluiden Tailwind-Klassen in [app/assets/css/main.css](app/assets/css/main.css) sind da, die Farbtokens nicht.

### Zurückgestellt für den Produktivbetrieb (zu Abschnitt 15)

Beim Bauen dazugekommen, alles bewusst offen gelassen:

- **Kombinationsbonus deckeln und feiner justieren.** Er ist bei 8 geteilten Geräten gedeckelt, aber die Confidence-Mischung schneidet bei 200 Nutzern hart um und hängt an der Gesamtnutzerzahl statt an den Besitzern je Eintrag.
- `normalize_brand_name` faltet Diakritika über eine feste Latin-1-Tabelle — bei nordischen oder slawischen Zeichen läuft sie vom JS-Vorbild weg.
- Aus der öffentlichen Gear-Seite lässt sich die Gesamtzahl der registrierten Nutzer zurückrechnen.
- Avatar-Upload ist ungetestet (der Test-Stub bildet Storage nicht nach).
- Leaked-Password-Schutz in Supabase ist aus.
- **Im Katalog fehlen Basssaiten** — beide Demo-Bassisten teilen sich den einzigen eindeutigen Satz.
- Katalog-Backoffice (Abschnitt 15 nennt es schon), Passwort-Reset, Passwort ändern.

Aus dem Profilumbau dazugekommen:

- **Rig-Ereignisse gruppieren nach UTC-Tag.** Wer abends um halb zwölf ein Pedal einträgt, sieht es im Feed unter dem Folgetag. Bewusst so: die Datenbank hat kein Zeitzonenfeld, „lokale Zeit" wäre also gar nicht eindeutig definiert.
- **`chain_position` ist per RLS auch direkt beschreibbar.** Die Policy „users manage their own gear" erlaubt weiterhin ein schlichtes `update gear_items set chain_position = 1`; geschlossen hält die Positionen allein `set_chain_order()`. Für den Prototyp in Ordnung, weil nur unsere eigene Oberfläche schreibt.
- **Die Signalkette ist auf einem echten Handy nie erprobt worden.** Gebaut ist sie dafür (Ziehen entfällt, „Anhängen" und die Pfeile tragen die Bedienung), gesehen wurde es nur in einem schmalen Browserfenster.

## Arbeitsweise

- Auf Deutsch, locker im Ton.
- **Oberflächensprache:** Bezeichner, Tabellen, Spalten, Dateinamen und Routen englisch, sichtbare Texte deutsch über `app/locales/de.ts`. **Kommentare deutsch.**
- Vor Umsetzung erst Konzept klären — dieses Projekt ist aus einem Brainstorming entstanden und lebt davon, dass Entscheidungen begründet sind.
- Was bewusst **nicht** gebaut wird: Marktplatz, Ortsdaten, eigenes Audio- und Video-Hosting. Gründe in Abschnitt 2 der Spec.
- Datenschutz und Moderation laufen im Prototyp bewusst auf Sparflamme. Die zurückgestellten Punkte stehen in Abschnitt 15 und oben — nichts davon stillschweigend übergehen.
