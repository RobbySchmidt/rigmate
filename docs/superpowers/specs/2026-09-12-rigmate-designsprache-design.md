# Rigmate — Designsprache: nur Dunkelmodus

**Stand:** 2026-09-12 · **Status:** wartet auf Review durch Robby

Diese Spec **ersetzt Abschnitt 3 der [Profil-Spec](2026-09-07-rigmate-profil-design.md) vollständig** —
Farbe, Schrift und alles, was dort über die Designsprache steht. Der Rest der Profil-Spec bleibt gültig:
der Aufbau der Profilseite (Abschnitt 4), die Signalkette (5–7) und die Demo-Daten-Befunde (8) sind davon
nicht berührt.

Sie ergänzt die [Hauptspec](2026-09-06-rigmate-design.md) und widerspricht ihr nicht.

---

## 1. Warum

Robbys Befund, wörtlich: *„Alles wirkt eben wie ein Wireframe-Prototyp mit bisschen Style. Einfach ein
ordentliches Design wäre cool."* Und als Richtung: *„das elegante und saubere. Aber es ist nicht so steril
wie z.B. Apple, was ja ähnlich ist."*

Der Befund trifft zu, und er ist messbar. Der Bestand, gezählt über alle 24 `.vue`-Dateien:

| | |
|---|---|
| **62 Radius-Utilities**, davon 56 mit **demselben Wert** | 44× blankes `rounded` und 12× `rounded-sm` — in Tailwind 4.3.3 sind beide `0.25rem`, also 4px. Dazu 6× `rounded-full`. Es gibt keine Staffel und keinen Rollenbezug: ein Eingabefeld, eine Karte und eine Schaltfläche haben dieselbe Ecke. |
| **62 Rahmen in Linienfarbe** | 45× `border-line`, 9× `border-line-soft`, 8× `divide-line-soft`, verteilt über 19 Dateien. Jede Fläche ist ein umrandeter Kasten. |
| **Fünf Dateien ohne jeden Radius** | `app.vue`, `layouts/default.vue`, `components/GearList.vue`, `components/Icon.vue`, `pages/profile/[id].vue` — darunter die Navigationsleiste und die gerade umgebaute Profilseite. |

Das ist die Wireframe-Anmutung in Zahlen: **ein winziger Radius überall, und jede Trennung durch eine
Linie statt durch eine Fläche.**

### 1.1 Die Referenz

Robby hat [dayos.com](https://styles.refero.design/style/ee403055-480e-4bd4-9216-07c9ae2dde2e) geschickt —
brutalistisch-editorial auf warmem Grau. Was daran trägt, ist nicht der Hero und nicht das 3D-Render,
sondern das System darunter. Die Trennung, die diese Spec vornimmt:

**Übernommen:**

- **Keine Rahmen auf Flächen.** Das Don't der Referenz lautet wörtlich *„never use subtle gray borders on
  cards"*. Tiefe kommt aus Flächenkontrast.
- **Keine Schatten.** Die Referenz ist ausdrücklich flach; Tiefe ist Flächenfarbe, nicht Elevation.
- **Radien deutlich größer und gestaffelt**, mit Rollenbezug statt einem Wert für alles.
- **Typografische Spannung** aus kondensierter Display-Schrift gegen kleinen Fließtext. Bei Dayos macht
  das die ganze gestalterische Arbeit — ohne ein einziges Bild. Das ist genau unsere Lage.

**Nicht übernommen, mit Grund:**

- **Der 130px-Hero.** Rigmate hat keine Landingpage. Die Display-Stimme arbeitet an Profilnamen und
  Seitentiteln, also bei 38–40px.
- **Die 3D-Render.** Rigmate hat strukturell fast keine Bilder: der Avatar ist eine eingefärbte Fläche mit
  Initialen, `catalog_items.image_path` ist nirgends gefüllt, der Feed besteht aus Textzeilen.
- **Mint `#d1ffca` und Gelb `#fff100` als freie Akzente.** Sie sitzen bei Dayos auf Tag-Pillen und kleinen
  Markern — also genau dort, wo bei Rigmate **Bernstein** sitzt. Bernstein gehört ausschließlich der
  Seltenheit; ein zweiter heller Akzent an derselben Stelle macht die Auszeichnung unlesbar.
- **Das reine Hellthema.** Siehe 3.1 — wir gehen in die andere Richtung.

---

## 2. Umfang

**Im Umfang: die ganze Oberfläche.** Die Profil-Spec hatte Startseite, Suche, Gear-Seiten,
Rig-Bearbeitung, Einstellungen und Login ausdrücklich ausgeklammert, damit nichts doppelt entsteht. Diese
Ausklammerung entfällt: Robbys Entscheidung („das kann auch das einzige Design sein") macht die
Designsprache zur einzigen, und eine Token-Umstellung trifft jede Datei ohnehin.

Also alle **24 `.vue`-Dateien** — 10 Seiten, 12 Komponenten, das Layout und `app.vue` — plus
`app/assets/css/main.css` und die Schriftabfrage in `nuxt.config.ts`.

**Zwei Altlasten fallen in denselben Anlauf**, weil sie ohne einen Menschen vor `yarn dev` nicht zu
erledigen sind und dieser Umbau genau den braucht:

- Der vollständige visuelle Durchgang, der seit dem Profilumbau aussteht.
- Die gruppierte `/rig`-Seite aus der Katalogerweiterung, die **noch niemand im Browser gesehen hat** —
  Task 6 dort war nur per curl verifiziert.

**Nicht im Umfang, bewusst:**

- **Kein Hellmodus.** Siehe 3.1.
- **Keine Bilder, kein Storage, kein Datenmodell.** Diese Spec ändert ausschließlich Darstellung. Wenn
  Rigmate je Gerätefotos bekommt, ist das eine eigene Entscheidung mit eigener Spec.
- **Keine neue Komponentenbibliothek.** shadcn-nuxt fehlt weiterhin und bleibt außen vor; diese Spec
  beschreibt Tokens und Regeln, keine Fremdkomponenten.
- **Kein Umbau des Profilaufbaus.** Abschnitt 4 der Profil-Spec bleibt in Kraft, einschließlich der
  Zweispaltigkeit — siehe die Entscheidung in 3.6.
- **Keine neuen Feed-Ereignisarten.** Der dünne Feed ist ein Inhaltsproblem von Stufe 1, kein
  Gestaltungsproblem.

---

## 3. Die Designsprache

### 3.1 Ein Thema, kein Umschalter

**Rigmate hat nur einen Dunkelmodus.** Kein Hellthema, keine Systemabfrage, kein Umschalter.

Das ist eine Vereinfachung mit drei konkreten Folgen:

1. **Die dreifache Token-Regel entfällt.** Aus `:root` + `@media (prefers-color-scheme: dark)` +
   `[data-theme="dark"]` wird **ein** `:root`-Block mit `color-scheme: dark`. Der Fallstrick, dass ein
   Token nur in einem der beiden Dunkel-Blöcke steht und im un-gestempelten Zustand die Textfarbe des
   einen Themes auf den Grund des anderen legt, ist damit nicht umgangen, sondern abgeschafft.
2. **Die offenen Kontrastfragen sind erledigt.** Die 4,01:1 bei `--rm-muted` und die 3,80:1 bei `rare`
   waren Hellmodus-Werte. Im Dunkeln liegt jedes Textpaar über 5,5:1 (Tabelle in 3.2). Die Entscheidung,
   die auf Robby gewartet hat, steht nicht mehr an.
3. **Kein Test hängt daran.** `prefers-color-scheme`, `data-theme` und `color-scheme` kommen in `app/` nur
   in `main.css` vor, sonst nur in zwei Dokumenten. Zu korrigieren sind die Dokumente, nicht der Code.

**Der bekannte Einwand, damit er dokumentiert ist:** Nur-Dunkel ignoriert die Systemeinstellung, und helle
Schrift auf dunklem Grund ist für Menschen mit Astigmatismus schlechter lesbar — bei einem
Gitarristen-Publikum keine Randgruppe. Das ist gegen die Einfachheit abgewogen und bewusst entschieden
(Anhang A1).

**Die Tür bleibt unverschlossen.** Die Tokens behalten Namen und Rollen; ein Hellthema wäre später ein
einzelner `@media`-Block mit gedoppelten Werten. Es ist nicht gebaut, aber auch nicht zugemauert.

### 3.2 Farbe

Zwölf Tokens, ein Block. Die Kontrastwerte sind gegen `--rm-surface` gerechnet, weil dort der meiste Text
steht.

| Token | Wert | Rolle | Kontrast |
|---|---|---|---|
| `--rm-bg` | `#0e1113` | Seitengrund | — |
| `--rm-surface` | `#23282b` | Karten, Panel, Profilkopf | 1,27:1 gegen `bg` |
| `--rm-surface-2` | `#30373a` | abgesetzte Flächen, Eingabefelder, inaktive Reiter | 1,23:1 gegen `surface` |
| `--rm-line` | `#3c4447` | **nur innere** Trennlinien | 1,50:1 gegen `surface` |
| `--rm-ink` | `#eae7e0` | Text | 12,1:1 |
| `--rm-muted` | `#9aa1a4` | Nebentext, Labels, Zeitangaben | 5,7:1 |
| `--rm-accent` | `#5cb8be` | Marke, alles Interaktive | 6,4:1 |
| `--rm-accent-ink` | `#0a1416` | Text auf Akzentflächen | 8,1:1 gegen `accent` |
| `--rm-accent-wash` | `#183034` | Akzent als Fläche (Avatar, aktiver Reiter, Hinweiskasten) | — |
| `--rm-rare` | `#e3a862` | **nur** `rarity_base = 'rare'` | 7,1:1 |
| `--rm-rare-wash` | `#2e2313` | Fläche hinter einem Seltenheitshinweis | — |
| `--rm-special` | `#bd9d6b` | **nur** `rarity_base = 'special'` | 5,8:1 |
| `--rm-danger` | `#e0897a` | Fehler und Zerstörendes | 5,7:1 |

**`--rm-line-soft` entfällt.** Zwei Linienstärken waren ein Erbe des Hellmodus, wo eine Haarlinie auf
hellem Grund kaum trägt. Im Dunkeln gibt es genau eine Linie, und die steht nur noch an wenigen Stellen
(3.3).

**Zwei Akzente mit strikt getrennten Rollen bleiben der Kern**, unverändert gegenüber der Profil-Spec:
Petrol führt durch die Oberfläche, **Bernstein gehört ausschließlich der Seltenheit.** Sie ist die
Mechanik, über die Menschen einander finden (Abschnitt 5 der Hauptspec), keine Verzierung. Wer Bernstein
woanders benutzt, macht die Auszeichnung unlesbar. Für Fehler gibt es `--rm-danger`.

**Nur zwei der vier Seltenheitsstufen werden ausgezeichnet.** `mass` und `common` bleiben still. Würden
alle vier leuchten, sagt die Auszeichnung nichts mehr.

**Die Werte sind gerechnet, nicht geschätzt — und müssen bei der Umsetzung nachgemessen werden.** Die
Tabelle oben entstand per Hand aus der WCAG-Formel; sie ist auf etwa eine Nachkommastelle genau. Die
Umsetzung belegt jedes benutzte Paar mit einem gerechneten Wert, wie es Task 3 des Profilumbaus schon
getan hat.

### 3.3 Fläche und Tiefe

**Das ist der eigentliche Hebel dieser Spec.** Tiefe entsteht aus Flächenkontrast, nicht aus Rahmen und
nicht aus Schatten.

#### Die Flächenleiter

Drei Ebenen, in festen Schritten:

```
--rm-bg        #0e1113    Grund
                 ↕ 1,27:1
--rm-surface   #23282b    Karte, Panel
                 ↕ 1,23:1
--rm-surface-2 #30373a    abgesetzte Fläche, Eingabefeld
```

**Warum die Leiter gegenüber der Profil-Spec gespreizt wird:** Dunkle Themes verlieren Flächenkontrast,
weil in den unteren Helligkeiten wenig Luft ist. Dieselben Rollen im Hellmodus lagen bei 1,27:1
(`#e9e7e1` gegen `#faf9f6`); die bisherigen Dunkelwerte (`#131617` gegen `#1d2123`) kommen auf **1,11:1**.
Solange es Rahmen gab, fiel das nicht auf. Ohne Rahmen ist diese Stufe die **einzige** Tiefenquelle der
App — sie muss sitzen. Der Grund geht deshalb tiefer und die Karte höher, bis der Schritt wieder bei
1,27:1 liegt.

#### Die Rahmen-Regel

> **Ein Rahmen nur dort, wo keine Flächenstufe ist.**

Äußere Rahmen fallen überall weg, wo eine Fläche gegen eine andere steht — das erledigt die Leiter.
`--rm-line` überlebt ausschließlich als **innere** Trennlinie innerhalb einer Fläche, wo es keinen
Flächenwechsel gibt:

- zwischen den Kategoriegruppen im Equipment-Panel
- unter einem Abschnittskopf innerhalb einer Karte
- zwischen den Gruppen einer Liste, wo die Gruppierung selbst eine Aussage ist

**Die Regel entscheidet nicht jede Stelle vorab — sie verteilt die Beweislast: im Zweifel fällt die Linie
weg.** Wer eine behalten will, muss sagen, welche Trennung sie leistet, die keine Fläche leisten kann. Die
acht heutigen `divide-line-soft` trennen *jede* Zeile einer Liste; das ist keine Aussage über Gruppen,
sondern eine Tabellenoptik, und fällt damit unter die Regel.

**Nicht betroffen und bleiben:** `border-accent` (5×, Fokus und Hover), `border-rare` und `border-special`
(Seltenheitspunkte und Kabelknoten aus `shared/utils/rarityStyle.ts`), `border-current` (4×) und
`border-transparent` (5×, Platzhalter gegen Sprünge beim Hover). Diese Rahmen sind kein Kasten, sondern
Zustand oder Auszeichnung.

**Kein einziger Schatten.** Wenn eine Fläche hervortreten soll, geht sie eine Ebene höher. Die Referenz
ist darin ausdrücklich, und für Rigmate kommt ein zweiter Grund dazu: die einzige Hierarchie, die auf
dieser Oberfläche etwas bedeuten soll, ist die Seltenheit.

#### Der Tailwind-v4-Fallstrick

`border` ohne Farbe ist in Tailwind v4 **`currentColor`**, nicht Grau — in v3 war es `gray-200`. Ein
farbloses `border` steht hier also in Textfarbe. Vor jeder Ersetzung ist deshalb zu prüfen, was an der
Stelle heute wirklich herauskommt, statt eine Ersetzungstabelle aus der v3-Annahme abzuleiten. Derselbe
Fehler hat beim Profilumbau schon einmal zu einer falschen Ersetzung geführt.

### 3.4 Form

Vier Radien mit Rollenbezug, als Tokens:

| Token | Wert | Rolle |
|---|---|---|
| `--radius-card` | `16px` | Panel, Karte, Feed-Eintrag, Profilkopf, Hinweiskasten, Bildschirmmeldung |
| `--radius-field` | `10px` | Eingabefelder, Auswahllisten, Textfelder, Vorschlagslisten |
| `--radius-btn` | `8px` | Schaltflächen |
| `--radius-chip` | `9999px` | Pillen, Reiter, Avatar, Seltenheitspunkte, Kabelknoten |

**Die Staffel ist die Aussage, nicht der Einzelwert.** Dass Karte, Feld und Schaltfläche
unterschiedliche Ecken haben, sagt dem Auge, dass es drei verschiedene Arten von Ding sind. Heute haben
sie alle 4px, und genau das liest sich als Wireframe.

**Die Tokens gehören in `@theme inline`**, nicht nur in `:root`. Ein Wert, der nur in `:root` steht,
erzeugt keine Utility — und eine Klasse, die es nicht gibt, fällt wortlos auf den geerbten Wert zurück.
Das ist der teuerste Fehler aus der Farbtoken-Umstellung und darf sich nicht wiederholen.

**Blankes `rounded` und `rounded-sm` verschwinden vollständig.** Beide sind in Tailwind 4.3.3 `0.25rem`;
zwei Schreibweisen für einen Wert sind eine Einladung zum Auseinanderlaufen. Jede der 56 Stellen bekommt
eine der vier Rollen.

### 3.5 Schrift

Die Familien bleiben, wie sie sind — **kein neuer Font.**

| Rolle | Familie | Verwendung |
|---|---|---|
| Display | **Archivo**, Breite **88**, Gewicht 600 | Überschriften, Profilnamen, Gerätebezeichnungen, Kennzahlen, Schaltflächen |
| Text | **IBM Plex Sans** 400/500/600 | Fließtext, Bio, Beiträge |
| Daten | **IBM Plex Mono** 400/500 | Baujahr, Finish, Zähler, Versal-Labels, Zeitangaben |

**Das Neue ist die Breitenachse.** Archivo ist ein Variable Font mit `wdth` 62–125; geladen wird bisher
nur eine Breite. Die Schriftabfrage wird zu:

```
family=Archivo:wdth,wght@62..125,400..700
```

**Breite 88 ist eine Verengung um 12 Prozent.** An einem kurzen Wort kaum zu sehen, an einem Namen oder
einer Überschrift deutlich. Das ist die editoriale Stimme der Referenz, dosiert: wir haben keinen Hero,
an dem 130px Sinn hätten, sondern Profilnamen bei 38px.

**Versalien bleiben den Mono-Labels vorbehalten.** Namen und Überschriften bleiben gemischt. Die Referenz
setzt alles versal; das trägt auf einer Marketing-Seite mit sechs Überschriften und scheitert auf einem
Profil, wo der Name eines Menschen steht.

**Die Display-Rolle ist Familie plus Breite plus Laufweite zusammen** und wird an **einer** Stelle
definiert, nicht an jeder Aufrufstelle. Heute wiederholt sich `font-display ... font-semibold
tracking-...` in sechs Komponenten; das ist dieselbe Art Duplikat, die zu `shared/utils/rarityStyle.ts`
geführt hat. Wie das technisch gelöst wird — eine eigene Utility in `main.css` oder etwas anderes —
entscheidet der Umsetzungsplan.

Alle Zahlenkolonnen behalten `font-variant-numeric: tabular-nums`.

### 3.6 Der Profilaufbau bleibt zweispaltig

Die Zweispaltigkeit aus Abschnitt 4 der Profil-Spec bleibt, obwohl die rechte Feed-Spalte heute dünn ist:
Stufe 1 kennt als Ereignis nur „Gerät ins Rig geholt", und mehr Inhalt gibt es nicht.

**Das ist ein Inhaltsproblem, kein Gestaltungsproblem.** Die Spalte füllt sich mit Stufe 2 von selbst, und
wir entwerfen die Seite nicht zweimal — dasselbe Argument, mit dem „Folgen" und „Nachricht" schon jetzt
deaktiviert dastehen, statt später eingeblendet zu werden.

**Die schon entschiedene Verbreiterung im Bearbeitungsmodus bleibt gültig:** die linke Spalte wächst dort
auf ~22rem statt 15,5rem, weil Griff und drei Knöpfe rund 85 von 248 Pixeln fressen und die Gerätenamen
sonst abgeschnitten werden.

---

## 4. Was diese Spec in anderen Dokumenten ändert

Diese Änderungen gehören zur Umsetzung, nicht in einen späteren Aufräum-Task. Ein Dokument, das eine
abgeschaffte Regel behauptet, ist schlimmer als kein Dokument.

| Dokument | Was zu ändern ist |
|---|---|
| [Profil-Spec](2026-09-07-rigmate-profil-design.md), Abschnitt 3 | Vollständig durch einen Verweis auf diese Spec ersetzt. Der Anhang dort behält seine Begründungen, bekommt aber einen Nachtrag, wo diese Spec ihn überholt. |
| `CLAUDE.md`, Architekturregeln | Die Regel „jedes Token muss dreifach stehen" entfällt. An ihre Stelle tritt: ein `:root`-Block, kein Hellmodus, und ein Wert wird erst durch seine Utility im `@theme inline`-Block wahr. |
| `CLAUDE.md`, Fallstricke | Der Hinweis auf die beiden Dunkel-Blöcke entfällt. Die Tailwind-v4-Rahmenfarbe und die `divide-*`-Kindselektor-Falle bleiben — beide gelten weiter. |
| `CLAUDE.md`, „Was noch aussteht" | Der Wiedereinstiegs-Hinweis, die offene `--rm-muted`-Kontrastfrage und der ausstehende visuelle Durchgang werden durch das Ergebnis ersetzt. |
| `CLAUDE.md`, Befehle-Tabelle | Sagt 514 Tests, es sind 519 in 46 Dateien (am 12. September 2026 nachgezählt). Nebenbefund, gehört aber in denselben Durchgang. |
| [Profil-Umbau-Plan](../plans/2026-09-07-rigmate-profil-umbau.md) | Bleibt als Historie unverändert. Sein Abschnitt „Offen nach dem ersten Browserlauf" wird abgearbeitet, nicht umgeschrieben. |

---

## 5. Was ausdrücklich nicht geändert wird

Damit der Umbau nicht ausufert und damit niemand später rätselt, ob etwas vergessen wurde:

- **Die Rollen der Farbtoken.** Petrol führt, Bernstein ist Seltenheit, `danger` ist Fehler. Nur die Werte
  verschieben sich.
- **`shared/utils/rarityStyle.ts`.** Die Zuordnung Seltenheitsstufe → Klasse bleibt, samt der Unterscheidung
  zwischen Punkt in der Liste (Deckkraft trägt den stillen Zustand) und Knoten auf dem Kabel (Rand trägt
  ihn). Die Tokens, auf die sie zeigt, existieren weiter.
- **Alle `data-*`-Testselektoren.** `data-cable`, `data-station`, `data-pip`, `data-count`, `data-stat`,
  `data-action` und Geschwister bleiben unverändert. Sie sind der Grund, warum ein Umbau der Klassen die
  Tests nicht umwirft.
- **Die fluiden Schrift- und Abstandsgrößen** in `@theme inline`. Sie funktionieren und sind vom Thema
  unabhängig.
- **Jede Server-Route, jede Migration, jedes Datenmodell.** Diese Spec ändert nur Darstellung.

---

## 6. Prüfung

Der wiederkehrende Fehler dieses Projekts ist ein Fehlschlag, der aussieht, als sei nichts passiert. Bei
einer Designumstellung heißt seine Schwester: **eine Klasse, die es nicht gibt, und die wortlos auf den
geerbten Wert zurückfällt.** Dagegen richtet sich die Prüfung.

### 6.1 Maschinell

- **Jede benutzte Utility existiert im generierten CSS.** Gegenprobe am ausgelieferten Stylesheet, nicht
  an `main.css` — geprüft wird, was der Browser bekommt. **Achtung:** `divide-*` erzeugt einen
  Kindselektor (`.divide-line > :not(:last-child)`); ein Muster auf `.name {` findet das nicht und meldet
  fälschlich „fehlt".
- **Ein Quelltext-Guard gegen die alten Werte.** Kein `rounded` und kein `rounded-sm` mehr in `app/`,
  keine `line-soft`-Utility, und — weiterhin — keine fest verdrahtete Tailwind-Palettenfarbe. Der Scan
  geht über **alle** Farbfamilien, nicht über eine Handvoll ausgedachter Muster: genau das hat beim
  Profilumbau „sauber" gemeldet, während `text-amber-700`, `text-green-700` und `text-neutral-400`
  unangetastet dastanden.
- **Ein Guard gegen ein halb wiederauferstehendes Hellthema.** `main.css` enthält keinen
  `prefers-color-scheme`- und keinen `[data-theme]`-Block. Wenn Hell je zurückkommt, dann als bewusste
  Entscheidung mit eigener Spec, nicht als versehentlich halb gebautes zweites Thema.
- **Jedes benutzte Farbpaar hat einen gerechneten Kontrastwert**, und jedes Textpaar liegt über 4,5:1.
- **Die 519 Unit- und Komponententests plus 38 API-Tests bleiben grün.** Sie hängen an `data-*`-Selektoren
  und an Verhalten, nicht an Klassennamen. Wo ein Test doch an einer Klasse hängt, ist das ein Befund über
  den Test. (519 in 46 Dateien, am 12. September 2026 nachgezählt — die Befehle-Tabelle in `CLAUDE.md`
  behauptet 514.)

### 6.2 Von Hand

Maschinell nicht erreichbar und deshalb Pflicht, nicht Kür:

- **Ein Mensch geht jede der 10 Seiten vor `yarn dev` durch.** Das ist der Durchgang, der seit dem
  Profilumbau aussteht.
- **Die gruppierte `/rig`-Seite wird zum ersten Mal überhaupt angesehen.**
- **Die Signalkette in einem schmalen Fenster**, weil sie auf einem echten Handy nie erprobt wurde.

Ein Radius, eine Fläche und eine Schriftbreite sind Urteilssachen. Kein Test kann sagen, ob es gut
aussieht — und genau daran ist beim Profilumbau ein fehlender Profil-Link in der Navigation aufgefallen,
den kein Test gefunden hätte.

---

## 7. Zurückgestellt

- **Ein Hellmodus.** Nicht gebaut, nicht zugemauert (3.1).
- **Gerätefotos und Avatare als Bilder.** Der Avatar-Upload existiert und ist ungetestet; `image_path` ist
  nirgends gefüllt. Solange das so ist, ist eine bildgetragene Anmutung nicht zu haben — erreichbar ist
  die Dichte von Letterboxd oder Discogs, wo ebenfalls Katalogdaten die Hauptsache sind. Das ist ohnehin
  das Vorbild aus Abschnitt 1 der Hauptspec.
- **shadcn-nuxt.** Fehlt weiterhin. Diese Spec macht es weder nötiger noch unnötiger.
- **Bewegung und Übergänge.** Bewusst kein Thema dieser Spec. Die Referenz ist statisch, und eine
  Oberfläche, die noch nie ein Mensch vollständig angesehen hat, braucht zuerst eine Form.

---

## Anhang: Entscheidungen und ihre Gründe

Vor dem Ändern einer dieser Entscheidungen hier nachsehen, warum sie so getroffen wurde.

**A1 · Nur Dunkelmodus, kein Hellthema.**
Robbys Entscheidung, auf Vorlage der drei Ansätze: *„1 in dunkel finde ich gut. das kann auch das einzigste
design sein wir brauchen kein hell."* Der Einwand — Systemeinstellung wird ignoriert, helle Schrift auf
dunklem Grund ist bei Astigmatismus schlechter lesbar — wurde genannt und die Entscheidung danach
bestätigt. Dagegen steht ein echter Gewinn: eine Palette statt drei Blöcken, und der Fallstrick der
halb definierten Tokens verschwindet ganz statt umgangen zu werden.

**A2 · Die Flächenleiter wird gegenüber der Profil-Spec gespreizt (`#0e1113` / `#23282b` / `#30373a`).**
Weil dieselben Rollen im Hellmodus bei 1,27:1 lagen und die bisherigen Dunkelwerte nur 1,11:1 erreichen.
Solange Rahmen existierten, trug das; ohne Rahmen ist die Stufe die einzige Tiefenquelle. Die Alternative
— Leiter lassen, Rahmen behalten — wurde verworfen, weil sie genau den Befund nicht löst. Der Mittelweg
(Grund `#121517`, Schritt ~1,20:1) wurde Robby vorgelegt und nicht gewählt.

**A3 · `--rm-line-soft` entfällt, `--rm-line` bleibt nur als innere Trennlinie.**
Zwei Linienstärken waren ein Erbe des Hellmodus. Nach der Rahmen-Regel steht überhaupt nur noch an wenigen
Stellen eine Linie, und dort soll sie sichtbar sein — eine zweite, schwächere Stärke hätte keinen Ort mehr.

**A4 · `--rm-line` bei `#3c4447` statt `#414a4d`.**
`#414a4d` ergäbe 1,64:1 gegen die Karte und damit eine stärkere Linie als heute (1,42:1). Da Linien
künftig selten sind, sollen sie sichtbar sein — aber nicht lauter als die Flächenstufe daneben. `#3c4447`
liegt bei 1,50:1 und damit dazwischen.

**A5 · Vier Radien mit Rollenbezug statt einem Wert.**
Heute sind 56 von 62 Radien derselbe Wert (4px), in zwei Schreibweisen. Der Rollenbezug ist die eigentliche
Aussage: unterschiedliche Ecken sagen dem Auge, dass Karte, Feld und Schaltfläche verschiedene Arten von
Ding sind. Die Einzelwerte (16/10/8/9999) sind dagegen verhandelbar.

**A6 · Keine Schatten, überhaupt keine.**
Die Referenz ist darin ausdrücklich, und für Rigmate kommt ein eigener Grund dazu: die einzige Hierarchie,
die auf dieser Oberfläche etwas bedeuten soll, ist die Seltenheit. Ein Schatten, der „dieses Element ist
wichtiger" sagt, konkurriert damit.

**A7 · Namen bleiben gemischt, Versalien nur auf Mono-Labels.**
Die Referenz setzt alle Überschriften versal. Das trägt bei sechs Marketing-Überschriften und scheitert
auf einem Profil: RÖHRENGLUT RÜDIGER liest sich als Aufschrift, nicht als Person. Die kondensierte Breite
liefert die editoriale Stimme auch ohne Versalien.

**A8 · Breite 88, nicht schmaler.**
88 verengt um 12 Prozent — an Namen und Überschriften deutlich, im Fließtext unauffällig. Deutlich
schmaler (70 und darunter, wie im verworfenen Ansatz „Blackface") verlangt Versalien und große Grade, um
lesbar zu bleiben, und führt damit zu A7 zurück.

**A9 · Kein zweiter heller Akzent, obwohl die Referenz einen hat.**
Dayos' Mint sitzt auf Tag-Pillen und kleinen Markern — genau dort, wo bei Rigmate Bernstein sitzt. Der
verworfene Ansatz „Surf Green" hätte das über eine Medientrennung gelöst (Fläche gegen Schrift). Mit der
Entscheidung für Ansatz 1 ist Petrol der führende Akzent und ein dritter Farbton unnötig.

**A10 · Die Zweispaltigkeit des Profils bleibt, obwohl der Feed dünn ist.**
Robbys Entscheidung. Der dünne Feed ist ein Inhaltsproblem von Stufe 1; die Spalte füllt sich mit Stufe 2.
Dieselbe Begründung wie bei den deaktivierten Schaltflächen „Folgen" und „Nachricht": die Seite zweimal zu
entwerfen ist teurer als vorübergehende Leere.

**A11 · Der Umfang wird auf die ganze Oberfläche ausgeweitet.**
Die Profil-Spec hatte sieben Seiten ausgeklammert, damit nichts doppelt entsteht. Diese Begründung kippt,
sobald es nur noch eine Designsprache gibt: eine Token-Umstellung trifft jede Datei ohnehin, und sieben
Seiten in der alten Form stehen zu lassen hieße, den Befund zu drei Vierteln nicht zu beheben.

**A12 · Die beiden Altlasten werden mitgenommen, nicht separat eingeplant.**
Der visuelle Durchgang aus dem Profilumbau und die nie gesehene gruppierte `/rig`-Seite brauchen beide
einen Menschen vor `yarn dev`. Dieser Umbau braucht denselben Menschen. Sie getrennt zu planen hieße, ihn
dreimal hinzusetzen.
