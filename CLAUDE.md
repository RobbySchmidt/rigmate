# Rigmate

Soziales Netzwerk für Gitarristen, bei dem **das Equipment den sozialen Graphen bildet**. Nicht „Facebook für Musiker", sondern näher an Letterboxd: ein strukturierter Gear-Katalog als Rückgrat, an dem das Soziale hochwächst. Man findet Menschen über ihr Equipment — gewichtet nach Seltenheit, damit nicht jeder mit einem Standard-Pedal jedem vorgeschlagen wird.

**Aktueller Stand: Ausbaustufe 1 ist gebaut und auf `main` gemergt.** 36 Commits, 9 Migrationen, 259 Unit- und Komponententests plus 33 API-Tests, alle grün. Der Gear-Graph funktioniert nachweislich: wer eine Rarität teilt, steht mit Faktor 3–5 über dem, der ein Allerweltspedal teilt.

## Zuerst lesen

> **[docs/superpowers/specs/2026-09-06-rigmate-design.md](docs/superpowers/specs/2026-09-06-rigmate-design.md)**

Das ist die **Quelle der Wahrheit** für alles Inhaltliche: Datenmodell, Empfehlungslogik, Beziehungen, Feed, Sichtbarkeit, Ausbaustufen. Der Anhang listet jede Entscheidung mit Begründung — **vor dem Ändern einer Designentscheidung dort nachsehen, warum sie so getroffen wurde.** Vieles wirkt beliebig und ist es nicht.

**Die Spec wartet weiterhin auf das Review durch Robby.** Sie war beim Bauen bindend; wo der Implementierungsplan ihr widersprach, hat die Spec gewonnen.

> **[docs/superpowers/plans/2026-09-06-rigmate-stufe-1.md](docs/superpowers/plans/2026-09-06-rigmate-stufe-1.md)**

Der Plan für Stufe 1, vollständig abgearbeitet. Sein Abschnitt „Was dieser Plan über die Spec hinaus festlegt" listet die Entscheidungen, die beim Planen dazukamen. **Achtung: der Plan ist an mehreren Stellen überholt** — während der Umsetzung wurden Fehler darin gefunden und gegen ihn entschieden. Im Zweifel gilt der Code, nicht der Plan. Stufe 2 und 3 haben noch keine Pläne.

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
| `yarn test` | Unit-, Komponenten- und DB-Tests (259) |
| `yarn test:api` | API-Tests (33) — **braucht einen laufenden `yarn dev`** |
| `yarn db:new <name>` | neue Migration anlegen |
| `yarn db:push` | Migrationen auf die Instanz anwenden |
| `yarn seed:catalog` | Katalog einspielen, idempotent |
| `yarn seed:catalog --prune` | zusätzlich Einträge löschen, die nicht mehr in den Seed-Daten stehen |
| `yarn seed:users` | 20 Demo-Musiker anlegen, idempotent |

**Demo-Login zum Ausprobieren:** `demo-halbtakt-hanno@rigmate.invalid`, Passwort steht in [scripts/seed-users.ts](scripts/seed-users.ts). Nach dem Anmelden zeigt `/` echte Vorschläge mit Begründung.

## Architekturregeln

- **Logik gehört in Nuxt-Server-Routen**, nicht in den Client. Empfehlungen, Checker und die öffentliche Gear-Seite aggregieren über alle Nutzer — das rechnet der Browser nicht.
- Einfaches Lesen und Schreiben (Profil, Rig) darf direkt vom Client gegen Supabase laufen, abgesichert über RLS.
- **RLS ist Pflicht.** Ohne aktivierte Policies ist bei Supabase alles offen.
- **Schema ist Code.** Alle Änderungen als versionierte Migrationen unter `supabase/migrations/`, niemals von Hand im Dashboard oder per MCP. Stand: 9 Migrationen, lokal und auf der Instanz synchron.
- `service_role` key bleibt **serverseitig** — `server/`, `scripts/`, `tests/`, nie in `app/`. Nach jedem Build prüfen: `yarn build && grep -r "service_role" .output/public/` muss leer bleiben.
- In [nuxt.config.ts](nuxt.config.ts) steht `supabase.redirect: false` mit Absicht — sonst würde jeder Nicht-Angemeldete auf `/login` geschickt, aber Gear-Seiten sollen laut Abschnitt 10 öffentlich sein. Der Schutz läuft stattdessen per Seite über `app/middleware/auth.ts`.
- **Gemeinsame Regeln liegen unter `shared/utils/`** und dürfen nicht kopiert werden: `modelYearRule.ts` (kein Baujahr im Modellnamen), `rarityBase.ts`, `suggestionReason.ts`. Jede dieser Dateien entstand, weil eine Regel vorher zwei- bis viermal existierte und auseinanderlief.

## Fallstricke, die uns beim Bauen Zeit gekostet haben

Das ist die wertvollste Liste in dieser Datei. Jeder Punkt hat mindestens einen echten Fehler verursacht.

- **`@nuxtjs/supabase` 2.0.10 liefert JWT-Claims, keine User-Objekte** — also `sub`, nie `.id`, und zwar aus `serverSupabaseUser` **und** `useSupabaseUser`. Das hat acht Schreibstellen lahmgelegt und blieb vierzehn Tasks unentdeckt. **Immer über `app/composables/useUserId.ts` (Client) und `server/utils/authUser.ts` (Server) gehen**, nie direkt in die Claims greifen.
- **`serverSupabaseUser` liest nur das Session-Cookie, keinen Bearer-Header.** Ein API-Test mit Bearer-Token prüft still den anonymen Pfad, statt laut zu scheitern. Es gibt einen Cookie-Helfer in `tests/`, den die bestehenden API-Tests nutzen.
- **`serverSupabaseClient(event)` ist asynchron** und muss `await`ed werden; **`serverSupabaseServiceRole(event)` ist synchron** und darf es nicht.
- **Die Views `user_catalog_entries` und `catalog_item_stats` sind `anon` und `authenticated` entzogen.** Nur `service_role` liest sie. Das war Absicht: über einen LEFT JOIN lieferten sie sonst stille Nullen statt einer Fehlermeldung, und die öffentliche Gear-Seite hätte überall „Spieler: 0" gezeigt, ohne dass etwas kaputt aussieht. **Nie neu gewähren.**
- **Nuxt bindet auf `[::1]:3000`, also IPv6.** Eine Prüfung, ob der Port frei ist, muss das mitfangen — und auf deutschem Windows heißt der Zustand in `netstat` **`ABHÖREN`**, nicht `LISTENING`. Ein Filter auf „listening" übersieht den laufenden Server.
- **Drei Tests in `tests/db/demoSeed.test.ts` setzen voraus, dass `yarn seed:users` gelaufen ist.** Sie sagen das inzwischen selbst, wenn sie fehlschlagen — keine Regression suchen, erst den Seed laufen lassen.
- **Der Sprachtest ist ein AST-Scan, keine Stichwortsuche.** Er zerlegt jede `.vue`-Datei und schlägt fehl bei statischen Textknoten, bei literalen `placeholder`/`title`/`aria-label`/`alt` (die müssen gebunden sein: `:placeholder="t.x"`) und bei jeder Datei, die er nicht parsen kann.
- **In `.vue`-Dateien Umlaute als „ae"/„oe"/„ue"/„ss" schreiben**, auch in Kommentaren — der Sprachtest scannt die ganze Datei. In `.ts` und `.sql` sind echte Umlaute in Ordnung (in SQL trotzdem lieber umschreiben).

## Der wiederkehrende Fehler dieses Projekts

**Ein Fehlschlag, der aussieht, als sei nichts passiert.** Ein verworfenes `{ error }`, eine geschluckte Rejection, ein Leerzustand, der in Wahrheit ein kaputter Request ist. Das ist in achtzehn Tasks **sechsmal** aufgetreten, zuletzt noch im Abschluss-Review auf drei Hauptbildschirmen.

Jede Supabase-Antwort und jedes `$fetch` muss seinen Fehler prüfen, sichtbar machen und **vom legitimen Leerergebnis unterscheidbar** machen. Vorbilder im Code: [app/pages/search.vue](app/pages/search.vue) und [app/pages/profile/[id].vue](app/pages/profile/[id].vue).

Die Schwester davon: **Tests, die aus dem falschen Grund grün sind.** Ebenfalls sechsmal gefunden — `toBeGreaterThanOrEqual`, wo Genauigkeit gemeint war; ein Vergleich von 0 mit 0 auf leerer Datenbank; Assertions, die einen Schreibvorgang beobachten, ohne die Nutzlast zu lesen; `indexOf(a) < indexOf(b)`, das auch bestand, wenn `a` fehlte. **Bei jedem neuen Test fragen: kann der überhaupt fehlschlagen?** Und im Zweifel: Fix zurücknehmen, Test scheitern sehen, Fix wieder einbauen.

## Was noch aussteht

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

## Arbeitsweise

- Auf Deutsch, locker im Ton.
- **Oberflächensprache:** Bezeichner, Tabellen, Spalten, Dateinamen und Routen englisch, sichtbare Texte deutsch über `app/locales/de.ts`. **Kommentare deutsch.**
- Vor Umsetzung erst Konzept klären — dieses Projekt ist aus einem Brainstorming entstanden und lebt davon, dass Entscheidungen begründet sind.
- Was bewusst **nicht** gebaut wird: Marktplatz, Ortsdaten, eigenes Audio- und Video-Hosting. Gründe in Abschnitt 2 der Spec.
- Datenschutz und Moderation laufen im Prototyp bewusst auf Sparflamme. Die zurückgestellten Punkte stehen in Abschnitt 15 und oben — nichts davon stillschweigend übergehen.
