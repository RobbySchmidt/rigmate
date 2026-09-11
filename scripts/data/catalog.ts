// The curated seed catalog.
//
// Two levels only: model line -> variant. A variant exists ONLY where the
// rarity genuinely spreads inside a line (Stratocaster: Squier-adjacent up to
// Custom Shop, so yes; Boss DS-1: a DS-1 is a DS-1, so no). That same spread
// is what later makes the checker ask the user for more precision, so it is a
// real signal and not decoration.
//
// The brand is always a separate field, and neither the year of manufacture
// nor a modification ever belongs in a name -- otherwise "Stratocaster 1963"
// and "63er Strat" become two catalog entries and the overlap that the whole
// recommendation engine runs on falls apart. Names are unique across the
// WHOLE file, not just per brand: the lookup on the consuming side is keyed
// by name, so a second "Les Paul Standard" would silently resolve to whichever
// row was read last.
//
// About `rarity`: with roughly 20 demo users the measured rarity (how many
// people own a thing) is statistically meaningless -- everything looks scarce.
// This hand-set base value therefore carries the entire recommendation engine
// on its own. The ONLY question to ask for every entry is "how surprising is
// it that two random guitarists both own this":
//   mass    -- stands in every rehearsal room
//   common  -- widespread, but not universal
//   special -- boutique, reissue, a deliberate choice
//   rare    -- genuinely scarce
//
// Price and prestige are NOT the scale. A Harley Benton cabinet is `mass`
// because everyone has one, an SVT fridge is `common` because it is the
// default backline, and a cheap-but-niche Danelectro stays `special` because
// hardly anyone owns one. Marking a Boss DS-1 as `rare` would rank the wrong
// people together. Rarity is a property of the item, never of its brand:
// "all Strymon is special" is a brand judgement, not a scarcity judgement.

// Re-Export statt eigener Definition: `scripts/` laeuft standalone ueber
// tsx, ausserhalb der Nuxt-Build-Pipeline, deshalb ein relativer Pfad statt
// des #shared-Alias. Einzige Quelle bleibt shared/utils/rarityBase.ts.
// tests/db/catalogSeed.test.ts importiert RarityBase weiterhin von hier.
import type { RarityBase } from '../../shared/utils/rarityBase'
export type { RarityBase }

export interface SeedVariant {
  name: string
  synonyms?: string[]
  rarity: RarityBase
}

export interface SeedLine {
  brand: string
  name: string
  category: string
  synonyms?: string[]
  rarity: RarityBase
  variants?: SeedVariant[]
}

export const CATALOG: SeedLine[] = [
  // ---- Guitars ----
  {
    brand: 'Fender',
    name: 'Stratocaster',
    category: 'guitar',
    synonyms: ['strat', 'stratocaster'],
    rarity: 'mass',
    variants: [
      { name: 'American Professional II Stratocaster', synonyms: ['am pro ii strat'], rarity: 'common' },
      { name: 'Player Stratocaster', synonyms: ['player strat'], rarity: 'mass' },
      { name: 'American Vintage II Stratocaster', synonyms: ['av ii strat'], rarity: 'special' },
      { name: 'Custom Shop Stratocaster', synonyms: ['cs strat'], rarity: 'rare' },
    ],
  },
  {
    brand: 'Fender',
    name: 'Telecaster',
    category: 'guitar',
    synonyms: ['tele', 'telecaster'],
    rarity: 'mass',
    variants: [
      { name: 'American Professional II Telecaster', synonyms: ['am pro ii tele'], rarity: 'common' },
      { name: 'Player Telecaster', synonyms: ['player tele'], rarity: 'mass' },
      { name: 'Custom Shop Telecaster', synonyms: ['cs tele'], rarity: 'rare' },
    ],
  },
  {
    brand: 'Fender',
    name: 'Jazzmaster',
    category: 'guitar',
    synonyms: ['jazzmaster', 'jm'],
    rarity: 'common',
    variants: [
      { name: 'American Vintage II Jazzmaster', synonyms: ['av ii jazzmaster', 'av ii jm'], rarity: 'special' },
      { name: 'Player Jazzmaster', synonyms: ['player jazzmaster', 'player jm'], rarity: 'common' },
    ],
  },
  {
    brand: 'Fender',
    name: 'Jaguar',
    category: 'guitar',
    synonyms: ['jag', 'jaguar'],
    rarity: 'common',
  },
  {
    brand: 'Fender',
    name: 'Mustang',
    category: 'guitar',
    synonyms: ['mustang'],
    rarity: 'common',
  },
  {
    // A short-scale student model that Fender has kept in the cheap Player
    // series for years -- widespread, not a collector's decision.
    brand: 'Fender',
    name: 'Duo-Sonic',
    category: 'guitar',
    synonyms: ['duo sonic', 'duosonic'],
    rarity: 'common',
  },
  {
    brand: 'Gibson',
    name: 'Les Paul',
    category: 'guitar',
    synonyms: ['lp', 'les paul', 'paula'],
    rarity: 'mass',
    variants: [
      { name: 'Les Paul Standard', synonyms: ['lp standard'], rarity: 'common' },
      { name: 'Les Paul Custom', synonyms: ['lp custom'], rarity: 'special' },
      { name: 'Les Paul Junior', synonyms: ['lp junior', 'lp jr'], rarity: 'special' },
    ],
  },
  {
    brand: 'Gibson',
    name: 'SG',
    category: 'guitar',
    synonyms: ['sg'],
    rarity: 'common',
    variants: [
      { name: 'SG Standard', synonyms: ['sg standard'], rarity: 'common' },
      { name: 'SG Junior', synonyms: ['sg junior', 'sg jr'], rarity: 'special' },
    ],
  },
  {
    brand: 'Gibson',
    name: 'ES-335',
    category: 'guitar',
    synonyms: ['es335', '335'],
    rarity: 'common',
  },
  {
    brand: 'Gibson',
    name: 'Explorer',
    category: 'guitar',
    synonyms: ['explorer'],
    rarity: 'common',
  },
  {
    brand: 'Gibson',
    name: 'Flying V',
    category: 'guitar',
    synonyms: ['flying v', 'v'],
    rarity: 'common',
  },
  {
    brand: 'Gibson',
    name: 'J-45',
    category: 'guitar',
    synonyms: ['j45', 'j 45'],
    rarity: 'common',
  },
  {
    brand: 'Gibson',
    name: 'Hummingbird',
    category: 'guitar',
    synonyms: ['hummingbird'],
    rarity: 'special',
  },
  {
    // Named "60s" because a bare "Les Paul Standard" already exists as a
    // Gibson variant and the lookup on the consuming side is keyed by name.
    brand: 'Epiphone',
    name: 'Les Paul Standard 60s',
    category: 'guitar',
    synonyms: ['epi lp', 'epiphone les paul', 'les paul standard 60s'],
    rarity: 'mass',
  },
  {
    brand: 'Epiphone',
    name: 'Casino',
    category: 'guitar',
    synonyms: ['casino'],
    rarity: 'common',
  },
  {
    brand: 'Epiphone',
    name: 'Sheraton',
    category: 'guitar',
    synonyms: ['sheraton', 'sheraton ii'],
    rarity: 'common',
  },
  {
    brand: 'Squier',
    name: 'Bullet Stratocaster',
    category: 'guitar',
    synonyms: ['bullet strat', 'squier strat'],
    rarity: 'mass',
  },
  {
    brand: 'Squier',
    name: 'Affinity Telecaster',
    category: 'guitar',
    synonyms: ['affinity tele', 'squier tele'],
    rarity: 'mass',
  },
  {
    brand: 'Squier',
    name: 'Classic Vibe Stratocaster',
    category: 'guitar',
    synonyms: ['classic vibe strat', 'cv strat'],
    rarity: 'common',
  },
  {
    brand: 'Ibanez',
    name: 'RG',
    category: 'guitar',
    synonyms: ['rg'],
    rarity: 'mass',
  },
  {
    brand: 'Ibanez',
    name: 'AZ',
    category: 'guitar',
    synonyms: ['az'],
    rarity: 'common',
  },
  {
    // A production signature model that has sold in the tens of thousands
    // since 1987 -- expensive, but not scarce.
    brand: 'Ibanez',
    name: 'JEM',
    category: 'guitar',
    synonyms: ['jem', 'vai'],
    rarity: 'special',
  },
  {
    brand: 'Gretsch',
    name: 'White Falcon',
    category: 'guitar',
    synonyms: ['white falcon'],
    rarity: 'rare',
  },
  {
    brand: 'Gretsch',
    name: 'Duo Jet',
    category: 'guitar',
    synonyms: ['duo jet'],
    rarity: 'special',
  },
  {
    brand: 'Gretsch',
    name: 'Electromatic Jet',
    category: 'guitar',
    synonyms: ['electromatic', 'g5230'],
    rarity: 'common',
  },
  {
    brand: 'PRS',
    name: 'Custom 24',
    category: 'guitar',
    synonyms: ['custom 24', 'prs custom'],
    rarity: 'common',
    variants: [
      { name: 'SE Custom 24', synonyms: ['se custom 24', 'prs se'], rarity: 'common' },
      { name: 'Core Custom 24', synonyms: ['core custom 24'], rarity: 'special' },
      { name: 'Private Stock Custom 24', synonyms: ['private stock'], rarity: 'rare' },
    ],
  },
  {
    brand: 'PRS',
    name: 'Silver Sky',
    category: 'guitar',
    synonyms: ['silver sky'],
    rarity: 'common',
  },
  {
    brand: 'PRS',
    name: 'McCarty 594',
    category: 'guitar',
    synonyms: ['594', 'mccarty'],
    rarity: 'special',
  },
  {
    brand: 'Jackson',
    name: 'Soloist',
    category: 'guitar',
    synonyms: ['soloist'],
    rarity: 'common',
    variants: [
      { name: 'JS Series Soloist', synonyms: ['js soloist'], rarity: 'common' },
      { name: 'Pro Series Soloist', synonyms: ['pro soloist'], rarity: 'common' },
      { name: 'USA Soloist', synonyms: ['usa soloist'], rarity: 'special' },
    ],
  },
  {
    brand: 'Jackson',
    name: 'Dinky',
    category: 'guitar',
    synonyms: ['dinky'],
    rarity: 'common',
  },
  {
    // LTD is its own brand row, like Squier under Fender -- so this line
    // covers only the ESP-branded Eclipses, which still span the Japanese
    // E-II and the Original series.
    brand: 'ESP',
    name: 'Eclipse',
    category: 'guitar',
    synonyms: ['eclipse'],
    rarity: 'special',
    variants: [
      { name: 'E-II Eclipse', synonyms: ['eii eclipse', 'e ii eclipse'], rarity: 'special' },
      { name: 'Original Eclipse', synonyms: ['esp original eclipse'], rarity: 'rare' },
    ],
  },
  {
    brand: 'LTD',
    name: 'EC-1000',
    category: 'guitar',
    synonyms: ['ec1000', 'ec 1000', 'ltd ec 1000'],
    rarity: 'common',
  },
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
    brand: 'Music Man',
    name: 'Axis',
    category: 'guitar',
    synonyms: ['axis'],
    rarity: 'special',
  },
  {
    // Cheap, but a genuinely niche shape -- almost nobody owns one.
    brand: 'Danelectro',
    name: 'Longhorn',
    category: 'guitar',
    synonyms: ['longhorn'],
    rarity: 'special',
  },
  {
    brand: 'Rickenbacker',
    name: '330',
    category: 'guitar',
    synonyms: ['rick 330', '330'],
    rarity: 'special',
  },
  {
    brand: 'Rickenbacker',
    name: '360',
    category: 'guitar',
    synonyms: ['rick 360', '360'],
    rarity: 'special',
  },
  {
    brand: 'Yamaha',
    name: 'Pacifica',
    category: 'guitar',
    synonyms: ['pacifica', 'pac112'],
    rarity: 'mass',
  },
  {
    brand: 'Harley Benton',
    name: 'Fusion III',
    category: 'guitar',
    synonyms: ['fusion iii', 'hb fusion'],
    rarity: 'common',
  },
  {
    brand: 'Duesenberg',
    name: 'Starplayer TV',
    category: 'guitar',
    synonyms: ['starplayer', 'starplayer tv'],
    rarity: 'special',
  },
  {
    brand: 'Guild',
    name: 'Starfire',
    category: 'guitar',
    synonyms: ['starfire'],
    rarity: 'special',
  },
  {
    brand: 'Charvel',
    name: 'So-Cal',
    category: 'guitar',
    synonyms: ['so cal', 'socal'],
    rarity: 'common',
  },
  {
    brand: 'Schecter',
    name: 'Hellraiser',
    category: 'guitar',
    synonyms: ['hellraiser'],
    rarity: 'common',
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
      { name: 'Blackjack ATX C-8', synonyms: ['atx c8', 'blackjack c8', 'blackjack 8 string'], rarity: 'rare' },
    ],
  },
  {
    brand: 'Strandberg',
    name: 'Boden',
    category: 'guitar',
    synonyms: ['boden', 'headless'],
    rarity: 'special',
  },
  {
    brand: 'Martin',
    name: 'D-28',
    category: 'guitar',
    synonyms: ['d28', 'd 28'],
    rarity: 'common',
  },
  {
    brand: 'Taylor',
    name: 'GS Mini',
    category: 'guitar',
    synonyms: ['gs mini'],
    rarity: 'mass',
  },
  {
    brand: 'Taylor',
    name: '814ce',
    category: 'guitar',
    synonyms: ['814ce', '814'],
    rarity: 'special',
  },

  // ---- Basses ----
  {
    brand: 'Fender',
    name: 'Precision Bass',
    category: 'bass',
    synonyms: ['p bass', 'precision', 'pbass'],
    rarity: 'mass',
  },
  {
    brand: 'Fender',
    name: 'Jazz Bass',
    category: 'bass',
    synonyms: ['j bass', 'jazzbass', 'jbass'],
    rarity: 'mass',
  },
  {
    brand: 'Fender',
    name: 'Mustang Bass',
    category: 'bass',
    synonyms: ['mustang bass'],
    rarity: 'common',
  },
  {
    brand: 'Fender',
    name: 'Jaguar Bass',
    category: 'bass',
    synonyms: ['jaguar bass'],
    rarity: 'common',
  },
  {
    brand: 'Squier',
    name: 'Affinity Jazz Bass',
    category: 'bass',
    synonyms: ['affinity j bass', 'squier jazz bass'],
    rarity: 'mass',
  },
  {
    brand: 'Squier',
    name: 'Classic Vibe Precision Bass',
    category: 'bass',
    synonyms: ['cv p bass', 'squier p bass'],
    rarity: 'common',
  },
  {
    brand: 'Rickenbacker',
    name: '4003',
    category: 'bass',
    synonyms: ['ricky', 'rick 4003'],
    rarity: 'special',
  },
  {
    brand: 'Music Man',
    name: 'StingRay',
    category: 'bass',
    synonyms: ['stingray', 'ray'],
    rarity: 'common',
  },
  {
    // The spread from the Chinese Ignition up to the German-built original is
    // exactly the case the two-level catalog exists for.
    brand: 'Höfner',
    name: 'Violin Bass',
    category: 'bass',
    synonyms: ['violin bass', 'beatle bass', '500 1'],
    rarity: 'special',
    variants: [
      { name: 'Ignition Violin Bass', synonyms: ['ignition'], rarity: 'common' },
      { name: 'German Professional Violin Bass', synonyms: ['german pro violin bass'], rarity: 'rare' },
    ],
  },
  {
    brand: 'Warwick',
    name: 'Corvette',
    category: 'bass',
    synonyms: ['corvette'],
    rarity: 'common',
  },
  {
    brand: 'Warwick',
    name: 'Thumb Bass',
    category: 'bass',
    synonyms: ['thumb bass', 'thumb'],
    rarity: 'special',
  },
  {
    brand: 'Ibanez',
    name: 'SR',
    category: 'bass',
    synonyms: ['sr', 'soundgear'],
    rarity: 'common',
  },
  {
    brand: 'Gibson',
    name: 'Thunderbird',
    category: 'bass',
    synonyms: ['thunderbird', 't bird'],
    rarity: 'special',
  },
  {
    brand: 'Yamaha',
    name: 'BB',
    category: 'bass',
    synonyms: ['bb', 'bb434'],
    rarity: 'common',
  },
  {
    brand: 'Sandberg',
    name: 'California',
    category: 'bass',
    synonyms: ['california', 'cali'],
    rarity: 'special',
  },
  {
    brand: 'Fodera',
    name: 'Emperor',
    category: 'bass',
    synonyms: ['emperor', 'fodera emperor'],
    rarity: 'rare',
  },
  {
    brand: 'Sire',
    name: 'V7',
    category: 'bass',
    synonyms: ['v7', 'marcus miller v7'],
    rarity: 'common',
  },
  {
    brand: 'Danelectro',
    name: 'Longhorn Bass',
    category: 'bass',
    synonyms: ['longhorn bass'],
    rarity: 'special',
  },

  // ---- Amps ----
  {
    brand: 'Vox',
    name: 'AC30',
    category: 'amp',
    synonyms: ['ac30', 'ac 30'],
    rarity: 'common',
    variants: [
      { name: 'AC30C2', synonyms: ['ac30c2'], rarity: 'common' },
      { name: 'AC30 Hand-Wired', synonyms: ['ac30 hw'], rarity: 'special' },
    ],
  },
  {
    brand: 'Vox',
    name: 'AC15',
    category: 'amp',
    synonyms: ['ac15', 'ac 15'],
    rarity: 'common',
  },
  {
    // The reissue has been in continuous production since 1993 and is what
    // almost everybody means; the Tone Master is a recent, deliberate pick
    // (cheaper, but far fewer of them are out there).
    brand: 'Fender',
    name: 'Deluxe Reverb',
    category: 'amp',
    synonyms: ['deluxe reverb', 'dr'],
    rarity: 'common',
    variants: [
      { name: 'Deluxe Reverb Reissue', synonyms: ['drri'], rarity: 'common' },
      { name: 'Tone Master Deluxe Reverb', synonyms: ['tone master dr'], rarity: 'special' },
    ],
  },
  {
    brand: 'Fender',
    name: 'Twin Reverb',
    category: 'amp',
    synonyms: ['twin reverb', 'twin'],
    rarity: 'common',
  },
  {
    brand: 'Fender',
    name: 'Princeton Reverb',
    category: 'amp',
    synonyms: ['princeton', 'princeton reverb'],
    rarity: 'common',
  },
  {
    brand: 'Fender',
    name: 'Blues Junior',
    category: 'amp',
    synonyms: ['blues jr', 'blues junior'],
    rarity: 'mass',
  },
  {
    brand: 'Fender',
    name: 'Hot Rod Deluxe',
    category: 'amp',
    synonyms: ['hot rod deluxe', 'hrd'],
    rarity: 'mass',
  },
  {
    brand: 'Fender',
    name: 'Bassman',
    category: 'amp',
    synonyms: ['bassman'],
    rarity: 'special',
  },
  {
    // Practice amps are the amps most guitarists actually own. Leaving them
    // out is what made this category look like nothing here is `mass`.
    brand: 'Fender',
    name: 'Champion',
    category: 'amp',
    synonyms: ['champion', 'champion 20', 'champ 20'],
    rarity: 'mass',
  },
  {
    brand: 'Marshall',
    name: 'JCM800',
    category: 'amp',
    synonyms: ['jcm 800', 'jcm800'],
    rarity: 'common',
  },
  {
    brand: 'Marshall',
    name: 'Plexi',
    category: 'amp',
    synonyms: ['plexi', 'super lead'],
    rarity: 'special',
  },
  {
    brand: 'Marshall',
    name: 'DSL40',
    category: 'amp',
    synonyms: ['dsl40', 'dsl 40'],
    rarity: 'common',
  },
  {
    brand: 'Marshall',
    name: 'JTM45',
    category: 'amp',
    synonyms: ['jtm45', 'jtm 45'],
    rarity: 'special',
  },
  {
    brand: 'Marshall',
    name: 'Silver Jubilee',
    category: 'amp',
    synonyms: ['jubilee', '2555'],
    rarity: 'special',
  },
  {
    brand: 'Marshall',
    name: 'MG',
    category: 'amp',
    synonyms: ['mg', 'mg15', 'mg30'],
    rarity: 'mass',
  },
  {
    brand: 'Orange',
    name: 'Rockerverb',
    category: 'amp',
    synonyms: ['rockerverb'],
    rarity: 'special',
  },
  {
    brand: 'Orange',
    name: 'Tiny Terror',
    category: 'amp',
    synonyms: ['tiny terror'],
    rarity: 'common',
  },
  {
    brand: 'Orange',
    name: 'Crush',
    category: 'amp',
    synonyms: ['crush', 'crush 20rt'],
    rarity: 'mass',
  },
  {
    brand: 'Mesa/Boogie',
    name: 'Dual Rectifier',
    category: 'amp',
    synonyms: ['dual rec', 'recto', 'rectifier'],
    rarity: 'common',
  },
  {
    brand: 'Mesa/Boogie',
    name: 'Mark V',
    category: 'amp',
    synonyms: ['mark v', 'mark 5'],
    rarity: 'special',
  },
  {
    brand: 'Roland',
    name: 'JC-120',
    category: 'amp',
    synonyms: ['jc120', 'jazz chorus'],
    rarity: 'common',
  },
  {
    brand: 'Roland',
    name: 'Cube',
    category: 'amp',
    synonyms: ['cube'],
    rarity: 'mass',
  },
  {
    brand: 'Boss',
    name: 'Katana',
    category: 'amp',
    synonyms: ['katana'],
    rarity: 'mass',
  },
  {
    brand: 'Peavey',
    name: 'Classic 30',
    category: 'amp',
    synonyms: ['classic 30'],
    rarity: 'common',
  },
  {
    brand: 'Blackstar',
    name: 'HT-5',
    category: 'amp',
    synonyms: ['ht5', 'ht 5'],
    rarity: 'common',
  },
  {
    brand: 'Hughes & Kettner',
    name: 'TubeMeister',
    category: 'amp',
    synonyms: ['tubemeister', 'tm18'],
    rarity: 'common',
  },
  {
    // Expensive, but the default high-gain head in a lot of rehearsal rooms.
    brand: 'EVH',
    name: '5150III',
    category: 'amp',
    synonyms: ['5150', '5150 iii'],
    rarity: 'common',
  },
  {
    brand: 'Randall',
    name: 'Satan 120',
    category: 'amp',
    synonyms: ['satan', 'satan 120', 'ola englund'],
    rarity: 'special',
  },
  {
    brand: 'Friedman',
    name: 'BE-100',
    category: 'amp',
    synonyms: ['be100', 'be 100'],
    rarity: 'special',
  },
  {
    // Boutique and pricey, but a current catalogue product you can order.
    brand: 'Two-Rock',
    name: 'Classic Reverb',
    category: 'amp',
    synonyms: ['two rock classic'],
    rarity: 'special',
  },
  {
    // Roughly 300 were ever built and Alexander Dumble is dead.
    brand: 'Dumble',
    name: 'Overdrive Special',
    category: 'amp',
    synonyms: ['dumble', 'ods'],
    rarity: 'rare',
  },
  {
    brand: 'Matchless',
    name: 'DC-30',
    category: 'amp',
    synonyms: ['dc30', 'dc 30'],
    rarity: 'special',
  },
  {
    // The fridge is the default backline bass rig, not a statement.
    brand: 'Ampeg',
    name: 'SVT',
    category: 'amp',
    synonyms: ['svt'],
    rarity: 'common',
  },
  {
    brand: 'Markbass',
    name: 'Little Mark',
    category: 'amp',
    synonyms: ['little mark', 'lm iii'],
    rarity: 'common',
  },

  // ---- Cabinets ----
  {
    brand: 'Marshall',
    name: '1960A',
    category: 'cabinet',
    synonyms: ['1960a', '4x12'],
    rarity: 'mass',
  },
  {
    brand: 'Marshall',
    name: '1960B',
    category: 'cabinet',
    synonyms: ['1960b'],
    rarity: 'common',
  },
  {
    brand: 'Orange',
    name: 'PPC212',
    category: 'cabinet',
    synonyms: ['ppc 212'],
    rarity: 'common',
  },
  {
    brand: 'Orange',
    name: 'PPC412',
    category: 'cabinet',
    synonyms: ['ppc 412'],
    rarity: 'common',
  },
  {
    brand: 'Mesa/Boogie',
    name: 'Rectifier 4x12',
    category: 'cabinet',
    synonyms: ['recto cab', 'rectifier cab'],
    rarity: 'common',
  },
  {
    brand: 'Ampeg',
    name: 'SVT-810E',
    category: 'cabinet',
    synonyms: ['810', 'fridge', 'svt 810'],
    rarity: 'common',
  },
  {
    brand: 'Bogner',
    name: 'Uberkab',
    category: 'cabinet',
    synonyms: ['uberkab'],
    rarity: 'special',
  },
  {
    // Built to order in small numbers in the UK.
    brand: 'Zilla',
    name: 'Fatboy',
    category: 'cabinet',
    synonyms: ['zilla fatboy'],
    rarity: 'rare',
  },
  {
    // The default budget cabinet in the German-speaking market.
    brand: 'Harley Benton',
    name: 'G212 Vintage',
    category: 'cabinet',
    synonyms: ['g212', 'hb 212'],
    rarity: 'mass',
  },

  // ---- Pedals ----
  {
    brand: 'Boss',
    name: 'DS-1 Distortion',
    category: 'pedal',
    synonyms: ['ds1', 'ds 1'],
    rarity: 'mass',
  },
  {
    brand: 'Boss',
    name: 'BD-2 Blues Driver',
    category: 'pedal',
    synonyms: ['bd2', 'blues driver'],
    rarity: 'mass',
  },
  {
    brand: 'Boss',
    name: 'SD-1 Super Overdrive',
    category: 'pedal',
    synonyms: ['sd1', 'super overdrive'],
    rarity: 'mass',
  },
  {
    brand: 'Boss',
    name: 'MT-2 Metal Zone',
    category: 'pedal',
    synonyms: ['mt2', 'metal zone'],
    rarity: 'mass',
  },
  {
    brand: 'Boss',
    name: 'DD-3 Digital Delay',
    category: 'pedal',
    synonyms: ['dd3', 'dd 3'],
    rarity: 'common',
  },
  {
    brand: 'Boss',
    name: 'RV-6 Reverb',
    category: 'pedal',
    synonyms: ['rv6', 'rv 6'],
    rarity: 'common',
  },
  {
    // Discontinued in 1982 and hunted down on purpose.
    brand: 'Boss',
    name: 'CE-2 Chorus',
    category: 'pedal',
    synonyms: ['ce2', 'ce 2'],
    rarity: 'special',
  },
  {
    brand: 'Boss',
    name: 'OC-2 Octave',
    category: 'pedal',
    synonyms: ['oc2', 'oc 2'],
    rarity: 'special',
  },
  {
    brand: 'Ibanez',
    name: 'Tube Screamer',
    category: 'pedal',
    synonyms: ['tube screamer', 'ts'],
    rarity: 'mass',
    variants: [
      { name: 'TS9 Tube Screamer', synonyms: ['ts9'], rarity: 'mass' },
      { name: 'TS808 Tube Screamer', synonyms: ['ts808', 'ts 808'], rarity: 'common' },
      { name: 'TS808 Handwired', synonyms: ['ts808 hw'], rarity: 'rare' },
    ],
  },
  {
    brand: 'ProCo',
    name: 'RAT',
    category: 'pedal',
    synonyms: ['rat', 'rat 2'],
    rarity: 'common',
  },
  {
    brand: 'ProCo',
    name: 'Turbo RAT',
    category: 'pedal',
    synonyms: ['turbo rat'],
    rarity: 'special',
  },
  {
    brand: 'Klon',
    name: 'Centaur',
    category: 'pedal',
    synonyms: ['klon', 'centaur'],
    rarity: 'rare',
  },
  {
    brand: 'Electro-Harmonix',
    name: 'Big Muff Pi',
    category: 'pedal',
    synonyms: ['big muff', 'muff'],
    rarity: 'mass',
  },
  {
    brand: 'Electro-Harmonix',
    name: 'Memory Man',
    category: 'pedal',
    synonyms: ['memory man', 'dmm'],
    rarity: 'special',
  },
  {
    brand: 'Electro-Harmonix',
    name: 'Small Clone',
    category: 'pedal',
    synonyms: ['small clone'],
    rarity: 'common',
  },
  {
    brand: 'Electro-Harmonix',
    name: 'Holy Grail',
    category: 'pedal',
    synonyms: ['holy grail'],
    rarity: 'common',
  },
  {
    brand: 'Electro-Harmonix',
    name: 'POG',
    category: 'pedal',
    synonyms: ['pog', 'pog2'],
    rarity: 'special',
  },
  {
    brand: 'MXR',
    name: 'Phase 90',
    category: 'pedal',
    synonyms: ['phase 90', 'phase90'],
    rarity: 'mass',
  },
  {
    brand: 'MXR',
    name: 'Carbon Copy',
    category: 'pedal',
    synonyms: ['carbon copy'],
    rarity: 'mass',
  },
  {
    brand: 'MXR',
    name: 'Dyna Comp',
    category: 'pedal',
    synonyms: ['dyna comp'],
    rarity: 'common',
  },
  {
    brand: 'MXR',
    name: 'Distortion+',
    category: 'pedal',
    synonyms: ['distortion plus', 'dist+'],
    rarity: 'common',
  },
  {
    brand: 'Dunlop',
    name: 'Cry Baby',
    category: 'pedal',
    synonyms: ['cry baby', 'wah', 'gcb95'],
    rarity: 'mass',
  },
  {
    brand: 'Dunlop',
    name: 'Fuzz Face',
    category: 'pedal',
    synonyms: ['fuzz face'],
    rarity: 'common',
    variants: [
      { name: 'Fuzz Face Mini', synonyms: ['fuzz face mini', 'ffm'], rarity: 'common' },
      { name: 'Germanium Fuzz Face', synonyms: ['germanium fuzz face'], rarity: 'special' },
    ],
  },
  {
    // Strymon's big three are pedalboard furniture at this point; the Flint
    // sells noticeably less than the delay and the reverb.
    brand: 'Strymon',
    name: 'Timeline',
    category: 'pedal',
    synonyms: ['timeline'],
    rarity: 'common',
  },
  {
    brand: 'Strymon',
    name: 'BigSky',
    category: 'pedal',
    synonyms: ['big sky', 'bigsky'],
    rarity: 'common',
  },
  {
    brand: 'Strymon',
    name: 'El Capistan',
    category: 'pedal',
    synonyms: ['el cap', 'el capistan'],
    rarity: 'common',
  },
  {
    brand: 'Strymon',
    name: 'Flint',
    category: 'pedal',
    synonyms: ['flint'],
    rarity: 'special',
  },
  {
    brand: 'TC Electronic',
    name: 'Flashback',
    category: 'pedal',
    synonyms: ['flashback'],
    rarity: 'mass',
  },
  {
    brand: 'TC Electronic',
    name: 'Hall of Fame',
    category: 'pedal',
    synonyms: ['hof', 'hall of fame'],
    rarity: 'mass',
  },
  {
    brand: 'TC Electronic',
    name: 'Ditto Looper',
    category: 'pedal',
    synonyms: ['ditto'],
    rarity: 'mass',
  },
  {
    brand: 'Wampler',
    name: 'Tumnus',
    category: 'pedal',
    synonyms: ['tumnus'],
    rarity: 'common',
  },
  {
    brand: 'JHS',
    name: 'Morning Glory',
    category: 'pedal',
    synonyms: ['morning glory'],
    rarity: 'common',
  },
  {
    brand: 'JHS',
    name: 'Muffuletta',
    category: 'pedal',
    synonyms: ['muffuletta'],
    rarity: 'special',
  },
  {
    brand: 'EarthQuaker Devices',
    name: 'Plumes',
    category: 'pedal',
    synonyms: ['plumes'],
    rarity: 'common',
  },
  {
    brand: 'EarthQuaker Devices',
    name: 'Afterneath',
    category: 'pedal',
    synonyms: ['afterneath'],
    rarity: 'special',
  },
  {
    brand: 'EarthQuaker Devices',
    name: 'Dispatch Master',
    category: 'pedal',
    synonyms: ['dispatch master'],
    rarity: 'common',
  },
  {
    brand: 'Fulltone',
    name: 'OCD',
    category: 'pedal',
    synonyms: ['ocd'],
    rarity: 'common',
  },
  {
    brand: 'Xotic',
    name: 'EP Booster',
    category: 'pedal',
    synonyms: ['ep booster', 'epb'],
    rarity: 'common',
  },
  {
    brand: 'Walrus Audio',
    name: 'Julia',
    category: 'pedal',
    synonyms: ['julia'],
    rarity: 'special',
  },
  {
    // Built in limited runs and usually sold out.
    brand: 'Chase Bliss',
    name: 'Mood',
    category: 'pedal',
    synonyms: ['mood', 'mood mkii'],
    rarity: 'rare',
  },
  {
    // Years-long waiting list, two people building them.
    brand: 'Analog Man',
    name: 'King of Tone',
    category: 'pedal',
    synonyms: ['kot', 'king of tone'],
    rarity: 'rare',
  },
  {
    brand: 'Hudson Electronics',
    name: 'Broadcast',
    category: 'pedal',
    synonyms: ['broadcast'],
    rarity: 'special',
  },
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
  {
    brand: 'Line 6',
    name: 'DL4',
    category: 'pedal',
    synonyms: ['dl4', 'dl 4'],
    rarity: 'common',
  },
  {
    brand: 'DigiTech',
    name: 'Whammy',
    category: 'pedal',
    synonyms: ['whammy'],
    rarity: 'common',
  },
  {
    brand: 'ZVEX',
    name: 'Fuzz Factory',
    category: 'pedal',
    synonyms: ['fuzz factory'],
    rarity: 'special',
  },
  {
    // Loud and weird, but a current production pedal anyone can buy.
    brand: 'Death By Audio',
    name: 'Fuzz War',
    category: 'pedal',
    synonyms: ['fuzz war'],
    rarity: 'special',
  },
  {
    brand: 'Origin Effects',
    name: 'Cali76',
    category: 'pedal',
    synonyms: ['cali76', 'cali 76'],
    rarity: 'special',
  },
  {
    brand: 'Sola Sound',
    name: 'Tone Bender',
    category: 'pedal',
    synonyms: ['tone bender', 'tonebender'],
    rarity: 'rare',
  },

  // ---- Pickups ----
  {
    brand: 'Seymour Duncan',
    name: 'JB',
    category: 'pickup',
    synonyms: ['jb', 'sh4'],
    rarity: 'mass',
  },
  {
    brand: 'Seymour Duncan',
    name: 'Jazz',
    category: 'pickup',
    synonyms: ['sh2', 'duncan jazz'],
    rarity: 'common',
  },
  {
    brand: 'Seymour Duncan',
    name: 'Alnico II Pro',
    category: 'pickup',
    synonyms: ['alnico 2 pro', 'aph1'],
    rarity: 'common',
  },
  {
    brand: 'Seymour Duncan',
    name: 'Hot Rails',
    category: 'pickup',
    synonyms: ['hot rails'],
    rarity: 'common',
  },
  {
    brand: 'Seymour Duncan',
    name: 'Antiquity',
    category: 'pickup',
    synonyms: ['antiquity'],
    rarity: 'special',
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
  {
    brand: 'DiMarzio',
    name: 'Super Distortion',
    category: 'pickup',
    synonyms: ['super distortion', 'dp100'],
    rarity: 'common',
  },
  {
    brand: 'DiMarzio',
    name: 'Evolution',
    category: 'pickup',
    synonyms: ['evolution', 'dp158'],
    rarity: 'common',
  },
  {
    brand: 'EMG',
    name: '81',
    category: 'pickup',
    synonyms: ['emg 81'],
    rarity: 'common',
  },
  {
    brand: 'EMG',
    name: '85',
    category: 'pickup',
    synonyms: ['emg 85'],
    rarity: 'common',
  },
  {
    brand: 'EMG',
    name: 'HZ-H2',
    category: 'pickup',
    synonyms: ['hz h2', 'hzh2', 'emg hz'],
    rarity: 'common',
  },
  {
    brand: 'Fender',
    name: 'Texas Special',
    category: 'pickup',
    synonyms: ['texas special'],
    rarity: 'common',
  },
  {
    brand: 'Gibson',
    name: 'Burstbucker',
    category: 'pickup',
    synonyms: ['burstbucker', 'bb pro'],
    rarity: 'common',
  },
  {
    brand: 'Lollar',
    name: 'Imperial',
    category: 'pickup',
    synonyms: ['lollar imperial'],
    rarity: 'rare',
  },
  {
    brand: 'Lollar',
    name: 'Special',
    category: 'pickup',
    synonyms: ['lollar special'],
    rarity: 'special',
  },
  {
    brand: 'Fralin',
    name: 'Vintage Hot',
    category: 'pickup',
    synonyms: ['fralin vintage hot'],
    rarity: 'special',
  },
  {
    brand: 'Bare Knuckle',
    name: 'Mule',
    category: 'pickup',
    synonyms: ['mule', 'bkp mule'],
    rarity: 'special',
  },
  {
    brand: 'Bare Knuckle',
    name: 'Nailbomb',
    category: 'pickup',
    synonyms: ['nailbomb'],
    rarity: 'special',
  },
  {
    // Harry Häussel winds these in Bavaria and they are a normal shop item
    // in the German-speaking market -- boutique, not unobtainable.
    brand: 'Häussel',
    name: 'Vintage Plus',
    category: 'pickup',
    synonyms: ['haeussel vintage plus', 'haussel'],
    rarity: 'special',
  },

  // ---- Preamps and modelers ----
  {
    brand: 'Universal Audio',
    name: 'OX Amp Top Box',
    category: 'preamp',
    synonyms: ['ox box', 'ox'],
    rarity: 'special',
  },
  // Modellers, not preamps. They were filed under `preamp` because there was
  // nowhere else to put them -- which stayed invisible while the rig list was
  // flat, and stops being invisible the moment that list groups by category.
  {
    brand: 'Kemper',
    name: 'Profiler',
    category: 'modeller',
    synonyms: ['kemper', 'profiler'],
    rarity: 'special',
  },
  {
    brand: 'Line 6',
    name: 'Helix',
    category: 'modeller',
    synonyms: ['helix'],
    rarity: 'common',
  },
  {
    brand: 'Line 6',
    name: 'HX Stomp',
    category: 'preamp',
    synonyms: ['hx stomp'],
    rarity: 'common',
  },
  {
    brand: 'Neural DSP',
    name: 'Quad Cortex',
    category: 'modeller',
    synonyms: ['quad cortex', 'qc'],
    rarity: 'special',
  },
  {
    brand: 'Fractal Audio',
    name: 'Axe-Fx III',
    category: 'modeller',
    synonyms: ['axe fx', 'axefx'],
    rarity: 'special',
  },
  {
    brand: 'Two Notes',
    name: 'Torpedo Captor X',
    category: 'loadbox',
    synonyms: ['captor x', 'torpedo'],
    rarity: 'special',
  },
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
  {
    brand: 'Tech 21',
    name: 'SansAmp',
    category: 'preamp',
    synonyms: ['sansamp', 'gt2'],
    rarity: 'common',
  },
  {
    // Everybody's first multi-effect, and the reason this category is not
    // made up exclusively of four-figure modelers.
    brand: 'Zoom',
    name: 'G1 Four',
    category: 'preamp',
    synonyms: ['g1 four', 'g1x four', 'zoom g1'],
    rarity: 'mass',
  },
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

  // ---- Strings (consumable) ----
  {
    brand: 'Ernie Ball',
    name: 'Regular Slinky',
    category: 'strings',
    synonyms: ['slinky', 'regular slinky', '10 46'],
    rarity: 'mass',
  },
  {
    brand: 'Ernie Ball',
    name: 'Super Slinky',
    category: 'strings',
    synonyms: ['super slinky', '9 42'],
    rarity: 'mass',
  },
  {
    brand: 'Ernie Ball',
    name: 'Power Slinky',
    category: 'strings',
    synonyms: ['power slinky', '11 48'],
    rarity: 'common',
  },
  {
    brand: 'Ernie Ball',
    name: 'Paradigm',
    category: 'strings',
    synonyms: ['paradigm'],
    rarity: 'special',
  },
  // Gauge belongs in the name where an entry denotes ONE concrete set: an
  // EXL110 is 10-46, always. Entries that denote a SERIES sold in many
  // gauges -- Elixir Nanoweb, Ernie Ball Slinky -- stay without one, because
  // a gauge on those would simply be wrong.
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
  {
    // Elixir IS the coated-string market, not the exception to it.
    brand: 'Elixir',
    name: 'Nanoweb',
    category: 'strings',
    synonyms: ['nanoweb'],
    rarity: 'common',
  },
  {
    brand: 'Elixir',
    name: 'Optiweb',
    category: 'strings',
    synonyms: ['optiweb'],
    rarity: 'common',
  },
  {
    // Flatwounds are a deliberate choice, never an accident -- exactly the
    // kind of match that says something about a player.
    brand: 'Thomastik-Infeld',
    name: 'Jazz Swing',
    category: 'strings',
    synonyms: ['jazz swing', 'ti flats'],
    rarity: 'special',
  },
  {
    brand: 'DR',
    name: 'Pure Blues',
    category: 'strings',
    synonyms: ['pure blues'],
    rarity: 'special',
  },
  {
    brand: 'Rotosound',
    name: 'Swing Bass 66',
    category: 'strings',
    synonyms: ['swing bass', 'rs66'],
    rarity: 'common',
  },

  // ---- Picks (consumable) ----
  {
    brand: 'Dunlop',
    name: 'Tortex',
    category: 'pick',
    synonyms: ['tortex'],
    rarity: 'mass',
  },
  {
    brand: 'Dunlop',
    name: 'Jazz III',
    category: 'pick',
    synonyms: ['jazz 3', 'jazz iii'],
    rarity: 'mass',
  },
  {
    brand: 'Dunlop',
    name: 'Nylon Standard',
    category: 'pick',
    synonyms: ['nylon', 'nylon standard'],
    rarity: 'common',
  },
  {
    brand: 'Dunlop',
    name: 'Ultex',
    category: 'pick',
    synonyms: ['ultex'],
    rarity: 'common',
  },
  {
    brand: 'Dunlop',
    name: 'Primetone',
    category: 'pick',
    synonyms: ['primetone'],
    rarity: 'common',
  },
  {
    brand: 'Fender',
    name: '351 Shape',
    category: 'pick',
    synonyms: ['351', '351 shape'],
    rarity: 'mass',
  },
  {
    // Hand-finished, roughly fifty euros for one pick.
    brand: 'BlueChip',
    name: 'TAD',
    category: 'pick',
    synonyms: ['bluechip', 'tad'],
    rarity: 'rare',
  },

  // ---- Accessories ----
  {
    brand: 'Boss',
    name: 'TU-3 Tuner',
    category: 'accessory',
    synonyms: ['tu3', 'tu 3'],
    rarity: 'mass',
  },
  {
    brand: 'TC Electronic',
    name: 'Polytune',
    category: 'accessory',
    synonyms: ['polytune', 'poly tune'],
    rarity: 'mass',
  },
  {
    brand: 'Dunlop',
    name: 'Straplok',
    category: 'accessory',
    synonyms: ['straplok', 'strap lock'],
    rarity: 'mass',
  },
  {
    brand: 'Ernie Ball',
    name: 'VP Junior',
    category: 'accessory',
    synonyms: ['vp jr', 'volume pedal'],
    rarity: 'common',
  },
  {
    brand: 'Shure',
    name: 'SM57',
    category: 'accessory',
    synonyms: ['sm57', 'sm 57'],
    rarity: 'mass',
  },
  {
    brand: 'Peterson',
    name: 'StroboStomp',
    category: 'accessory',
    synonyms: ['strobostomp'],
    rarity: 'special',
  },
  {
    brand: 'Voodoo Lab',
    name: 'Pedal Power 2 Plus',
    category: 'accessory',
    synonyms: ['pedal power', 'pp2'],
    rarity: 'common',
  },
  {
    brand: 'Cioks',
    name: 'DC7',
    category: 'accessory',
    synonyms: ['dc7', 'cioks dc7'],
    rarity: 'special',
  },
  {
    brand: 'Hercules',
    name: 'GS414B',
    category: 'accessory',
    synonyms: ['gs414b', 'stand'],
    rarity: 'common',
  },
]
