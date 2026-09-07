# Rigmate — Profilseite und Designsystem

**Stand:** 2026-09-07 · **Status:** wartet auf Review durch Robby

Diese Spec ergänzt die [Hauptspec](2026-09-06-rigmate-design.md) um zwei Dinge, die dort nicht
vorkommen: eine **visuelle Designsprache** und den **Aufbau der Profilseite**. Wo sie der Hauptspec
widerspricht, gewinnt die Hauptspec — bis auf einen Punkt, der in Abschnitt 8 ausdrücklich benannt ist.

---

## 1. Warum überhaupt

Die Profilseite aus Stufe 1 funktioniert und sieht trotzdem falsch aus. Der Befund, in der Reihenfolge,
in der er auffällt:

1. **Drei gestapelte `<section><h2>`** — Rig, Präferenzen, Wunschliste. Das ist eine Dokumentgliederung,
   kein Profil.
2. **Jedes Gerät ist ein unterstrichener Link, der wegführt.** Auf einem sozialen Profil bleibt man.
3. **Kein Bild, keine Zahl, keine Aktion.** Gitarren und Pedale sind hier Textzeilen in einer Tabelle.
4. **Keine Farbtokens.** [main.css](../../../app/assets/css/main.css) enthält ausschließlich fluide Größen.
   Alles Sichtbare ist Tailwind-Standardgrau — `bg-neutral-50`, `text-neutral-900`, `underline`.

Punkt 4 ist die Wurzel: es gibt kein Designsystem, an dem sich eine Seite ausrichten könnte.

**Der Zeitpunkt ist jetzt.** Stufe 2 bringt Feed, Posts, Kommentare, Likes, Benachrichtigungen und DMs —
die meisten neuen Oberflächen des ganzen Projekts. Heute sind es 10 Seiten und 4 Komponenten. Das ist die
kleinste Fläche, die dieses Projekt je wieder haben wird.

---

## 2. Umfang

**Im Umfang:**

- Das Designsystem als Tokens in `main.css` und wiederverwendbare Komponenten unter `app/components/`
- Der komplette Umbau von [`app/pages/profile/[id].vue`](../../../app/pages/profile/%5Bid%5D.vue)
- Der Signalketten-Reiter samt der einen dafür nötigen Migration
- Ein Profil-Feed aus Rig-Ereignissen

**Nicht im Umfang, bewusst:**

- Startseite, Suche, Gear-Seiten, Rig-Bearbeitung, Einstellungen, Login. Sie ziehen später nach und
  benutzen dann dieselben Tokens und Komponenten, statt dass etwas doppelt entsteht.
- Posts, Kommentare, Likes, Folgen — das bleibt Stufe 2. Der Feed zeigt vorerst nur Rig-Ereignisse.
- Gerätefotos. Der Katalog hat `catalog_items.image_path`, aber keine Inhalte, und niemand lädt Bilder
  hoch. Der Entwurf kommt ohne aus.

---

## 3. Die Designsprache

Hergeleitet aus der Welt des Gegenstands — Verstärkerfrontplatten, Pedalgehäuse, Werkstatt —, nicht aus
einer Vorlage.

### 3.1 Farbe

| Token | Hell | Dunkel | Rolle |
|---|---|---|---|
| `--bg` | `#e9e7e1` | `#131617` | Seitengrund, warmes Panel-Grau |
| `--surface` | `#faf9f6` | `#1d2123` | Karten, Panel |
| `--surface-2` | `#f1efe9` | `#24292b` | abgesetzte Flächen |
| `--ink` | `#191c1e` | `#e9e7e1` | Text |
| `--muted` | `#6a7175` | `#929b9e` | Nebentext, Labels |
| `--line` | `#cfccc4` | `#343b3d` | Rahmen |
| `--line-soft` | `#dedbd3` | `#2a3032` | innere Trennlinien |
| `--accent` | `#0d5a61` | `#4aacb2` | Marke, alles Interaktive |
| `--accent-ink` | `#ffffff` | `#0b1416` | Text auf Akzentflächen |
| `--accent-wash` | `#dbe8e8` | `#1a3134` | Akzent als Fläche (Avatar, Hinweiskasten) |
| `--rare` | `#a8631a` | `#dfa257` | **nur** `rarity_base = 'rare'` |
| `--rare-wash` | `#f4e6d3` | `#2e2313` | Fläche hinter einem Seltenheitshinweis |
| `--special` | `#8a6a34` | `#b99a68` | **nur** `rarity_base = 'special'` |

**Zwei Akzente mit getrennten Rollen, und das ist der Kern.** Petrol führt durch die Oberfläche, Bernstein
gehört ausschließlich der Seltenheit. Seltenheit ist bei Rigmate keine Verzierung, sondern die Mechanik,
über die Menschen einander finden (Abschnitt 5 der Hauptspec) — sie verdient eine eigene Farbe, die sonst
nirgends auftaucht.

**Nur zwei der vier Seltenheitsstufen werden ausgezeichnet.** `mass` und `common` bleiben still. Würden
alle vier leuchten, sagt die Auszeichnung nichts mehr.

### 3.2 Schrift

| Rolle | Familie | Verwendung |
|---|---|---|
| Display | **Archivo** 500/600/700 | Überschriften, Namen, Gerätebezeichnungen, Schaltflächen |
| Text | **IBM Plex Sans** 400/500/600 | Fließtext, Bio, Beiträge |
| Daten | **IBM Plex Mono** 400/500 | Baujahr, Finish, Zähler, Versal-Labels, Zeitangaben |

Gear-Daten lesen sich wie technische Angaben, also sehen sie auch so aus. Alle Zahlenkolonnen bekommen
`font-variant-numeric: tabular-nums`.

Beide Themes werden über Tokens bedient: heller Grund vollständig in `:root`, dunkler nur als
Überschreibung in `@media (prefers-color-scheme: dark)` **und** `[data-theme="dark"]`.

---

## 4. Aufbau der Profilseite

Zweispaltig unter einem gemeinsamen Kopf. Ab `52rem` nebeneinander, darunter gestapelt.

```
┌─────────────────────────────────────────────────┐
│  Avatar   Name · Handle · Bio · Band            │
│           4 Geräte · 1 Rarität · 0 Kollegen     │  [Folgen] [Nachricht]
├──────────────┬──────────────────────────────────┤
│ Equipment |  │                                  │
│ Signal Chain │           Feed                   │
│              │                                  │
│ GITARRE   1  │   ┌────────────────────────┐     │
│ ● White F.   │   │ Rig-Ereignis           │     │
│ AMP       1  │   │ Hat die White Falcon…  │     │
│ ○ JTM45      │   └────────────────────────┘     │
│ …            │                                  │
└──────────────┴──────────────────────────────────┘
   15.5rem              Rest
```

**Warum das trägt:** Das Equipment ist nicht der Hauptinhalt, sondern die Steckbriefspalte. Deshalb
*dürfen* seine Links auf die Gear-Seite wegführen — dort stehen die Details, und man kommt wegen des Feeds
zurück. Damit ist Befund 2 aus Abschnitt 1 gelöst, ohne dass die Gear-Seiten entwertet werden.

### 4.1 Kopf

Avatar, Anzeigename, Handle, Bio, Bands, dann eine Zeile mit Kennzahlen: **Geräte · Raritäten ·
Besonderheiten · Rig-Kollegen**. Rechts die Aktionen; „Folgen" und „Nachricht" sind bis Stufe 2 sichtbar,
aber deaktiviert — sie zu verstecken und später einzublenden würde den Kopf zweimal entwerfen.

„Rig-Kollegen" ist die Anzahl Personen, die mindestens einen Katalogeintrag mit dieser Person teilen.
Serverseitig, weil es über alle Nutzer aggregiert (Architekturregel in CLAUDE.md).

### 4.2 Linkes Panel, Reiter „Equipment"

Nach Kategorie gruppiert. Je Gruppe ein Versal-Label mit Zähler rechts, darunter die Einträge als reine
Namenslinks auf `/gear/<slug>`. Baujahr und Finish stehen klein in Mono dahinter.

Vor jedem Eintrag ein Punkt: **gefüllt** bei `rare`, **hohl** bei `special`, still bei allem anderen.
Der Name übernimmt dieselbe Farbe. Unter der Liste eine Legende.

Kategorien sind **Trennlinien, keine Kästen**. Bei vier Geräten ist das gleichgültig, bei vierzig
entscheidet es darüber, ob das Panel lesbar bleibt.

Die **Wunschliste** steht als letzte Gruppe im selben Panel, mit stillen Punkten. Sie gehört zum
Steckbrief und bekommt keinen eigenen Ort. **Präferenzen** werden zur Markierung am vorhandenen Eintrag,
nicht zu einer eigenen Gruppe — sie verweisen auf dieselben Katalogeinträge und würden sich sonst
verdoppeln.

### 4.3 Linkes Panel, Reiter „Signal Chain"

Dasselbe Equipment als senkrechter Signalweg. Links ein durchgehender Strang — das Kabel —, auf dem die
Stationen als Knoten sitzen. Je Station: Kategorie als Versal-Label, darunter der Gerätename als Link,
darunter Baujahr und Finish.

Die Knoten benutzen dieselbe Sprache wie die Punkte im Equipment-Reiter: gefüllt bei `rare`, hohl bei
`special`. Zwischen den Ansichten muss niemand umlernen.

**Die Stationen tragen Kategorien, keine Rollen.** „Gitarre" und „Pedal" kennt die Datenbank; ob ein Pedal
Drive oder Modulation ist, weiß sie nicht. Rollen wären ein neues Pflegefeld ohne erkennbaren Gegenwert.

Unter der Kette steht eine Zeile, die sagt, wo die Geräte ohne Platz im Signalweg geblieben sind — Saiten,
Plektren, Zubehör. Ohne sie wirkt der Reiter, als hätte er etwas verschluckt.

---

## 5. Die Signalkette in der Datenbank

### 5.1 `installed_in_id` ist nicht die Kette

**Wichtig, weil naheliegend und falsch:** `gear_items.installed_in_id` beschreibt, dass ein Gerät **in**
einem anderen verbaut ist — ein Tonabnehmer in einer Gitarre. Es hängt an einer Ein-Ebenen-Invariante mit
eigenem Trigger ([rig_fix_round_1.sql](../../../supabase/migrations/20260906130245_rig_fix_round_1.sql))
und hat mit der Reihenfolge im Signalweg nichts zu tun. Wer es dafür benutzt, bricht den Einbau.

### 5.2 Was dazukommt

Eine Migration, eine Spalte:

```sql
alter table gear_items add column chain_position smallint;
```

`null` heißt: nicht in der Kette. Die Kette ist die nach `chain_position` sortierte Liste der Geräte
einer Person, bei denen die Spalte gesetzt ist. Kein eigener Tabellentyp, keine Kanten — eine Ordnung
reicht, weil eine Signalkette linear ist.

**Eindeutig je Besitzer**, sonst ist die Reihenfolge bei einer Doppelbelegung von der Laune des Planers
abhängig und die Kette springt zwischen zwei Aufrufen um:

```sql
create unique index gear_items_owner_chain_position_key
  on gear_items (owner_id, chain_position)
  where chain_position is not null;
```

Positionen dürfen Lücken haben — beim Herausnehmen einer Station muss nicht die ganze Kette umgeschrieben
werden.

### 5.3 Gepflegt wird von Hand

**Entschieden gegen automatisches Vorsortieren nach Kategorie.** Wer eine Kette zeigen will, trägt sie
ein. Eine geratene Reihenfolge wäre bei vielen Rigs falsch und würde als Aussage gelesen, die niemand
getroffen hat.

**Der Preis ist ein Reiter, der anfangs bei fast allen leer ist**, und der muss deshalb sitzen:

- **Eigenes Profil, Kette leer:** Der Reiter ist da und erklärt in einem Satz, was eine Kette hier ist,
  mit einem Weg zum Eintragen.
- **Fremdes Profil, Kette leer:** Der Reiter erscheint nicht. Ein leerer Reiter auf einem fremden Profil
  ist eine Sackgasse.
- **Kette mit einer einzigen Station:** wird gezeigt. Ein Knoten ist eine ehrliche Kette.

Der Leertext lautet sinngemäß **„Keine Signal Chain angelegt"**, mit einem Satz daneben, was das ist und
wie man anfängt.

### 5.4 Bearbeiten: die rechte Spalte wird zur Geräteliste

Auf dem **eigenen** Profil lässt sich die Kette direkt auf der Profilseite bauen. Kein eigener Screen,
kein Overlay: **„Kette bearbeiten" tauscht die rechte Spalte** — dort, wo sonst der Feed steht, erscheint
die Liste der Geräte, die noch nicht in der Kette sind. Von dort zieht man sie nach links.

```
┌──────────────┬───────────────────────────────────┐
│ Signal Chain │  Geräte hinzufügen                │
│              │                                   │
│ ⠿ 1 · Gitarre│   ⠿ Cabinet                       │
│   White F. ↑↓✕│    Marshall 1960B    [Anhängen]  │
│ ─ Einfügemarke                                   │
│ ⠿ 2 · Pedal  │   ⠿ Amp                           │
│   CE-2     ↑↓✕│    Marshall JTM45    [Anhängen]  │
│              │                                   │
│ Fertig       │                                   │
└──────────────┴───────────────────────────────────┘
```

**Der Reiter allein tauscht die rechte Spalte nicht.** Ein Klick auf „Signal Chain" soll ansehen dürfen,
ohne dass der Feed verschwindet. Erst „Kette bearbeiten" wechselt. **Ausnahme:** ist die Kette leer, gibt
es nichts anzusehen — dann steht die Geräteliste sofort rechts.

**Besucher sehen davon nichts.** Kein Griff, keine Pfeile, kein „Bearbeiten"; die rechte Spalte bleibt der
Feed. Die Bearbeitung hängt an derselben Bedingung wie der vorhandene Bearbeiten-Link im Profilkopf:
`useUserId()` gleich Profil-Id. **Serverseitig schützt weiterhin RLS** — die Sichtbarkeit im Client ist
Bequemlichkeit, keine Absicherung.

#### Bedienung

| Weg | Wofür |
|---|---|
| Ziehen | schnellster Weg mit der Maus, mit Einfügemarke an der nächstgelegenen Fuge |
| Pfeile hoch/runter an jeder Station | einziger Weg per Tastatur, und der zuverlässige auf Touch |
| „Anhängen" an jedem Gerät der Liste | hängt hinten an, ohne Ziehen — trägt die schmale Ansicht |
| „✕" an jeder Station | nimmt aus der Kette |

**Ziehen ist nie der einzige Weg.** HTML5-Drag-and-Drop ist per Tastatur nicht erreichbar und auf Touch
unzuverlässig; ohne Pfeile und „Anhängen" wäre die Kette für einen Teil der Nutzer nicht bearbeitbar.

**Auf schmalen Schirmen** stehen die Spalten untereinander, dann zieht niemand von rechts nach links.
Dort tragen „Anhängen" und die Pfeile die ganze Bedienung.

**„✕" nimmt aus der Kette und löscht nichts.** Das Gerät wandert zurück in die Liste und bleibt im Rig.
Das steht auch so auf dem Bildschirm, weil ein „✕" sonst nach Löschen aussieht — und Löschen wäre hier
ein teurer Irrtum.

**„Fertig" statt „Speichern".** Jede Änderung wird sofort geschrieben; der Knopf schließt nur die
Bearbeitung und holt den Feed zurück.

#### Schreiben

Eine Verschiebung ist ein Schreibvorgang. Fünf schnelle Züge wären fünf Anfragen, deshalb werden
Änderungen **kurz gesammelt und gebündelt geschickt** (etwa 400 ms nach der letzten Aktion).

Der Hinweis unter der Kette meldet den Ausgang **ehrlich**: gespeichert, oder fehlgeschlagen mit der
Möglichkeit, es erneut zu versuchen. Ein stiller Fehlschlag wäre hier besonders teuer, weil die
Oberfläche die neue Reihenfolge bereits zeigt — genau der wiederkehrende Fehler aus Abschnitt 7.

---

## 6. Der Feed

**Inhalt: nur diese Person.** Die übliche Profil-Timeline.

**Ab Tag 1 echt, ohne neue Tabelle.** Die Beiträge sind zunächst **Rig-Ereignisse**, abgeleitet aus
`gear_items.created_at` — Daten, die längst vorhanden sind. Die Hauptspec führt automatische
Rig-Ereignisse ohnehin unter Stufe 2; sie hier vorzuziehen kostet nichts und verhindert, dass die rechte
Spalte bis Stufe 2 leer bleibt.

Ein Ereignis nennt Gerät, Kategorie, Baujahr und Finish und verlinkt auf die Gear-Seite. Bei einem `rare`
oder `special` Eintrag kommt ein Hinweis dazu, wie viele andere ihn spielen — die Aussage, für die es
Rigmate gibt.

Ereignisse desselben Tages zu derselben Person werden zu einem Beitrag zusammengefasst, sonst erzeugt ein
Erstbefüllung des Rigs zwanzig identisch aussehende Zeilen.

Posts, Likes und Kommentare kommen in Stufe 2 daneben. Ihre Schaltflächen werden **jetzt schon
mitentworfen**, aber deaktiviert dargestellt.

---

## 7. Fehler sind keine Leerzustände

Der wiederkehrende Fehler dieses Projekts ist laut CLAUDE.md ein Fehlschlag, der aussieht, als sei nichts
passiert — sechsmal in achtzehn Tasks. Die heutige Profilseite macht es bereits richtig: vier getrennte
Fehler-Flags für vier Lesezugriffe.

**Das bleibt so und gilt für jeden neuen Zugriff.** Diese Seite bekommt Zustände dazu, die sich ähneln und
verschieden sind:

| Zustand | darf nicht aussehen wie |
|---|---|
| Kette nicht gepflegt | Kette konnte nicht geladen werden |
| keine Rig-Ereignisse | Feed-Abfrage fehlgeschlagen |
| 0 Rig-Kollegen | Kollegenzahl konnte nicht berechnet werden |
| Reihenfolge gespeichert | Speichern fehlgeschlagen, Anzeige zeigt trotzdem die neue Reihenfolge |

Jeder dieser Fälle braucht ein eigenes Flag und einen eigenen sichtbaren Text.

Der letzte ist der gefährlichste: beim Sortieren zeigt die Oberfläche die neue Reihenfolge sofort, auch
wenn der Schreibvorgang scheitert. Nach einem Neuladen wäre die Änderung weg, ohne dass irgendwann etwas
kaputt ausgesehen hätte.

---

## 8. Ein Punkt gegen die Hauptspec

Abschnitt 10 der Hauptspec hält Profile hinter Login, im Gegensatz zu den öffentlichen Gear-Seiten. Das
bleibt. **Aber die Kennzahl „Rig-Kollegen" verrät etwas**, das dort nicht bedacht wurde: sie ist bei einer
Person mit ungewöhnlichem Equipment oft 0 oder 1 und erlaubt Rückschlüsse darauf, wie klein die Plattform
ist — dasselbe Problem, das Abschnitt 15 bereits für die öffentliche Gear-Seite notiert.

Hinter Login ist das vertretbar. **Es gehört aber auf dieselbe Liste**, nicht stillschweigend übergangen.

---

## 9. Umsetzung

**Tokens** kommen als `@theme`-Erweiterung in `main.css`, neben die vorhandenen fluiden Größen. Nichts
davon wird in einer Seite lokal definiert.

**Neue Komponenten** unter `app/components/`:

| Komponente | Zweck |
|---|---|
| `ProfileHeader.vue` | Avatar, Name, Bio, Bands, Kennzahlen, Aktionen |
| `GearPanel.vue` | linkes Panel mit beiden Reitern |
| `GearList.vue` | kategorisierte Liste mit Seltenheitspunkten |
| `SignalChain.vue` | senkrechte Kette, ansehen |
| `SignalChainEditor.vue` | dieselbe Kette bearbeitbar: Griffe, Pfeile, Einfügemarke |
| `GearPool.vue` | rechte Spalte im Bearbeitungsmodus, Geräte außerhalb der Kette |
| `RarityPip.vue` | der Punkt, eine Stelle für die Regel |
| `FeedItem.vue` | ein Beitrag, vorerst nur Rig-Ereignisse |

`RarityPip.vue` existiert, damit die Zuordnung Stufe → Farbe **einmal** im Code steht. Nach dem Muster von
`shared/utils/rarityBase.ts`, das genau deshalb angelegt wurde: die Werteliste stand vorher dreifach da.

**Sichtbare Texte** gehören nach `app/locales/de.ts`. Der Sprachtest ist ein AST-Scan und schlägt bei
statischen Textknoten und literalen `placeholder`/`title`/`aria-label`/`alt` fehl. In `.vue`-Dateien
werden Umlaute als „ae"/„oe"/„ue"/„ss" geschrieben, auch in Kommentaren.

**Die Reiter** sind echte Reiter: `role="tablist"`, `role="tab"`, `aria-selected`, `role="tabpanel"`,
Fokus sichtbar.

**Das Ziehen bekommt keine Bibliothek.** HTML5-Drag-and-Drop reicht für die Maus; die Pfeile und
„Anhängen" tragen Tastatur und Touch und sind ohnehin Pflicht. Eine Drag-Bibliothek würde eine
Abhängigkeit hinzufügen, um einen Weg zu verbessern, der nie der einzige sein darf.

---

## 10. Entwürfe

Die visuellen Vorlagen, in der Reihenfolge ihrer Entstehung:

1. [Drei Richtungen im Vergleich](https://claude.ai/code/artifact/9414fabf-302d-48e5-ab56-98ce4e550439) —
   Rig-Wand, Signalkette als Gerüst, Letterboxd-Reihen
2. [Panel mit zwei Ansichten](https://claude.ai/code/artifact/1072f5f4-15bd-44c4-be65-a5d5ac1f5bb1) —
   der beschlossene Entwurf, beide Reiter im aktiven Zustand

3. [Kette bearbeiten](https://claude.ai/code/artifact/0104dec5-24e7-4978-b07e-fca068e35bf1) —
   Bearbeitungsmodus mit funktionierendem Ziehen, daneben die Besucheransicht

Alle drei arbeiten mit echten Seed-Daten von Röhrenglut Rüdiger.

---

## Anhang: Entscheidungen und ihre Gründe

Nach dem Vorbild der Hauptspec. Wer eine dieser Entscheidungen ändern will, findet hier, warum sie so
getroffen wurde.

| Entscheidung | Grund |
|---|---|
| Zwei Akzentfarben mit getrennten Rollen | Seltenheit ist die Kernmechanik, keine Verzierung. Eine Farbe, die sonst nirgends vorkommt, macht sie überall sofort lesbar. |
| Nur `rare` und `special` markiert | Leuchten alle vier Stufen, sagt die Auszeichnung nichts mehr. |
| Equipment links, Feed rechts | Das Equipment ist Steckbrief, nicht Hauptinhalt. Erst dadurch dürfen seine Links weg auf die Gear-Seite führen. |
| Kette als Reiter, nicht als Feed-Beitrag | Als Beitrag würde sie bei jedem Umbau erneut im Feed erscheinen und ihn zumüllen. *(Robbys Einwand gegen einen früheren Entwurf.)* |
| Kette senkrecht | Ein schmales Panel trägt keine waagerechte Kette, und ein Signalweg von oben nach unten liest sich ohnehin natürlicher. |
| Keine Gerätebilder | Der Katalog hat keine. Silhouetten je Kategorie wären zehn Zeichnungen für eine Andeutung. Später ersetzbar, ohne dass das Layout sich ändert. |
| Kette nur manuell gepflegt | Eine geratene Reihenfolge wäre oft falsch und würde als Aussage gelesen, die niemand getroffen hat. |
| Reiter verschwindet auf fremden Profilen, wenn leer | Ein leerer Reiter auf einem fremden Profil ist eine Sackgasse. Auf dem eigenen ist er eine Einladung. |
| Kategorien als Stationsnamen, keine Rollen | Kategorien kennt die Datenbank. Rollen wären ein neues Pflegefeld ohne Gegenwert. |
| Feed zeigt nur diese Person | Übliche Profil-Timeline. Fremde Ereignisse auf einem fremden Profil verwirren. |
| Rig-Ereignisse aus `created_at` vorgezogen | Kostet keine Tabelle und verhindert, dass die rechte Spalte bis Stufe 2 leer bleibt. |
| Stufe-2-Schaltflächen jetzt entwerfen, deaktiviert zeigen | Sonst wird der Kopf zweimal entworfen. |
| Eine `chain_position`-Spalte statt Kanten | Eine Signalkette ist linear. Eine Ordnung genügt. |
| Bearbeiten tauscht die rechte Spalte | Kein eigener Screen, kein Overlay. Die Fläche ist da, und Kette und Geräteliste gehören beim Bauen nebeneinander. *(Robbys Vorschlag.)* |
| Der Reiter allein tauscht sie nicht | Ansehen soll nicht den Feed kosten. Nur bei leerer Kette entfällt der Umweg, weil es nichts anzusehen gibt. |
| Ziehen nie als einziger Weg | Per Tastatur nicht erreichbar, auf Touch unzuverlässig. Pfeile und „Anhängen" sind kein Zusatz, sondern die Grundbedienung. |
| „✕" nimmt heraus, löscht nicht | Ein Löschen an dieser Stelle wäre ein teurer Irrtum. |
| Schreibvorgänge gebündelt | Eine Verschiebung je Anfrage wäre bei schnellem Sortieren eine Salve. |
| Nur das Profil umbauen, Tokens aber gemeinsam | Die Tokens sind der teure Teil und werden einmal gebaut. Der Rest der App zieht nach, ohne dass etwas doppelt entsteht. |
