# Rigmate — Design-Spec

**Datum:** 2026-09-06
**Status:** Konzept abgestimmt, wartet auf Review
**Phase:** Prototyp (ausdrücklich kein Produktivbetrieb)

---

## 1. Worum es geht

### Ehrliche Ausgangslage

Es braucht keine weitere Social-Media-Plattform. Facebook, Instagram und Co. decken ab, was die meisten Nutzer wollen. Gegen ein bestehendes Netzwerk gewinnt man nicht über Features, sondern nur dadurch, dass man für eine bestimmte Gruppe etwas löst, das die Großen strukturell nicht **wollen** oder **können**.

Ihre strukturellen Sperren:

- **Werbefinanzierung** erzwingt Reichweite und Verweildauer. Alles, was das Publikum verkleinert oder die Nutzung verkürzt, ist für sie ein Minusgeschäft.
- **Milliarden-Skala** erzwingt Generik. Community-spezifische Regeln und Kuratierung sind nicht automatisierbar.
- **Wachstumszwang** verbietet Schrumpfen — obwohl „kleiner und spezifischer" genau das ist, was viele Nutzer suchen.

### Die Idee

Ein soziales Netzwerk für Gitarristen, bei dem **das Equipment den sozialen Graphen bildet**.

Nicht „Facebook für Musiker", sondern näher an **Letterboxd**: ein strukturierter Katalog als Rückgrat, an dem das Soziale hochwächst. Vergleichbare Vorbilder: Discogs (Platten), Goodreads (Bücher).

### Warum das trägt

Gear ist **strukturierte Faktenlage, kein Vibe**. Eine Jazzmaster 65 Reissue in einen Deluxe Reverb ist ein objektiver Verbindungsschlüssel. Facebook kennt nur „Freund von" und „hat geklickt auf" — nichts Vergleichbares.

Daraus ergeben sich drei Dinge, für die andere Plattformen kämpfen müssen:

- **Identität** — das Rig *ist* das Profil, ohne Selbstinszenierung
- **Entdeckung** — man browst über Gear zu Menschen, nicht über einen Algorithmus
- **Gesprächsanlass** — „du hast das auch?" ist der natürlichste Einstieg, den es gibt

Und Gear-Nerds sind eine der obsessivsten Communities überhaupt: Die Bereitschaft, das eigene Rig bis zur Schraube zu dokumentieren, ist praktisch unbegrenzt.

---

## 2. Umfang

### Prototyp-Charakter

Dies ist ein **Prototyp**, kein Produkt. Datenschutz, Sicherheit und Moderation laufen bewusst auf Sparflamme. Alle zurückgestellten Punkte stehen gesammelt in Abschnitt 15 und sind **vor jedem Produktivbetrieb abzuarbeiten**.

### Bewusst nicht Teil des Produkts

| Ausgeschlossen | Begründung |
|---|---|
| Marktplatz, Verkaufen, Tauschen | Sobald Geld im Spiel ist: Betrug, Haftung, Streitfälle — und Konkurrenz zu Reverb. Ein reines „suche ich" bleibt erlaubt. Verkaufsabsprachen klären Nutzer persönlich, dann liegt es in ihrer Verantwortung. |
| Ortsdaten, Umkreissuche, Karte | Persönliches tauschen die Leute selbst aus. Entfernt zugleich die Sorge, dass eine öffentliche Equipment-Liste zur Wertgegenstandsliste mit Adresse wird. |
| Eigenes Audio- und Video-Hosting | YouTube deckt Klangbeispiele und Demos ab — dort liegt der Fundus ohnehin schon. Spart Speicher, Umkodierung und Player. |

### Leitprinzip für künftige Feature-Wünsche

> **Die Plattform verbindet über Equipment. Alles Persönliche darüber hinaus tauschen die Leute selbst aus, wenn sie wollen.**

---

## 3. Domäne

Gitarrenwelt: **Gitarren, Bässe, Amps, Cabinets, Pedale, Tonabnehmer, Saiten, Plektren, Preamps** und Zubehör.

Der Zuschnitt ist bewusst eng: Je breiter der Katalog, desto dünner die Überschneidung zwischen zwei Nutzern — und die Überschneidung ist der Motor der Empfehlungen. Eng geschnitten heißt hier nicht ärmer, sondern dichter.

Das Datenmodell ist **instrumentneutral**. Kategorie / Marke / Modell / Ausführung funktioniert bei einer Snare genauso wie bei einer Strat. Eine spätere Ausweitung ist Katalogarbeit, kein Umbau.

---

## 4. Datenmodell

### 4.1 Katalog — das Fundament

Der Katalog ist **zweistufig**: Modell-Linie zu Ausführung, als Eltern-Kind-Beziehung.

```
Fender                          (Marke, eigenes Feld)
└─ Stratocaster                 (Modell-Linie)
   └─ American Professional II  (Ausführung)
```

Ein Exemplar darf auf **jeder Ebene** hängen — auch nur auf der Modell-Linie.

**Felder pro Katalog-Eintrag (gepflegt):**

| Feld | Zweck |
|---|---|
| Marke | Eigenes Feld, nicht Teil des Modellnamens |
| Modell | Der Name selbst |
| Kategorie | Gitarre, Amp, Pedal, Cabinet, Tonabnehmer, Saiten, Plektrum, Preamp … |
| Übergeordneter Eintrag | Leer bei Modell-Linie, gesetzt bei Ausführung |
| Synonyme | Liste: strat, LP, AC 30, ac-30 |
| Seltenheits-Grundwert | Massenware / verbreitet / speziell / rar |
| Bild | Optional |
| Geprüft | Ja/Nein — von Nutzern angelegte Einträge starten auf Nein |

**Herkunft:** Ein geseedeter Kern (einige hundert offensichtliche Modelle) deckt den Großteil ab. Was fehlt, dürfen Nutzer anlegen — mit Marke und Modell als getrennten Feldern und einem Hinweis auf ähnliche vorhandene Einträge.

> **Regel:** Baujahr und Modifikationen gehören **niemals** in den Modellnamen. Sonst entstehen „Stratocaster 1963" und „63er Strat" als zwei Katalog-Einträge und die Überschneidung bricht.

### 4.2 Exemplar — was ein Nutzer besitzt

Verweist auf einen Katalog-Eintrag und trägt die Individualität:

- Baujahr
- Farbe / Ausführung
- Modifikationen
- Foto
- Freitext-Notizen
- Optional **„verbaut in"** — Verweis auf ein anderes Exemplar desselben Nutzers (Tonabnehmer in einer Gitarre, Cabinet an einem Head). Bewusst nur **eine** Ebene tief.

### 4.3 Präferenz — Verbrauchsmaterial

Für Saiten und Plektren gibt es kein Exemplar. Man besitzt sie nicht als Einzelstück, man **bevorzugt** sie. Kein Baujahr, keine Modifikationen — nur der Verweis auf den Katalog-Eintrag.

Für die Empfehlungen relevant: Es gibt vielleicht drei Dutzend gängige Saitensätze. „Wir spielen beide Ernie Ball Slinky" ist ein starker Identitäts-Marker, aber ein **schwaches Übereinstimmungs-Signal**. Gehört rein, wird aber niedriger gewichtet.

### 4.4 Wunschliste

„Suche ich" neben „habe ich". Verweist wie eine Präferenz auf einen Katalog-Eintrag, ohne Exemplar-Daten.

Liefert einen **zweiten Verbindungstyp**: *du hast, was ich suche.*

---

## 5. Der Checker

Ein **zentraler Dienst mit drei Aufgaben und zwei Einsatzorten**.

### Aufgaben

1. **Auflösen** — unsauberer Text zu eindeutigem Katalog-Eintrag. strat, Stratocaster, Fender Strat landen alle am selben Ort.
2. **Bewerten** — wie aussagekräftig ist dieser Eintrag als Verbindung (siehe Abschnitt 6).
3. **Nachfragen** — aber nur dort, wo die Antwort etwas ändert.

### Einsatzorte

- **Beim Eintragen von Equipment** — Vorschläge statt Dubletten
- **Bei der Suche** — „AC30" und „Wer hat hier einen AC30?" sind dasselbe Problem

Einmal bauen, zweimal nutzen.

### Ablauf beim Auflösen — Autovervollständigung, keine Rückfrage

Die Auflösung passiert **während des Tippens**, nicht als Rückfrage danach:

1. Eingabe bei jedem Tastendruck normalisieren — Kleinschreibung, Sonderzeichen, Leerzeichen, Füll- und Fragewörter entfernen
2. Gegen Marke, Modell und Synonyme abgleichen (unscharfe Suche)
3. Treffer direkt als Auswahlliste anzeigen, **beide Katalogebenen nebeneinander**
4. Klick übernimmt den Eintrag — fertig
5. Nur wenn wirklich nichts passt: „Nicht dabei? Neu anlegen" als bewusster Notausgang, neuer Eintrag wird als ungeprüft markiert

```
strat
  Fender Stratocaster                    · Modell-Linie
  Fender American Professional II Strat  · Ausführung
  Fender Player Stratocaster             · Ausführung
  Squier Bullet Stratocaster             · Ausführung
```

**Warum das wichtig ist:** So gibt es **keine Freitext-Eingabe mehr** — es wird immer aus dem Katalog gewählt. Dubletten entstehen dadurch gar nicht erst, statt hinterher zusammengeführt werden zu müssen. Das Anlegen eines neuen Eintrags ist der Ausnahmefall, nicht der Normalweg.

**Nebeneffekt:** Die Katalogtiefe wird sichtbar, ohne dass jemand danach fragen muss. Der Gelegenheitsnutzer klickt auf die Modell-Linie und ist fertig; der Nerd sieht daneben seine Ausführung. Die Präzision liegt sichtbar bereit, ohne erzwungen zu werden — das ist die Umsetzung der gestaffelten Tiefe aus Abschnitt 6, und angenehmer als eine Rückfrage, die sich wie ein Formularfehler anfühlt.

**Keine KI nötig.** Normalisierung plus Synonymtabelle plus unscharfer Abgleich decken den Großteil ab.

### Nachfragen — die Regel

Greift **nach** der Auswahl aus der Liste, nicht anstelle davon: Wer die Modell-Linie gewählt hat, bekommt anschließend einen dezenten Hinweis auf die fehlende Genauigkeit — nie als Pflichtfeld.

Der Checker fragt nach, wenn die **Seltenheit innerhalb eines Eintrags stark streut**:

- Boss DS-1 — nichts zu fragen, ein DS-1 ist ein DS-1
- Fender Stratocaster — zwischen den Ausführungen liegen Welten, **also fragt er nach**

---

## 6. Empfehlungslogik

### Grundsatz

Zwei Nutzer werden umso stärker verbunden, je **seltener** und je **präziser** ihre gemeinsamen Geräte sind.

### Seltenheit

Zwei Quellen, kombiniert:

- **Gemessen** — wie viele Nutzer haben dieses Item? Haben es 400 von 500, ist es als Signal wertlos. Haben es 3, ist es hochinteressant. (Entspricht inverser Häufigkeitsgewichtung.)
- **Gepflegter Grundwert** — im Prototyp mit wenigen Nutzern ist statistisch *alles* selten, die Messung läuft leer. Der Grundwert am Katalog-Eintrag überbrückt das. Ein Boss DS-1 ist Massenware, egal was die Statistik bei 20 Nutzern sagt.

Sobald genug Daten vorliegen, überlagert der gemessene Wert den Grundwert.

### Tiefe des Treffers

Zwei Nutzer treffen sich auf der **tiefsten gemeinsamen Ebene**. Der Ungenauere zieht den Treffer herunter:

| Person A | Person B | Treffer auf | Signal |
|---|---|---|---|
| Strat | Strat | Modell-Linie | schwach |
| American Pro II | Strat | Modell-Linie | schwach |
| American Pro II | American Pro II | Ausführung | mittel |
| 63er Strat | 63er Strat | Ausführung + Baujahr | stark |

### Kombinationen

Geteilte **Kombinationen** wiegen schwerer als Einzeltreffer. „Ihr fahrt beide einen Tube Screamer in einen Deluxe Reverb" ist eine andere Aussage als zwei zufällige Einzeltreffer.

### Weitere Dimensionen

- **Wunschliste** — *du hast, was ich suche*
- **Verbrauchsmaterial** — fließt ein, aber niedrig gewichtet

### Der eingebaute Anreiz

Es braucht **keine Punkte, keine Badges**. Die Mechanik trägt sich selbst:

> Wer „Fender Strat" schreibt, matcht mit tausend Leuten gleich schwach — Rauschen.
> Wer „63er Strat, Refinish" schreibt, findet die drei Menschen, mit denen sich das Gespräch lohnt.

Der Nerd wird belohnt, weil er Nerd ist. Der Gelegenheitsnutzer wird nicht bestraft — er bekommt das grobe Ergebnis.

**Voraussetzung dafür:** Die Tiefe muss optional und gestaffelt sein. Ein Eintrag mit nur „Fender Stratocaster" ist vollständig gültig.

```
Pflicht:   Fender Stratocaster          ← reicht, Eintrag fertig
Optional:  → American Professional II   ← schärft den Treffer
Optional:  → Baujahr 2021, Sunburst     ← schärft ihn deutlich
Optional:  → Pickups getauscht, Foto    ← Nerd-Territorium
```

### Transparenz

**Jeder Vorschlag nennt seinen Grund** — „weil du auch einen AC30 spielst". Wer die Mechanik versteht, pflegt seine Liste. Wer sie für Zufall hält, tut es nie.

---

## 7. Menschen und Beziehungen

### Profil

- **Pflicht ist genau ein Feld: der Anzeigename.** Ein Künstlername genügt vollständig.
- **Optional ist alles andere:** Foto, echter Name, Bio, Bands, Links
- **E-Mail** nur für den Login, nie sichtbar
- **Keine Ortsdaten**

Pseudonymität ist hier kein Zugeständnis an Vorsichtige, sondern passt zur Sache: **Das Rig ist die Identität.** Der mit der 63er Strat und dem alten Tube Screamer ist in diesem Kontext eine vollständige, glaubwürdige Person — ohne Klarnamen, ohne Gesicht. Auf Facebook ist die Identität das Produkt, hier nicht.

Nebeneffekt: Was gar nicht erhoben wird, muss nicht geschützt werden. Datensparsamkeit als Bauweise statt als Versprechen.

### Zwei Beziehungstypen

| | Folgen | Freundschaft |
|---|---|---|
| Richtung | einseitig | gegenseitig, mit Anfrage und Bestätigung |
| Zweck | füttert den Feed | Nähe |
| Schaltet frei | — | Live-Chat, Sortierung im Feed |

**Freundschaft ist kein Türsteher.** Sie regelt Nähe, nicht Zugang.

### Kommunikation

- **Direktnachrichten sind für alle offen.** Keine Freundschaft nötig. Wer den Amp sieht, soll schreiben können, ohne erst einen Antrag zu stellen — Reibung genau in dem Moment, für den die Plattform existiert, wäre absurd.
- **Live-Chat nur unter Freunden**, eigene Ausbaustufe.

Das Prinzip dahinter: **Asynchrones ist offen, Synchrones ist gebunden.** Eine Nachricht kann man liegen lassen — sie kostet nichts. Ein Live-Chat verlangt Anwesenheit, das ist ein Eingriff.

### Equipment-Sichtbarkeit

Die **Equipment-Liste ist öffentlich** — für alle Angemeldeten sichtbar, unabhängig von Freundschaft.

Begründung: Läge sie hinter Freundschaft, müsste man befreundet sein, um das Equipment zu sehen, das einen überhaupt erst zum Vernetzen bringen würde. Henne und Ei, Motor steht.

---

## 8. Feed und Inhalte

### Feed-Zusammensetzung

**Freunde und Gefolgte.** Wird es dünn — neuer Nutzer, ruhiger Tag — füllt der Feed mit gear-relevanten Posts auf, **immer sichtbar gekennzeichnet**: *„weil du auch einen AC30 spielst"*.

Die Auffüllung verschwindet von selbst, sobald das eigene Netzwerk wächst, und dient zugleich als Entdeckungs-Trichter. Kein zweiter Tab, kein konkurrierender Algorithmus.

Damit ist das Leerer-Feed-Problem gelöst — der häufigste Tod eines sozialen Prototyps.

### Post

- Text
- Bilder
- Links mit Vorschau (YouTube deckt Ton und Video ab)
- Optional **mit einem Gerät verknüpft** — dann erscheint der Post auch auf dessen Gear-Seite

Die Gear-Verknüpfung ist der Punkt, an dem der Katalog vom Datenmodell zum Inhalt wird: Gear-Seiten füllen sich mit echten Erfahrungsberichten statt Herstellerprosa.

### Automatische Rig-Ereignisse

> „Robby hat einen Klon Centaur hinzugefügt"

Entsteht beim bloßen Pflegen des Rigs, ist für Gear-Leute echte Information und hält den Feed am Leben, ohne dass jemand aktiv wird. Bei wenigen Nutzern der einzige Inhalt, der von selbst entsteht.

### Reaktionen

Likes und **Kommentare**. Bei Gear ist der Kommentar fast wichtiger als der Post — „welche Pickups hast du drin?" ist die Standard-Anschlussfrage.

---

## 9. Oberfläche

### Drei Hauptseiten

1. **Feed** — Freunde und Gefolgte, mit gear-relevanter Auffüllung
2. **Profil** — Anzeigename, optionale Angaben, Rig, Wunschliste
3. **Gear-Seite** — wer spielt es, welche Ausführungen gibt es, welche Posts gibt es dazu

Die Gear-Seite ist die Seite, die das Konzept sichtbar macht. Ihr Inhalt ist fast vollständig **abgeleitet** und damit billig: Spieler und Posts sind Abfragen, Ausführungen sind Kinder im Katalog, Seltenheit ist gerechnet.

### Dazu

- **Suche** — über denselben Checker, verarbeitet „AC30" wie „Wer hat hier einen AC30?"
- **Benachrichtigungen** — neue Nachrichten, Live-Chat-Nachrichten, Likes, Kommentare, neue Follower

---

## 10. Sichtbarkeit

| Bereich | Ohne Login |
|---|---|
| Gear-Seiten | **öffentlich lesbar und auffindbar** |
| Profile | nur mit Login |
| Feed und Posts | nur mit Login |
| Alles Interaktive | nur mit Login |

Der Katalog wird damit zum Schaufenster, das Leute anzieht — die Nutzer selbst bleiben geschützt. Für Gear-Seiten ist Auffindbarkeit über Suchmaschinen relevant, entsprechend gehört eine Sitemap dazu.

---

## 11. Onboarding

Der erste Rig-Eintrag ist der **kritischste Bildschirm der ganzen App**. Wer dort abbricht, hat kein Equipment, bekommt keine Empfehlungen und sieht eine leere Plattform.

### Prinzip: die Leere erklären statt kaschieren

> „Du siehst gerade Zufälliges. Trag dein Equipment ein, dann stehen hier Leute, die dasselbe spielen."

Der leere Zustand wird zur Stelle, an der die App ihr eigenes Prinzip beibringt. Konkret:

- Zufällig gemischte Posts und Personenvorschläge, damit nichts leer wirkt
- **Deutlich gekennzeichnet**, dass sich diese Vorschläge verfeinern, je vollständiger die eigene Liste ist
- Eintragen niederschwellig halten — zwei Klicks für „Fender Stratocaster"

---

## 12. Technik

### Stack

| Ebene | Wahl |
|---|---|
| Frontend | **Nuxt 4** (SSR), neues, blankes Projekt |
| Backend | **Supabase** — Postgres, Auth, Storage, Realtime |
| Anbindung | `@nuxtjs/supabase` |
| Styling | Tailwind v4 plus shadcn-nuxt, Tokens aus dem Base-Repo übernommen |
| Schema | SQL-Migrationen über die Supabase-CLI |
| Seed | Skript, analog zur Schema-als-Code-Philosophie des Base-Repos |

### Warum Supabase statt Directus

Ursprünglich war Directus gesetzt — Hauptargument: ein fertiges Redaktions-Interface für die aufwendige Katalogpflege.

Ausschlaggebend dagegen:

- **Kosten.** Directus online zu betreiben kostet dauerhaft Geld; die kostenlose Supabase-Stufe reicht für einen Prototyp.
- **Mobilität.** Lokales Docker bindet die Daten an einen Rechner. Gehostet ist von überall erreichbar — und der Prototyp lässt sich **jemandem zeigen**, was bei lokalem Docker gar nicht geht.
- **Vorhandene Erfahrung** mit Supabase, keine Lernkurve.
- **Realtime** ist für den geplanten Live-Chat ausgereifter.
- Der Katalog-Vorteil greift überwiegend **im Produktivbetrieb**, nicht im Prototyp: Der Seed-Katalog entsteht per Skript, Nutzer-Vorschläge gibt es erst mit Nutzern.
- Entschieden wurde vor der ersten Zeile App-Code — später wäre der Wechsel teuer gewesen.

**Preis der Entscheidung:** Die Katalogpflege wird ein eigener kleiner Baustein statt eines Geschenks (siehe Abschnitt 15).

**Notausgang, falls das Backoffice doch fehlt:** Directus lässt sich lokal auf dieselbe Supabase-Postgres richten und die Katalog-Tabellen einlesen. Etwas unorthodox, aber beim Katalog — einer schlichten Referenztabelle ohne RLS-Feinheiten — risikoarm. Notiert als Option, nicht als Plan.

### Architektur: wo die Logik liegt

Das Base-Repo liest anonym direkt aus dem CMS — für eine Website richtig, für diese App nicht.

| Art des Zugriffs | Weg |
|---|---|
| Einfaches Lesen und Schreiben (Profil, Rig, Post anlegen) | Client zu Supabase direkt, über RLS abgesichert |
| Feed-Zusammenstellung | **Nuxt-Server-Route** — mehrere Abfragen plus Ranking |
| Empfehlungen | **Nuxt-Server-Route** — Aggregation über alle Nutzer, darf der Browser nicht selbst rechnen |
| Checker und Suche | **Nuxt-Server-Route** — braucht den ganzen Katalog im Zugriff |

**RLS ist Pflicht**, auch bei einem einfachen Rechtemodell: Ohne aktivierte Policies ist bei Supabase alles offen.

### Was aus dem Base-Repo mitkommt

- Tailwind-v4-Tokens und das shadcn-Setup samt `cn()`
- Projektstruktur- und Namenskonventionen
- `sanitizeHtml` für Rich-Text-Ausgabe
- Die Haltung „Schema und Seed sind Code, nicht Handarbeit"

**Nicht** übernommen: Page Builder und M2A-Mechanik, `redirects`, Schema.org-Composables, die Directus-Helfer in `scripts/lib/`, `getAssetUrl` (Supabase Storage hat eigene URLs).

---

## 13. Ausbaustufen

### Stufe 1 — das Unterscheidungsmerkmal zuerst

Auth · Profil · Katalog · Rig mit Exemplaren und Präferenzen · Wunschliste · Checker · Empfehlungen · Gear-Seiten · Suche · **niederschwelliger erster Rig-Eintrag** (Abschnitt 11, erster Teil)

**Ziel:** beweisen, dass der Gear-Graph trägt. Das ist der Teil, den es noch nicht gibt — und wenn er nicht funktioniert, hilft der Rest auch nicht.

### Stufe 2 — die soziale Schicht

Feed · Posts mit Bildern und Link-Vorschau · automatische Rig-Ereignisse · Kommentare und Likes · Folgen · Freundschaft · Direktnachrichten · Benachrichtigungen · **Auffüllung und Erklärtexte im leeren Feed** (Abschnitt 11, zweiter Teil)

### Stufe 3 — Ausbau

Live-Chat mit Präsenz und Tipp-Anzeige · Katalog-Backoffice · Ausweitung auf weitere Instrumente

---

## 14. Offene Punkte

| Punkt | Anmerkung |
|---|---|
| **Sprache der Oberfläche** | Deutsch oder Englisch? Die Gear-Community ist international, das Projekt ist deutsch. Noch nicht entschieden. |
| **Hosting des Frontends** | Netlify wie im Base-Repo, oder etwas anderes? |
| **Umfang des Seed-Katalogs** | Wie viele Einträge, und woher? Eine offene Gear-Datenbank existiert nicht — die Zusammenstellung ist Handarbeit. |
| **Umfang der Seed-Nutzer** | Wie viele erfundene Musiker mit plausiblen Rigs braucht eine überzeugende Vorführung? |
| **Reaktionstypen** | Nur Like, oder mehr? |
| **Bild-Limits** | Größe, Anzahl pro Post, Formate |

---

## 15. Vorbehalte für einen Produktivbetrieb

**Diese Liste ist vor jedem echten Livegang abzuarbeiten.** Im Prototyp bewusst zurückgestellt.

### Konten und Zugang
- Registrierung, Passwort-Handling, E-Mail-Bestätigung, Passwort-Reset
- Jugendschutz, falls Minderjährige teilnehmen (JMStV, Altersverifikation)

### Inhalte
- Bild-Uploads: Missbrauch, fremde Bildrechte, Prüfung auf illegale Inhalte
- Melde- und Löschprozess für Inhalte (Notice-and-Action nach DSA Art. 16)
- Moderationsmöglichkeiten für Betreiber

### Kommunikation
- **Nachrichtenanfragen** — die erste Nachricht eines Fremden landet in einem getrennten Eingang. Schreiben darf weiterhin jeder jeden; der Empfänger sortiert nur. Keine Hürde beim Senden, nur Ordnung beim Empfangen.
- Tempolimit fürs Anschreiben, damit niemand hunderte Leute auf einmal kontaktiert
- Blockieren und Melden
- **Bekannte Spannung:** Pseudonyme plus offene Nachrichten ist die klassische Kombination, bei der Belästigung leichtfällt. Blockieren und Melden sind dafür keine Kür.

### Daten
- DSGVO: Auskunft, Löschung, Verarbeitungsverzeichnis, Rechtsgrundlagen
- Impressum und Datenschutzerklärung
- **Sichtbarkeitsstufe für Exemplar-Daten** — Fotos aus dem eigenen Proberaum, Seriennummern, Kaufpreise. Die Katalog-Zuordnung bleibt öffentlich (sie ist der Motor), die Exemplar-Details sollten steuerbar werden.

### Betrieb
- **Katalog-Backoffice** — internes CRUD über Marke, Modell, Kategorie, Synonyme, Seltenheit, plus Zusammenführen von Dubletten und Prüfen von Nutzer-Vorschlägen. Durch die Supabase-Entscheidung ein eigener Baustein.
- Rechtliche Prüfung vor Livegang. Die Einordnungen in dieser Spec beschreiben die Systematik und ersetzen keine Rechtsberatung.

---

## Anhang: Entscheidungen und ihre Begründungen

| Entscheidung | Warum |
|---|---|
| Equipment als sozialer Graph | Gear ist strukturierte Faktenlage und damit ein objektiver Verbindungsschlüssel — etwas, das die großen Plattformen nicht haben. |
| Nur Gitarrenwelt | Je breiter der Katalog, desto dünner die Überschneidung. Dichte schlägt Umfang. |
| Katalog zweistufig | Erlaubt grobe und feine Einträge nebeneinander; die Tiefe des Treffers wird zum Signal. |
| Seltenheit gewichtet | Sonst wird jeder mit einem Standard-Pedal jedem empfohlen und die Empfehlung ist wertlos. |
| Gepflegter Seltenheits-Grundwert | Bei wenigen Nutzern ist statistisch alles selten — ohne Grundwert wäre das Feature im Prototyp nicht vorführbar. |
| Nur Anzeigename verpflichtend | Das Rig ist die Identität; Klarnamen sind hier überflüssig. Senkt zugleich den Datenschutz-Aufwand drastisch. |
| Equipment-Liste öffentlich | Sie ist der Entdeckungs-Mechanismus. Hinter Freundschaft versteckt zerstört sie die eigene Schleife. |
| Nachrichten offen, Live-Chat gebunden | Asynchrones kostet den Empfänger nichts, Synchrones verlangt Anwesenheit. |
| Keine Ortsdaten | Persönliches klären Nutzer selbst — und die Wertgegenstandslisten-Sorge löst sich damit auf. |
| Kein Marktplatz | Geld bringt Betrug, Haftung und Streitfälle, und Reverb macht es besser. |
| Gear-Seiten öffentlich, Rest hinter Login | Der Katalog zieht Leute an, die Nutzer bleiben geschützt. |
| Supabase statt Directus | Kostenfrei, gehostet, vorhandene Erfahrung, bessere Realtime — und der Katalog-Vorteil von Directus greift erst im Produktivbetrieb. |
| Logik in Nuxt-Server-Routen | Feed-Ranking und Empfehlungen brauchen Aggregation über alle Nutzer; das gehört nicht in den Browser. |
