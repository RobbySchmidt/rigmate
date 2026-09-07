import type { RarityBase } from './rarityBase'

/**
 * Einziger Ort fuer die Zuordnung Seltenheitsstufe -> Darstellung.
 *
 * Nur zwei der vier Stufen werden ausgezeichnet: leuchten alle vier, sagt
 * die Auszeichnung nichts mehr. Bernstein gehoert in diesem Projekt
 * ausschliesslich der Seltenheit - sie ist die Mechanik, ueber die Menschen
 * einander finden, keine Verzierung.
 *
 * Vorher stand diese Zuordnung in sechs Komponenten. Dieselbe Behandlung
 * wie RarityBase und die Baujahr-Regel.
 */

/**
 * Die Textfarbe eines Geraetenamens. Gilt ueberall gleich - in der
 * Equipment-Liste, im Signalweg, im Bearbeiten-Modus und im Pool daneben.
 *
 * Bewusst nur die FARBE, kein Schriftgewicht: die Namen stehen je nach
 * Ansicht in unterschiedlichen Staerken (normal in der Liste, font-semibold
 * im Signalweg). Ein hier fest verdrahtetes Gewicht wuerde die eine Ansicht
 * anheben und die andere heruntersetzen. Wer ein Rarissimum zusaetzlich
 * ueber das Gewicht heben will, tut das an der Aufrufstelle - siehe
 * GearList.vue.
 */
export function rarityNameClass(rarity: RarityBase | null): string {
  if (rarity === 'rare') return 'text-rare'
  if (rarity === 'special') return 'text-special'
  return 'text-ink'
}

/**
 * Der Punkt vor einem Eintrag in einer Liste (RarityPip.vue).
 *
 * Im stillen Zustand traegt ihn die Deckkraft: ein halbtransparenter Punkt
 * auf hellem Grund ist als Aufzaehlungszeichen lesbar, ohne mitzuleuchten.
 * Der Knoten auf dem Kabel loest denselben Zustand anders - siehe
 * rarityNodeClass().
 */
export function rarityPipClass(rarity: RarityBase | null): string {
  if (rarity === 'rare') return 'bg-rare border-rare'
  if (rarity === 'special') return 'border-special'
  return 'bg-line opacity-55'
}

/**
 * Der Knoten auf dem Kabel im Signalweg (SignalChain.vue,
 * SignalChainEditor.vue).
 *
 * Ausgezeichnet sieht er aus wie der Punkt in der Liste - dieselbe Sprache,
 * niemand muss zwischen den Ansichten umlernen. Der STILLE Zustand weicht
 * aber ab, und das mit Absicht: der Knoten sitzt zwischen zwei
 * bg-line-Segmenten derselben Farbe. Ein Punkt mit opacity-55 laese sich
 * dort nicht als Station, sondern als Stelle, an der die Linie duenner wird.
 * Deshalb eine deckende Flaeche in der Grundfarbe plus Rand: in der Liste
 * traegt die Deckkraft den Punkt, auf dem Kabel tut das der Rand - ohne ihn
 * waere der Kreis gegen bg-surface praktisch unsichtbar.
 *
 * Zwei benannte Varianten statt einer Funktion mit Sonderfall: der
 * Unterschied ist eine Entscheidung, kein Ausnahmefall.
 */
export function rarityNodeClass(rarity: RarityBase | null): string {
  if (rarity === 'rare') return 'bg-rare border-rare'
  if (rarity === 'special') return 'border-special'
  return 'bg-surface border-line'
}
