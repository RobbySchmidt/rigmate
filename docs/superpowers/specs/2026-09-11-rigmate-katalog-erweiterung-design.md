# Rigmate — Katalogerweiterung und Rig-Eingabe

**Stand:** 2026-09-11 · **Status:** wartet auf Review durch Robby

Diese Spec ergänzt die [Hauptspec](2026-09-06-rigmate-design.md) um die **Domänengrenze für digitales
und virtuelles Equipment** und baut die **Eingabe auf `/rig`** um. Wo sie der Hauptspec widerspricht,
gewinnt diese Spec — das betrifft genau eine Stelle, Abschnitt 3 der Hauptspec, und ist in Abschnitt 3
unten ausdrücklich benannt.

---

## 1. Warum überhaupt

Am 11. September 2026 hat sich der **erste echte Nutzer** registriert — bis dahin standen 20 Demo-Musiker
allein in der Datenbank. Der Befund aus diesem einen Durchlauf:

- Von seinem kompletten Setup war **kein einziger Eintrag** im Katalog. Von seinen elf Marken fehlten
  drei ganz (Randall, Fortin, Edwards); die übrigen acht waren da, führten aber keines seiner Modelle.
- Er hat **nichts eingetragen**: null Gear-Einträge, null selbst angelegte Katalogeinträge.
- Vier seiner Geräte lassen sich mit dem heutigen Datenmodell **gar nicht sinnvoll** ablegen: eine
  Loadbox, ein Amp-Sim-Plugin, ein Audiointerface und eine DAW.
- Sein Rig ist ein **Hybrid**: echter Röhrenamp, aber die Box kommt als Plugin. Die Hauptspec kennt nur
  „Amp → Cabinet".

Das ist dieselbe Sorte Fund wie der fehlende Profil-Link aus dem Profilumbau: **kein Test hätte das
gefunden, es kam aus dem Benutzen.** 482 Tests waren grün, während die Hauptseite für diesen Nutzer
unbenutzbar war.

Der zweite Befund ist eine Stilfrage, die derselbe Nutzer gemeldet hat: die Eingabe auf `/rig` ist nach
Kategorie vorsortiert (ein Feld für Equipment, je eins für Saiten und Plektren), obwohl der Picker
technisch längst alles annimmt. Die Kategorisierung gehört in die **Ausgabe**, nicht in die Eingabe.

---

## 2. Umfang

**Im Umfang:**

- Drei neue Kategorien, eine bereinigte (`preamp`)
- Die Regel, wie virtuelle Klangquellen katalogisiert werden
- Saitenstärke sichtbar am Katalognamen
- Der Umbau der Eingabe und der Gruppierung auf [`app/pages/rig.vue`](../../../app/pages/rig.vue)
- Ein konkreter Katalogzuwachs von 19 Einträgen und drei Marken

**Nicht im Umfang, bewusst:**

- **Audiointerfaces, DAWs und DI-Boxen.** Begründung in Abschnitt 3.
- Ein Katalog-Backoffice. Steht weiter in Abschnitt 15 der Hauptspec.
- Jede Änderung an der Empfehlungslogik. Die Kategorie geht ohnehin nicht ins Scoring ein
  ([`scoring.ts`](../../../server/utils/scoring.ts) vergleicht `lineId` und `catalogItemId`), diese Spec
  ändert daran nichts.
- Die Seltenheits-Grundwerte bestehender Einträge, außer den vier ausdrücklich genannten.

---

## 3. Die Domänengrenze: was den Klang formt

Abschnitt 3 der Hauptspec zählt die Domäne auf — „Gitarren, Bässe, Amps, Cabinets, Pedale, Tonabnehmer,
Saiten, Plektren, Preamps und Zubehör" — und begründet den engen Zuschnitt so:

> Je breiter der Katalog, desto dünner die Überschneidung zwischen zwei Nutzern — und die Überschneidung
> ist der Motor der Empfehlungen.

Diese Begründung bleibt gültig. Die Aufzählung wird erweitert, aber **nach einem Kriterium statt nach
Gefühl**:

> **Regel:** In den Katalog kommt, was **den Klang formt** — gleichgültig ob als Hardware oder als
> Software. Draußen bleibt, was das Signal nur **transportiert oder aufzeichnet**.

Damit kommen **Loadboxen, Modeller, Amp-Sim-Plugins und IR-Packs** herein: Das sind Klangentscheidungen,
so bewusst getroffen wie die Wahl eines Pedals.

Damit bleiben **Audiointerfaces, DAWs und DI-Boxen** draußen. Nicht weil sie unwichtig wären, sondern
weil sie als Übereinstimmungssignal wertlos sind: Fast jeder Aufnehmende hat ein Interface und eine DAW,
und die Wahl sagt nichts über den Klang. Sie wären ein noch schwächeres Signal als Saiten — und Saiten
sind laut Abschnitt 4.3 der Hauptspec schon ausdrücklich niedrig gewichtet. Jeder aufgenommene
Interface-Eintrag verdünnt den Motor, ohne etwas beizutragen.

**Bekannte Härte dieser Entscheidung:** Aus dem Setup des ersten Nutzers fallen damit drei Geräte heraus
(Radial J48, Focusrite Scarlett 2i2, Reaper). Das ist bewusst und wurde ihm gegenüber offen benannt. Die
Grenze ist überprüfbar formuliert, damit die nächste Diskussion nicht bei null beginnt.

---

## 4. Kategorien

### 4.1 Drei neue

| ID | Label | Inhalt | `sort_order` |
|---|---|---|---|
| `modeller` | Modeller | Kemper Profiler, Quad Cortex, Axe-Fx III, Helix | 35 |
| `loadbox` | Loadbox | Torpedo Reload, Torpedo Captor X | 45 |
| `plugin` | Plugin | Amp-Sim-Plugins, später IR-Packs | 47 |

Die Werte liegen in den Lücken der bestehenden Zehnerschritte. Die resultierende Reihenfolge hält die
Verstärkungskette zusammen: Gitarre, Bass, Amp, Modeller, Cabinet, Loadbox, Plugin, Pedal, Tonabnehmer,
Preamp, Zubehör, Saiten, Plektrum.

Alle drei sind `is_consumable = false`.

### 4.2 `preamp` wird bereinigt

Der Seed hat vier Modeller und eine Loadbox unter `preamp` abgelegt — eine „wohin sonst"-Kategorie, kein
Schnitt. Ein Kemper Profiler ist kein Preamp, eine Loadbox erst recht nicht.

| Eintrag | von | nach |
|---|---|---|
| Kemper Profiler | `preamp` | `modeller` |
| Neural DSP Quad Cortex | `preamp` | `modeller` |
| Fractal Audio Axe-Fx III | `preamp` | `modeller` |
| Line 6 Helix | `preamp` | `modeller` |
| Two Notes Torpedo Captor X | `preamp` | `loadbox` |

`preamp` behält danach echte Preamps — Rack-Geräte **und** Onboard-Preamps, die in einem Instrument
sitzen. Dass ein EMG ABQ in einer Gitarre verbaut ist, sagt `installed_in_id`, nicht die Kategorie.

**Warum das jetzt zählt, obwohl die Kategorie nicht ins Scoring eingeht:** Bis heute war die Kategorie
fast unsichtbar — die Rig-Liste ist flach. Abschnitt 8 macht sie zur Gliederung der Seite. Ab dann steht
ein Kemper Profiler für jeden sichtbar unter der Überschrift „Preamp".

Der Umzug ist billig: [`ensureItem`](../../../scripts/seed-catalog.ts) schreibt `category_id` bei jedem
Lauf mit, ein `yarn seed:catalog` zieht die Änderung durch. Namen und IDs bleiben, also bleiben auch alle
Referenzen bestehen.

---

## 5. Virtuelle Klangquellen

> **Regel:** Ein IR-Pack oder Plugin ist ein **eigener Katalogeintrag mit eigener Marke**, niemals eine
> Ausführung des physischen Vorbilds.

Ein IR der Mesa-Box ist ein Produkt von York Audio oder Ownhammer, nicht von Mesa. Die naheliegende
Alternative — das IR als Ausführung unter die physische Modell-Linie zu hängen, damit IR-Nutzer und
Box-Besitzer sich auf Linien-Ebene treffen — scheitert an der Datenbank selbst:

```sql
if parent_row.brand_id <> new.brand_id then
  raise exception 'a variant must share the brand of its model line';
```

([`20260906100512_catalog.sql`](../../../supabase/migrations/20260906100512_catalog.sql)) Ein
Ownhammer-IR kann technisch keine Ausführung eines Mesa-Eintrags sein. Die Regel nachträglich
aufzuweichen, um virtuelle Kopien unter fremde Marken zu hängen, würde die Markenzuordnung des ganzen
Katalogs entwerten.

**Folge:** Wer ein IR einer Box besitzt, trifft deren Besitzer **nicht** über den Katalog. Das ist
vertretbar — sie besitzen tatsächlich verschiedene Dinge, und es hält die Seltenheit gesuchter Boxen
sauber, statt sie durch beliebig kopierbare Dateien zu verwässern.

---

## 6. Submarken bleiben eigene Markenzeilen

Der Katalog führt LTD als eigene Marke, ausdrücklich kommentiert mit „LTD is its own brand row, like
Squier under Fender". Edwards ist strukturell dasselbe: eine ESP-Submarke.

> **Regel:** Submarken bekommen eine eigene Markenzeile. Die Auffindbarkeit über die Dachmarke tragen
> **Synonyme am Eintrag**, nicht der Markenname.

Das funktioniert, weil [`buildSearchable`](../../../server/utils/catalogMatch.ts) vier Vergleichsziele
pro Eintrag baut: Name, Marke + Name, jedes Synonym und Marke + Synonym. Ein Synonym `esp alexi` macht
eine Edwards über „ESP Alexi" auffindbar, ohne die Marke anzufassen.

**Warum die Trennung überhaupt:** Preisklasse und Seltenheit bleiben unterscheidbar. Eine japanische
Edwards ist nicht dasselbe wie eine LTD aus derselben Signature-Reihe, und eine gemeinsame Markenzeile
würde beide in dieselbe Schublade werfen.

---

## 7. Saitenstärke

> **Regel:** Bezeichnet ein Saiten-Eintrag einen **konkreten Satz**, gehört die Stärke in Klammern an den
> Namen: `EXL140 (10-52)`. Bezeichnet er eine **Serie**, die es in vielen Stärken gibt, bleibt er ohne.

Die Stärke ist eine feste Produkteigenschaft — ein EXL140 *ist* 10-52 — und erzeugt darum keine
Dubletten, anders als Baujahr oder Modifikation. Die Regel aus Abschnitt 4.1 der Hauptspec („Baujahr und
Modifikationen gehören niemals in den Modellnamen") bleibt unberührt: sie zielt auf **Besitzdetails**,
nicht auf Produkteigenschaften.

Die Serien-Ausnahme betrifft Einträge wie Elixir Nanoweb oder Ernie Ball Slinky. Uneinheitlich, aber
ehrlich: eine Stärke an einen Serien-Eintrag zu schreiben wäre schlicht falsch.

Zusätzlich kommt die Stärke als **Synonym** dazu, damit die Suche über „10-52" funktioniert.

**Verworfen:** ein eigenes Feld `gauge`. Es wäre sauberer strukturiert und gezielt durchsuchbar, kostet
aber eine Migration und Anzeigeänderungen an drei Stellen — für eine Information, die am Namen genauso
sichtbar wird. Entscheidung des Nutzers, bewusst zugunsten des einfacheren Wegs.

### 7.1 Das Umbenennungs-Risiko

Drei bestehende Einträge werden umbenannt: `EXL110` → `EXL110 (10-46)`, `EXL120` → `EXL120 (9-42)`,
`NYXL1046` → `NYXL1046 (10-46)`.

**Das darf nicht über den Seed laufen.** `ensureItem` sucht per `brand_id` + `name`; unter neuem Namen
findet es nichts, legt einen zweiten Eintrag an und lässt den alten als Waise stehen. Diese Waisen sind
**referenziert** — Stand heute fünf Präferenzen von Demo-Nutzern — und `catalog_items` trägt überall
`on delete restrict`. Ein `--prune` liefe also ins Messer, und die Präferenzen zeigten weiter auf die
alten Einträge.

**Stattdessen:** eine Migration, die die drei Namen per `update` ändert. IDs bleiben, Referenzen bleiben,
der Seed findet danach die neuen Namen wieder.

**Nebenwirkung:** Der Trigger regeneriert bei Namensänderung den `slug`, die öffentlichen Gear-Seiten
dieser drei Sätze bekommen also neue URLs. Bei drei Saiten-Seiten ohne eingehende Links vertretbar.

---

## 8. Die Rig-Seite

### 8.1 Ein Eingabefeld

Heute stehen drei Picker auf der Seite: einer für Equipment, je einer mit festem `category-id` für Saiten
und Plektren. Die Vorsortierung ist überflüssig — der Equipment-Picker filtert schon jetzt keine
Kategorie.

Neu: **ein Feld für alles Eigene.** Was der Nutzer wählt, entscheidet, was daraus wird:

- Kategorie mit `is_consumable = false` → Exemplar, das Formular für Baujahr, Finish und „verbaut in"
  erscheint wie bisher
- Kategorie mit `is_consumable = true` → still eine Präferenz, ohne Formular

Das folgt dem Prinzip aus Abschnitt 5 der Hauptspec: **Autovervollständigung statt Rückfrage.** Die
Datenbank weiß über `is_consumable`, was was ist; den Nutzer danach zu fragen, wäre eine Rückfrage nach
etwas bereits Bekanntem.

**Nebeneffekt:** Der heutige Fehler „Verbrauchsmaterial kann kein Gerät sein" verschwindet als
Fehlerfall. Er kommt heute erst **nach** dem Absenden. Der Trigger
`enforce_gear_item_rules()` bleibt als letzte Instanz bestehen, wird aber unerreichbar — das ist
Absicht, nicht Redundanz.

**Die Wunschliste behält ihr eigenes Feld.** „Habe ich" gegen „suche ich" ist eine Absicht, die das
System nicht aus der Kategorie ableiten kann.

### 8.2 Gruppierte Ausgabe

Die Liste darunter gruppiert nach Kategorie, in `sort_order`-Reihenfolge, mit dem Label aus
`app/locales/de.ts` als Überschrift. **Leere Gruppen erscheinen nicht** — sonst stünden dreizehn
Überschriften über einem leeren Rig.

Verbrauchsmaterial erscheint in derselben gruppierten Liste, unter „Saiten" und „Plektrum". Die heutige
Trennung in zwei Abschnitte entfällt; dass eine Präferenz kein Exemplar ist, ist eine Eigenschaft der
Datenhaltung und braucht keine eigene Überschrift.

**Der Leerzustand bleibt erhalten**, in der Form aus Abschnitt 11 der Hauptspec („die Leere erklären
statt kaschieren").

---

## 9. Hybrid-Rigs

Ein Rig aus echtem Amp und virtueller Box braucht **keine Modelländerung**. Die Signalkette bildet es ab:

```
Randall Satan 120  →  Two Notes Torpedo Reload  →  Neural DSP Fortin NTS Suite
     (amp)                  (loadbox)                       (plugin)
```

Die Position in der Kette sagt bereits, dass die NTS-Suite hier als Box arbeitet. Dass der Besitzer von
einem vollständigen Amp-Sim nur die Cabinet-Sektion nutzt, ist **Verwendung, keine Produkteigenschaft**
— das gehört in die Notizen am Exemplar, nicht in den Katalog. Ein eigenes Feld „virtuelles Cabinet" oder
ein Sonderfall im Datenmodell entsteht nicht.

---

## 10. Der konkrete Katalogzuwachs

**Neue Marken:** Randall, Fortin, Edwards.

| Marke | Eintrag | Kategorie | Seltenheit |
|---|---|---|---|
| LTD | Alexi-600 | `guitar` | `special` |
| Edwards | Alexi Arrowhead | `guitar` | `rare` |
| Schecter | Blackjack ATX | `guitar` | `special` |
| Schecter | └ Blackjack ATX C-1 | `guitar` | `common` |
| Schecter | └ Blackjack ATX C-8 | `guitar` | `rare` |
| EMG | HZ-H2 | `pickup` | `common` |
| Seymour Duncan | Nazgul | `pickup` | `common` |
| Seymour Duncan | └ Nazgul 7 | `pickup` | `special` |
| Seymour Duncan | └ Nazgul 8 | `pickup` | `special` |
| EMG | ABQ | `preamp` | `special` |
| ESP | MM-04 | `preamp` | `rare` |
| Randall | Satan 120 | `amp` | `special` |
| Fortin | Grind | `pedal` | `special` |
| Fortin | Zuul+ | `pedal` | `common` |
| Fortin | Natas Distortion | `pedal` | `common` |
| Two Notes | Torpedo Reload | `loadbox` | `special` |
| Neural DSP | Fortin NTS Suite | `plugin` | `special` |
| D'Addario | EXL140 (10-52) | `strings` | `mass` |
| D'Addario | NYXL0980 (9-80) | `strings` | `special` |

**Zwei Einträge nutzen die Zweistufigkeit**, weil dort die Seltenheit tatsächlich spreizt: eine Blackjack
ATX C-1 ist verbreitet, die achtsaitige C-8 nicht — dasselbe bei Nazgul. Das ist genau die Bedingung aus
dem Kopf der Katalogdatei: *„A variant exists ONLY where the rarity genuinely spreads inside a line."*
Die jeweils verbreitete Ausführung wird mit angelegt, damit die Spreizung real ist und nicht behauptet.

**Zur Seltenheit von Fortin:** Grind, Zuul+ und Natas stammen von einem Boutique-Hersteller, sind aber
nicht gleich selten. Der Zuul steht auf halben Metal-Boards, das Natas-Pedal ist verbreiteter, als sein
Preis vermuten lässt. Das folgt dem Maßstab aus der Katalogdatei: *„Price and prestige are NOT the
scale."* Seltenheit misst, wie überraschend ein gemeinsamer Besitz wäre — nicht, wie exklusiv die Marke
ist.

**Was nicht in den Katalog kommt:** „white sawtooth", „second iteration" und „Vampire Red Satin" sind
Ausführung und Generation einzelner Exemplare. Sie gehören in `finish` beziehungsweise `year` am
Exemplar. Andernfalls entstehen genau die Doppeleinträge, gegen die Abschnitt 4.1 der Hauptspec gebaut
ist.

---

## 11. Tests

- **Katalog-Seed:** Die drei neuen Kategorien existieren und sind nicht `is_consumable`. Die fünf
  namentlich genannten Umzügler liegen in ihrer neuen Kategorie — geprüft an den fünf Einträgen einzeln,
  nicht über ein „`preamp` enthält nichts Digitales mehr", das auch auf leerer Tabelle bestünde.
- **Umbenennung:** Nach der Migration tragen die drei Saitensätze ihren neuen Namen, **behalten ihre ID**
  und ihre Präferenzen zeigen unverändert auf sie. Dieser Test muss fehlschlagen, wenn jemand die
  Umbenennung doch über den Seed löst — er prüft die ID, nicht nur den Namen.
- **Suche:** „ESP Alexi" findet die Edwards. „10-52" findet den EXL140.
- **Rig-Eingabe:** Ein gewähltes Verbrauchsmaterial landet als Präferenz, ein Gerät als Exemplar mit
  Formular. Beide Pfade werden an der geschriebenen Nutzlast geprüft, nicht am bloßen Aufruf.
- **Gruppierung:** Leere Kategorien erscheinen nicht; die vorhandenen stehen in `sort_order`-Reihenfolge.

Für jeden dieser Tests gilt die Frage aus CLAUDE.md: **kann er überhaupt fehlschlagen?**

---

## 12. Offene Punkte

- **Der Katalog bleibt dünn für Nischen-Setups.** Diese Spec füllt ein einziges reales Rig auf. Der
  nächste Nutzer mit eigenem Geschmack trifft dasselbe Loch. Das eigentliche Gegenmittel — ein
  Katalog-Backoffice mit Prüfung der von Nutzern angelegten Einträge — steht weiter in Abschnitt 15 der
  Hauptspec.
- **Selbst angelegte Einträge landen auf `rarity_base = 'common'`** (Default der Tabelle). Wer ein
  Nischengerät selbst einträgt, bekommt „verbreitet" angehängt — ausgerechnet dort, wo Seltenheit am
  wahrscheinlichsten ist. Diese Spec ändert das nicht, benennt es aber als bekannten Fehlanreiz. Solange
  es kein Backoffice gibt, ist die einzige Korrektur der kuratierte Seed.
- **Die Domänengrenze wird wieder unter Druck geraten.** Mikrofone, Monitore und Kopfhörer sind die
  nächsten Kandidaten. Abschnitt 3 gibt dafür ein Kriterium statt einer Aufzählung — das ist der
  eigentliche Beitrag dieser Spec.
