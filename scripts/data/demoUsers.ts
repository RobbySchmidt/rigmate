// Zwanzig erfundene Musiker. Ohne sie ist die Empfehlung nicht vorfuehrbar --
// eine Plattform, die man niemandem zeigen kann, ist kein Prototyp.
//
// Die Streuung der Seltenheit ist hier das eigentliche Datum, nicht der
// Geschmack. Besaesse jeder Demo-Nutzer Boutique-Kram, verbaende sich jeder
// stark mit jedem und die Rangfolge waere flach -- die gesamte Gewichtung aus
// Abschnitt 6 der Spec wuerde unsichtbar. Deshalb kommt der Loewenanteil aus
// `mass` und `common`, `special` streut vereinzelt, und `rare` taucht
// absichtlich nur in wenigen Rigs auf (Klon Centaur in dreien, White Falcon in
// einem). Der Test "laesst seltene Geraete selten sein" haelt genau das fest.
//
// Weitere Regeln, die beim Ergaenzen gelten:
//   - Geraete werden ueber den Katalog-Namen aus scripts/data/catalog.ts
//     referenziert, nie ueber eine id. Namen sind dort projektweit eindeutig.
//   - Rigs bleiben plausibel: wer Bass spielt, hat keinen Tube Screamer in
//     einer Strat verbaut.
//   - Ein bis zwei tiefe Eintraege je Nutzer (Ausfuehrung plus Baujahr, Farbe,
//     Modifikation), der Rest grob -- genau die gestaffelte Tiefe aus
//     Abschnitt 6: alles ausser dem Katalog-Eintrag ist freiwillig.
//   - Verbrauchsmaterial hat jeder, damit es als schwaches Signal sichtbar
//     wird (KIND_WEIGHTS.consumable = 0.3 in server/utils/scoring.ts).
//   - `installedIn` zeigt auf ein anderes Geraet DESSELBEN Nutzers, und der
//     Zielname muss innerhalb des Rigs eindeutig sein: scripts/seed-users.ts
//     loest ihn ueber eine Map von Katalog-Name auf gear_items.id auf.

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
    // Fix Runde 1: hier stand "Jazz Swing" -- die Thomastik-Infeld-Flatwounds
    // sind ein GITARREN-Satz, und Tamara ist Bassistin. Die Kategorie
    // `strings` trennt Gitarre und Bass nicht, es haette also nichts
    // dagegengehalten; falsch ist es trotzdem, und diese Daten werden
    // Gitarristen gezeigt. "Swing Bass 66" ist der einzige eindeutige
    // Bass-Satz im Katalog (siehe Bericht zu Task 18, Fix Runde 1).
    preferences: ['Swing Bass 66'],
    wishlist: ['4003', 'Thunderbird'],
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

  // Ab hier die Auffuellung auf zwanzig. Bewusst viel Massenware: Garagen-,
  // Coverband- und Proberaum-Rigs sind der Normalfall, an dem sich die
  // wenigen Raritaeten ueberhaupt erst abheben.
  {
    displayName: 'Garagen-Gitti',
    bio: 'Erste Band, erster Verstärker, erste Beschwerde vom Vermieter.',
    bands: ['Nasse Socken'],
    gear: [
      { item: 'Bullet Stratocaster', year: 2022, finish: 'Black' },
      { item: 'Champion' },
      { item: 'DS-1 Distortion' },
      { item: 'Cry Baby' },
    ],
    preferences: ['Super Slinky', '351 Shape'],
    wishlist: ['Hot Rod Deluxe'],
  },
  {
    displayName: 'Bühnenkante Björn',
    bio: 'Vierzig Hochzeiten im Jahr. Das Zeug muss funktionieren, nicht klingen wie 1965.',
    bands: ['Tanzpalast'],
    gear: [
      { item: 'Player Telecaster', year: 2020 },
      { item: 'Hot Rod Deluxe' },
      { item: 'SD-1 Super Overdrive' },
      { item: 'TU-3 Tuner' },
    ],
    preferences: ['Regular Slinky', 'Tortex'],
    wishlist: ['American Professional II Telecaster'],
  },
  {
    displayName: 'Doppelhals Dörte',
    bio: 'Riffs aus den Siebzigern, Nachbarn aus den Neunzigern.',
    bands: ['Bleifuß'],
    gear: [
      { item: 'SG Standard', year: 2016, finish: 'Cherry' },
      { item: 'DSL40' },
      { item: 'Big Muff Pi' },
      { item: 'Phase 90' },
    ],
    preferences: ['EXL110', 'Nylon Standard'],
    wishlist: ['Les Paul Custom'],
  },
  {
    displayName: 'Nachtschicht-Nico',
    bio: 'Tagsüber Lager, nachts Downtuning.',
    bands: ['Schichtwechsel'],
    gear: [
      { item: 'RG', year: 2018, modifications: 'Tonabnehmer getauscht, Sattel neu gefeilt' },
      { item: '5150III' },
      { item: 'Rectifier 4x12' },
      { item: '81', installedIn: 'RG' },
    ],
    preferences: ['EXL120', 'Jazz III'],
    wishlist: ['E-II Eclipse'],
  },
  {
    displayName: 'Fingerkuppen-Frauke',
    bio: 'Schreibt Lieder am Küchentisch und nimmt sie mit einem Mikro auf.',
    gear: [
      { item: 'D-28', year: 2011 },
      { item: 'GS Mini' },
      { item: 'Hummingbird' },
      { item: 'SM57' },
    ],
    preferences: ['Nanoweb', 'Primetone'],
    wishlist: ['814ce'],
  },
  {
    displayName: 'Tremolo-Timo',
    bio: 'Hall bis zum Anschlag, dann noch ein bisschen mehr.',
    bands: ['Die Brandung'],
    gear: [
      { item: 'Jaguar', year: 2015, finish: 'Sonic Blue' },
      { item: 'Twin Reverb' },
      { item: 'Fuzz Face Mini' },
      { item: 'Flint' },
    ],
    preferences: ['Power Slinky', 'Tortex'],
    wishlist: ['American Vintage II Jazzmaster'],
  },
  {
    displayName: 'Kabelsalat-Kevin',
    bio: 'Das Board ist größer als der Verstärker. Das ist kein Problem, das ist ein Merkmal.',
    bands: ['Die Reverbs'],
    gear: [
      { item: 'American Professional II Stratocaster', year: 2018, finish: 'Olympic White' },
      { item: 'Princeton Reverb' },
      { item: 'Centaur' },
      { item: 'Timeline' },
      { item: 'Tumnus' },
    ],
    preferences: ['Regular Slinky', 'Tortex'],
    wishlist: ['King of Tone', 'Mood'],
  },
  {
    displayName: 'Feedback-Ferdi',
    bio: 'Lautstärke ersetzt Übung. Behauptet er.',
    gear: [
      { item: 'Les Paul Standard 60s' },
      { item: 'MG' },
      { item: 'MT-2 Metal Zone' },
    ],
    preferences: ['Super Slinky', 'Ultex'],
    wishlist: ['SG Standard'],
  },
  {
    displayName: 'Tieftöner Tobi',
    bio: 'Vier Saiten reichen. Fünf sind Angeberei.',
    bands: ['Schichtwechsel'],
    gear: [
      { item: 'Affinity Jazz Bass', year: 2019 },
      { item: 'SVT' },
      { item: 'SVT-810E' },
    ],
    preferences: ['Swing Bass 66', 'Nylon Standard'],
    wishlist: ['StingRay'],
  },
  {
    displayName: 'Zwischenton Zora',
    bio: 'Spielt Akkorde, die noch niemand benannt hat.',
    bands: ['Trio Nachtcafé'],
    gear: [
      { item: 'ES-335', year: 2013, finish: 'Vintage Sunburst' },
      { item: 'Princeton Reverb' },
      { item: 'EP Booster' },
      { item: 'Antiquity', installedIn: 'ES-335' },
    ],
    preferences: ['Jazz Swing', 'Jazz III'],
    wishlist: ['Casino'],
  },
  {
    displayName: 'Digital-Dennis',
    bio: 'Der ganze Proberaum passt in einen Rucksack.',
    gear: [
      { item: 'Pacifica' },
      { item: 'Helix', year: 2021 },
      { item: 'Katana' },
      { item: 'Torpedo Captor X' },
    ],
    preferences: ['Regular Slinky', 'Tortex'],
    wishlist: ['Quad Cortex'],
  },
  {
    displayName: 'Wohnzimmer-Wanda',
    bio: 'Spielt leise, aber jeden Tag.',
    gear: [
      { item: 'Player Stratocaster', year: 2020, finish: 'Sunburst' },
      { item: 'Blues Junior' },
      { item: 'BD-2 Blues Driver' },
      { item: 'Hall of Fame' },
    ],
    preferences: ['Regular Slinky', '351 Shape'],
    wishlist: ['Deluxe Reverb Reissue'],
  },
  {
    displayName: 'Röhrenglut Rüdiger',
    bio: 'Alles vor 1975 war besser, alles danach ist Zubehör.',
    bands: ['Tanzpalast'],
    gear: [
      { item: 'White Falcon', year: 1997, finish: 'White', modifications: 'Bigsby nachgerüstet' },
      { item: 'JTM45' },
      { item: '1960B' },
      { item: 'CE-2 Chorus' },
    ],
    preferences: ['EXL110', 'Nylon Standard'],
    wishlist: ['Plexi'],
  },
  {
    displayName: 'Bundstäbchen-Bea',
    bio: 'Übt Skalen, während andere über Kabel streiten.',
    gear: [
      { item: 'SE Custom 24', year: 2017 },
      { item: 'Tiny Terror' },
      { item: 'PPC212' },
      { item: 'Plumes' },
    ],
    preferences: ['NYXL1046', 'Tortex'],
    wishlist: ['Core Custom 24'],
  },
  {
    displayName: 'Sperrmüll-Sven',
    bio: 'Alles vom Flohmarkt, nichts unter zweihundert Euro.',
    bands: ['Nasse Socken'],
    gear: [
      { item: 'Affinity Telecaster' },
      { item: 'Crush' },
      { item: 'G1 Four' },
      { item: 'Straplok' },
    ],
    preferences: ['Super Slinky', 'Tortex'],
    wishlist: ['Player Telecaster'],
  },
]
