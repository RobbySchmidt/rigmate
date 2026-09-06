# Rigmate

Soziales Netzwerk für Gitarristen, bei dem **das Equipment den sozialen Graphen bildet**. Nicht „Facebook für Musiker", sondern näher an Letterboxd: ein strukturierter Gear-Katalog als Rückgrat, an dem das Soziale hochwächst. Man findet Menschen über ihr Equipment — gewichtet nach Seltenheit, damit nicht jeder mit einem Standard-Pedal jedem vorgeschlagen wird.

**Aktueller Stand: Prototyp, noch kein Code geschrieben.** Das Konzept ist durchgesprochen und festgehalten.

## Zuerst lesen

> **[docs/superpowers/specs/2026-09-06-rigmate-design.md](docs/superpowers/specs/2026-09-06-rigmate-design.md)**

Das ist die **Quelle der Wahrheit** für alles Inhaltliche: Datenmodell, Empfehlungslogik, Beziehungen, Feed, Sichtbarkeit, Ausbaustufen. Der Anhang listet jede Entscheidung mit Begründung — **vor dem Ändern einer Designentscheidung dort nachsehen, warum sie so getroffen wurde.** Vieles wirkt beliebig und ist es nicht.

Die Spec entstand in einem Brainstorming und wartet noch auf das Review durch Robby. Sie ist noch nicht in einen Implementierungsplan überführt.

## Stack

Nuxt 4 (SSR) · Supabase (Postgres, Auth, Storage, Realtime) über `@nuxtjs/supabase` · Tailwind v4 · yarn

Directus wurde bewusst **nicht** genommen — Begründung in Abschnitt 12 der Spec.

## Architekturregeln

- **Logik gehört in Nuxt-Server-Routen**, nicht in den Client. Feed-Zusammenstellung, Empfehlungen und der Checker brauchen Aggregation über alle Nutzer — das rechnet der Browser nicht.
- Einfaches Lesen und Schreiben (Profil, Rig, Post anlegen) darf direkt vom Client gegen Supabase laufen, abgesichert über RLS.
- **RLS ist Pflicht.** Ohne aktivierte Policies ist bei Supabase alles offen.
- **Schema ist Code.** Alle Änderungen als versionierte Migrationen unter `supabase/migrations/`, niemals von Hand im Dashboard oder per MCP — sonst driftet die Datenbank vom Repo weg und der zweite Rechner hat einen anderen Stand.
- `service_role` key bleibt **serverseitig**. Er umgeht RLS komplett und darf nie ins Frontend-Bundle.
- In [nuxt.config.ts](nuxt.config.ts) steht `supabase.redirect: false` mit Absicht — das Modul würde sonst jeden Nicht-Angemeldeten auf `/login` schicken, aber Gear-Seiten sollen laut Spec öffentlich sein.

## Setup

`.env` (Vorlage: `.env.example`) — `SUPABASE_URL`, `SUPABASE_KEY` (anon), `SUPABASE_SERVICE_ROLE_KEY` (nur für Seeding).
`.mcp.json` (Vorlage: `.mcp.json.example`) — Supabase-MCP, lesend, auf das Projekt beschränkt. Der `SUPABASE_ACCESS_TOKEN` ist ein **Personal Access Token** aus den Account-Einstellungen, nicht einer der Projekt-Keys.

Beide Dateien sind gitignored. **Keys nie in den Chat kopieren** — sie landen sonst im Verlauf; direkt in die Dateien eintragen.

Supabase-Projekt: `rigmate`, Region `eu-west-1`. Lokales Supabase über Docker nutzen wir bewusst nicht — die Instanz ist gehostet, damit beide Rechner am selben Stand arbeiten.

Auth: E-Mail/Passwort, **Mail-Bestätigung ist verpflichtend**. Demo-Nutzer deshalb über die Admin-API mit dem `service_role` key anlegen, statt die Bestätigung projektweit abzuschalten.

## Was noch aussteht

- Review der Spec durch Robby
- Implementierungsplan (die Spec ist noch keiner)
- Supabase-CLI als Dev-Dependency, `supabase init` und `link`
- Offene Punkte siehe Abschnitt 14 der Spec — darunter die **Oberflächensprache (Deutsch oder Englisch)**, die noch nicht entschieden ist
- shadcn-nuxt fehlt noch (Registry war beim Aufsetzen nicht erreichbar). Die fluiden Tailwind-Klassen in [app/assets/css/main.css](app/assets/css/main.css) sind schon da, die shadcn-Farbtokens noch nicht.

## Arbeitsweise

- Auf Deutsch, locker im Ton.
- Vor Umsetzung erst Konzept klären — dieses Projekt ist aus einem Brainstorming entstanden und lebt davon, dass Entscheidungen begründet sind.
- Was bewusst **nicht** gebaut wird: Marktplatz, Ortsdaten, eigenes Audio- und Video-Hosting. Gründe in Abschnitt 2 der Spec.
- Datenschutz und Moderation laufen im Prototyp bewusst auf Sparflamme. Die zurückgestellten Punkte stehen gesammelt in Abschnitt 15 und sind vor jedem Produktivbetrieb abzuarbeiten — nichts davon stillschweigend übergehen.
