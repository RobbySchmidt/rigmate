export const de = {
  app: {
    name: 'Rigmate',
    tagline: 'Finde Leute über ihr Equipment.',
  },
  // Die Seltenheitsstufen aus dem Postgres-Enum rarity_base. Stehen hier
  // ganz oben, weil sie an mehreren Stellen sichtbar sind - Gear-Seite und
  // Profil-Panel. Vorher gab es sie doppelt und mit verschiedenen Woertern.
  rarity: {
    mass: 'Massenware',
    common: 'verbreitet',
    special: 'speziell',
    rare: 'rar',
  },
  nav: {
    home: 'Start',
    rig: 'Mein Rig',
    profile: 'Mein Profil',
    search: 'Suche',
    settings: 'Einstellungen',
    login: 'Anmelden',
    logout: 'Abmelden',
    register: 'Konto anlegen',
  },
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
  auth: {
    loginTitle: 'Anmelden',
    registerTitle: 'Konto anlegen',
    email: 'E-Mail',
    password: 'Passwort',
    displayName: 'Anzeigename',
    displayNameHint: 'Ein Künstlername reicht völlig. Mehr braucht es nicht.',
    submitLogin: 'Anmelden',
    submitRegister: 'Konto anlegen',
    toRegister: 'Noch kein Konto? Hier anlegen.',
    toLogin: 'Schon ein Konto? Hier anmelden.',
    confirmSent:
      'Wir haben dir eine E-Mail geschickt. Klick den Link darin, dann geht es weiter.',
    confirmSentLoginHint: 'Schon registriert? Dann einfach anmelden.',
    confirmTitle: 'Konto bestätigt',
    confirmBody: 'Alles klar. Jetzt fehlt nur noch dein Equipment.',
    confirmCta: 'Rig eintragen',
    errorGeneric: 'Das hat nicht geklappt. Versuch es noch einmal.',
    errorInvalidCredentials: 'E-Mail oder Passwort stimmt nicht.',
  },
  picker: {
    placeholder: 'Marke oder Modell tippen …',
    levelLine: 'Modell-Linie',
    levelVariant: 'Ausführung',
    unverified: 'ungeprüft',
    noResults: 'Nichts gefunden.',
    createHint: 'Nicht dabei? Neu anlegen',
    createBrand: 'Marke',
    createName: 'Modell',
    createCategory: 'Kategorie',
    createSubmit: 'Anlegen',
    createYearError: 'Das Baujahr gehört ins Exemplar, nicht in den Modellnamen.',
    createDuplicateError: 'Der Eintrag existiert schon im Katalog.',
    createGenericError: 'Das hat nicht geklappt. Versuch es noch einmal.',
    searchError: 'Suche gerade nicht möglich. Versuch es gleich noch einmal.',
  },
  precisionHint: {
    // Nie ein Pflichtfeld - nur ein Hinweis nach der Auswahl.
    text: 'Von diesem Modell gibt es sehr unterschiedliche Ausführungen. Wenn du deine kennst, wird dein Treffer deutlich schärfer.',
    dismiss: 'Passt so',
  },
  rig: {
    title: 'Mein Rig',
    gear: 'Equipment',
    preferences: 'Saiten und Plektren',
    wishlist: 'Wunschliste',
    addGear: 'Equipment hinzufügen',
    addPreference: 'Saiten oder Plektrum hinzufügen',
    addWish: 'Auf die Wunschliste',
    empty: 'Hier ist noch nichts. Trag dein erstes Gerät ein.',
    // Eigene Leer-Texte fuer Praeferenzen und Wunschliste statt einer leeren
    // umrandeten Liste ohne jeden Hinweis (Fix-Runde Abschluss).
    emptyPreferences: 'Hier ist noch nichts. Trag deine ersten Saiten oder dein Plektrum ein.',
    emptyWishlist: 'Hier steht noch nichts auf der Wunschliste.',
    remove: 'Entfernen',
    save: 'Speichern',
    cancel: 'Abbrechen',
    errorGeneric: 'Das hat nicht geklappt. Versuch es noch einmal.',
    errorConsumableAsGear:
      'Das ist Verbrauchsmaterial. Trag es weiter unten bei „Saiten und Plektren" ein statt hier als Equipment.',
    // Eigener Text statt eines stillen leeren Abschnitts - ein Fehlschlag
    // beim Laden von Equipment, Praeferenzen oder Wunschliste soll nicht wie
    // "du hast noch nichts eingetragen" aussehen (Fix-Runde Abschluss).
    loadError: 'Das konnte gerade nicht geladen werden. Versuch es noch einmal.',
  },
  gearForm: {
    optionalHint: 'Alles hier ist freiwillig. Je genauer, desto besser die Treffer.',
    year: 'Baujahr',
    finish: 'Farbe oder Ausführung',
    modifications: 'Modifikationen',
    notes: 'Notizen',
    installedIn: 'Verbaut in',
    installedInNone: 'Nicht verbaut',
  },
  onboarding: {
    title: 'Was spielst du?',
    intro:
      'Trag ein, was du hast. Ein Modellname reicht — „Fender Stratocaster" ist ein vollständiger Eintrag. Genauer geht immer, muss aber nicht.',
    addedOne: 'Ein Gerät eingetragen.',
    addedMany: 'Geräte eingetragen: {count}',
    keepGoing: 'Noch eins?',
    done: 'Fertig, zeig mir Leute',
    skip: 'Später',
    errorGeneric: 'Das hat nicht geklappt. Versuch es noch einmal.',
    errorConsumableAsGear:
      'Das ist Verbrauchsmaterial. Saiten und Plektren trägst du später in deinem Rig ein.',
  },
  suggestions: {
    title: 'Leute, die dasselbe spielen',
    reasonKind: {
      gear: 'Spielt auch',
      consumable: 'Benutzt auch',
      wish: 'Hat, was du suchst',
    },
    reasonDepth: {
      line: '',
      variant: 'genau diese Ausführung',
      variant_year: 'diese Ausführung, sogar aus demselben Baujahr',
    },
    reasonMore: 'und weitere Übereinstimmungen: {count}',
    emptyTitle: 'Hier ist noch nichts.',
    // Die Leere erklaeren statt kaschieren.
    emptyBody:
      'Du siehst gerade Zufälliges. Trag dein Equipment ein, dann stehen hier Leute, die dasselbe spielen.',
    emptyCta: 'Equipment eintragen',
    fallbackBadge: 'Zufällig ausgewählt',
    refineHint:
      'Je vollständiger dein Rig, desto genauer diese Vorschläge. Seltene Geräte zählen mehr als verbreitete.',
    // Ein fehlgeschlagener Request sah bisher wie "keine Vorschlaege" oder
    // wie "echte Treffer, aber gerade keine da" aus - beides falsch
    // (Fix-Runde Abschluss).
    loadError: 'Vorschläge gerade nicht ladbar. Versuch es gleich noch einmal.',
  },
  gearPage: {
    players: 'Wer spielt das',
    playersCount: 'Spieler: {count}',
    wishCount: 'Auf Wunschlisten: {count}',
    variants: 'Ausführungen',
    partOf: 'Gehört zu',
    unverified: 'Dieser Eintrag wurde von einem Nutzer angelegt und ist noch ungeprüft.',
    signInToSeePlayers: 'Melde dich an, um zu sehen, wer das spielt.',
    noPlayers: 'Hier hat es noch niemand eingetragen.',
    // Diese Seite ist laut Abschnitt 10 oeffentlich und suchmaschinen-
    // auffindbar - ein Fehlschlag oder ein echtes 404 muessen sich sowohl im
    // Text als auch im <title> vom Erfolgsfall unterscheiden, statt als
    // leere Seite mit "undefined undefined" durchzugehen (Fix-Runde
    // Abschluss).
    notFound: 'Dieser Eintrag existiert nicht.',
    notFoundTitle: 'Nicht gefunden',
    loadError: 'Das konnte gerade nicht geladen werden. Versuch es noch einmal.',
    loadErrorTitle: 'Fehler beim Laden',
  },
  search: {
    title: 'Suche',
    placeholder: 'Gerät, Marke oder Name — „Wer hat hier einen AC30?" geht auch',
    gearHeading: 'Equipment',
    peopleHeading: 'Leute',
    peopleLoginHint: 'Melde dich an, um auch Leute zu finden.',
    noResults: 'Nichts gefunden.',
    searchError: 'Suche gerade nicht möglich. Versuch es gleich noch einmal.',
  },
  profile: {
    rig: 'Rig',
    wishlist: 'Sucht',
    preferences: 'Saiten und Plektren',
    bands: 'Bands',
    links: 'Links',
    emptyRig: 'Hier steht noch kein Equipment.',
    ownProfile: 'Das bist du.',
    editCta: 'Profil bearbeiten',
    notFound: 'Dieses Profil gibt es nicht.',
    // Eigener Text statt eines stillen leeren Abschnitts - ein Fehlschlag
    // beim Laden von Profil, Rig, Praeferenzen oder Wunschliste soll nicht
    // wie ein legitim leerer Bereich aussehen.
    loadError: 'Das konnte gerade nicht geladen werden. Versuch es noch einmal.',

    // Kennzahlen im Kopf
    statDevices: 'Geräte',
    statRarities: 'Raritäten',
    statSpecials: 'Besonderheiten',
    statMates: 'Rig-Kollegen',
    statMatesError: 'Anzahl der Rig-Kollegen konnte nicht geladen werden',

    // Aktionen, bis Stufe 2 deaktiviert
    follow: 'Folgen',
    message: 'Nachricht',
    stageTwoHint: 'Kommt in der nächsten Ausbaustufe',

    // Reiter im linken Panel
    tabEquipment: 'Equipment',
    tabChain: 'Signal Chain',
    tabsLabel: 'Ansicht des Equipments',

    // Signalkette
    chainEmptyOwn: 'Keine Signal Chain angelegt',
    chainEmptyOwnHint:
      'Trag ein, in welcher Reihenfolge dein Signal durch die Geräte läuft.',
    chainEmptyDrop: 'Zieh ein Gerät hierher, um anzufangen',
    chainOutsideTitle: 'Nicht in der Kette',
    chainOutsideHint: 'Saiten, Plektren und Zubehör stehen unter Equipment.',
    chainEdit: 'Kette bearbeiten',
    chainDone: 'Fertig',
    chainPoolTitle: 'Geräte hinzufügen',
    chainPoolHint:
      'Nach links ziehen, um eine Station anzuhängen. Was hier stehen bleibt, taucht weiterhin unter Equipment auf.',
    chainPoolEmpty: 'Alle Geräte stehen in der Kette.',
    chainAppend: 'Anhängen',
    chainMoveUp: 'Nach oben',
    chainMoveDown: 'Nach unten',
    chainRemove: 'Aus der Kette nehmen',
    chainDragHandle: 'Zum Umsortieren ziehen',
    chainSaving: 'Wird gespeichert',
    chainSaved: 'Reihenfolge gespeichert',
    // Sammeltext fuer alles, was ein Nutzer nicht selbst ausloesen kann
    // (RG002/RG003/RG004 aus set_chain_order). Rohe Postgres-Meldungen
    // gehoeren nie auf den Schirm.
    chainSaveError: 'Reihenfolge konnte nicht gespeichert werden',
    // Zwei der fuenf SQLSTATEs verlangen etwas anderes vom Nutzer als
    // "nochmal probieren" - deshalb ein eigener Satz je Fall.
    chainSaveErrorSession: 'Du bist nicht mehr angemeldet. Melde dich neu an.',
    chainSaveErrorStale: 'Dein Rig hat sich geändert. Lad die Seite neu.',
    chainRetry: 'Erneut versuchen',
    chainRemovedHint: 'Aus der Kette genommen, bleibt im Rig.',

    // Feed
    feedTitle: 'Verlauf',
    feedEmpty: 'Noch nichts passiert.',
    feedError: 'Der Verlauf konnte nicht geladen werden',
    feedEventLabel: 'Rig-Ereignis',
    feedAddedOne: 'hat ein Gerät ins Rig geholt',
    feedAddedMany: 'hat Geräte ins Rig geholt',
    feedRareTitle: 'Selten',
    // Sagt bewusst nichts darueber, wie viele andere das Geraet spielen -
    // das weiss der Feed gar nicht. hasRarity kommt aus der Katalogstufe
    // rarity_base, nicht aus einer Zaehlung der Besitzer. Der frueherre Text
    // ("Niemand sonst hier spielt das.") war eine Behauptung ueber andere
    // Nutzer, die aus den Daten nicht folgt.
    feedRareHint: 'Seltenes Equipment bringt dich mit weniger, aber passenderen Leuten zusammen.',
  },
  settings: {
    title: 'Einstellungen',
    displayName: 'Anzeigename',
    displayNameHint: 'Das Einzige, was wir brauchen.',
    realName: 'Echter Name',
    bio: 'Über dich',
    bands: 'Bands, kommagetrennt',
    links: 'Links, einer pro Zeile',
    avatar: 'Foto',
    save: 'Speichern',
    saved: 'Gespeichert.',
    optionalHint: 'Alles außer dem Anzeigenamen ist freiwillig. Ort fragen wir bewusst nicht ab.',
    loadError: 'Dein Profil konnte gerade nicht geladen werden. Versuch es noch einmal.',
    saveError: 'Das Speichern hat nicht geklappt. Versuch es noch einmal.',
    // {value} statt eines generischen Textes - wer falsch abgetippt hat,
    // soll sofort sehen, welche Zeile gemeint ist.
    linkInvalid: 'Das ist keine gültige Adresse und wird nicht gespeichert: {value}',
    linksTooMany: 'Nicht mehr als 20 Links auf einmal — bitte die Liste kürzen.',
    avatarError: 'Das Hochladen hat nicht geklappt. Versuch es noch einmal.',
  },
} as const
