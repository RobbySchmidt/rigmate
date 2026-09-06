import type { RarityBase } from '#shared/utils/rarityBase'

/**
 * Gepflegter Grundwert am Katalog-Eintrag. Bei wenigen Nutzern ist statistisch
 * alles selten - ohne diesen Wert waere die Empfehlung im Prototyp nicht
 * vorfuehrbar. Ein Boss DS-1 ist Massenware, egal was 20 Nutzer sagen.
 */
export const BASE_WEIGHTS: Record<RarityBase, number> = {
  mass: 0.25,
  common: 0.5,
  special: 1.0,
  rare: 1.5,
}

/** Obergrenze, damit gemessen und gepflegt auf derselben Skala liegen. */
const MAX_WEIGHT = 1.5

/** Ab so vielen Nutzern traegt die Messung allein. */
export const MEASURED_CONFIDENCE_USERS = 200

/**
 * Inverse Haeufigkeit: haben es 400 von 500, ist es als Signal wertlos;
 * haben es 3, ist es hochinteressant.
 *
 * Fix Runde 1: ohne Nutzer ist die Frequenz 0/0 undefiniert - keine
 * Entscheidung "wie ein bestimmter Grundwert", sondern bewusst 0: keine
 * Messung heisst kein gemessenes Signal. Der genaue Wert erreicht
 * rarityWeight() ohnehin nie, weil dessen confidence bei totalUsers <= 0
 * ebenfalls 0 ist - aber measuredWeight() ist eine eigene, exportierte
 * Funktion und muss auch isoliert aufgerufen einen definierten, endlichen
 * Wert liefern statt eine fremde Konstante zu leihen, die inhaltlich nichts
 * mit "gemessen" zu tun hat.
 */
export function measuredWeight(ownerCount: number, totalUsers: number): number {
  if (totalUsers <= 0) return 0
  const inverseFrequency = Math.log(1 + totalUsers / (1 + ownerCount))
  const maximum = Math.log(1 + totalUsers)
  return (inverseFrequency / maximum) * MAX_WEIGHT
}

/**
 * Blendet den gepflegten Grundwert in die Messung ueber. Solange wenige
 * Nutzer da sind, traegt der Grundwert; sobald genug Daten vorliegen,
 * ueberlagert der gemessene Wert ihn.
 */
export function rarityWeight(base: RarityBase, ownerCount: number, totalUsers: number): number {
  const confidence = Math.min(1, Math.max(0, totalUsers / MEASURED_CONFIDENCE_USERS))
  const blended =
    (1 - confidence) * BASE_WEIGHTS[base] + confidence * measuredWeight(ownerCount, totalUsers)
  return Math.max(0, blended)
}
