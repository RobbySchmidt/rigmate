import { computed, getCurrentScope, onScopeDispose, ref } from 'vue'
import type { SupabaseClient } from '@supabase/supabase-js'

export type ChainSaveStatus = 'idle' | 'pending' | 'saved' | 'error'

/**
 * Ein Fehler, so wie supabase-js ihn liefert. `code` traegt die SQLSTATEs
 * RG001..RG005 aus set_chain_order() - die Zuordnung steht im Kopf von
 * supabase/migrations/20260907070458_chain_order_docs.sql. Hier wird sie
 * bewusst nicht ausgewertet; die Oberflaeche macht daraus spaeter Texte.
 */
export interface ChainSaveError {
  message: string
  code?: string
  details?: string | null
  hint?: string | null
}

/** Ruhezeit, nach der ein Stand geschickt wird - jeder Zug setzt sie neu. */
const SETTLE_MS = 400

/**
 * Schreibt die Kettenreihenfolge. Zwei Dinge macht das hier und nichts
 * anderes:
 *
 * 1. Buendeln. Eine Verschiebung ist ein Schreibvorgang; fuenf schnelle
 *    Zuege waeren fuenf Anfragen. Es zaehlt nur der letzte Stand.
 * 2. Den Ausgang sichtbar machen. Die Oberflaeche zeigt die neue
 *    Reihenfolge sofort - scheitert das Speichern still, ist die Aenderung
 *    nach einem Neuladen weg, ohne dass je etwas kaputt aussah. Das ist der
 *    wiederkehrende Fehler dieses Projekts.
 *
 * Aus Punkt 2 folgt der Rest der Datei. `queuedVersion` und `sentVersion`
 * sorgen dafuer, dass eine Antwort nur dann zu einem Zustand wird, wenn sie
 * ueberhaupt noch zum angezeigten Stand gehoert: wer waehrend einer
 * laufenden Anfrage weitersortiert, darf kein "gespeichert" fuer die alte
 * Reihenfolge zu sehen bekommen (und keinen Fehlalarm fuer eine, die
 * gleich ohnehin ueberschrieben wird). Und es laeuft immer nur eine
 * Anfrage: set_chain_order() setzt die ganze Kette, zwei gleichzeitige
 * Aufrufe wuerden je nach Laufzeit in der falschen Reihenfolge ankommen.
 */
export function useChainOrder(supabase: SupabaseClient) {
  const status = ref<ChainSaveStatus>('idle')
  const lastError = ref<ChainSaveError | null>(null)
  const failed = computed(() => status.value === 'error')

  let timer: ReturnType<typeof setTimeout> | null = null
  let pendingIds: string[] = []
  // Zaehlt jedes save(). Nur damit laesst sich nach der Antwort noch
  // feststellen, ob sie zum aktuell angezeigten Stand gehoert.
  let queuedVersion = 0
  let sentVersion = 0
  // Der laufende Durchgang. Solange er lebt, startet kein zweiter.
  let inFlight: Promise<void> | null = null

  function cancelTimer() {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  }

  /**
   * Schickt so lange den jeweils neuesten Stand, bis der geschriebene dem
   * gewuenschten entspricht. Die Schleife statt eines einzelnen Schreibens,
   * damit ein waehrend der Anfrage entstandener Stand nicht liegen bleibt -
   * sein Timer laeuft ins Leere, weil hier schon ein Durchgang lebt.
   */
  async function drain() {
    while (sentVersion !== queuedVersion) {
      // Ein noch offener Timer wuerde denselben Stand ein zweites Mal
      // schicken - diese Schleife nimmt ihm die Arbeit ab.
      cancelTimer()
      sentVersion = queuedVersion
      const ids = pendingIds

      let error: ChainSaveError | null
      try {
        const response = await supabase.rpc('set_chain_order', { item_ids: ids })
        error = response.error
      } catch (cause) {
        // supabase-js gibt Fehler normalerweise zurueck, statt zu werfen.
        // Faellt doch einmal etwas heraus (abgebrochener Fetch), waere eine
        // unbehandelte Rejection genau der stille Fehlschlag, um den es hier
        // geht - und der Durchgang braeche mitten im Nachziehen ab.
        error = { message: cause instanceof Error ? cause.message : String(cause) }
      }

      // Wurde inzwischen weitersortiert, gehoert diese Antwort zu einem
      // ueberholten Stand. Sie darf weder Erfolg noch Fehlschlag melden -
      // die Schleife schickt gleich den neuen Stand hinterher.
      if (sentVersion !== queuedVersion) continue

      lastError.value = error ?? null
      status.value = error ? 'error' : 'saved'
    }
  }

  /**
   * Schickt einen offenen Stand sofort, ohne die Ruhezeit abzuwarten, und
   * liefert das Versprechen des laufenden Durchgangs zurueck. Gedacht fuer
   * den Moment, in dem die Seite verschwindet.
   */
  function flushNow(): Promise<void> {
    cancelTimer()
    if (!inFlight) {
      inFlight = drain().finally(() => {
        inFlight = null
      })
    }
    return inFlight
  }

  /** Neuen Stand vormerken. Geschickt wird er erst nach der Ruhezeit. */
  function save(itemIds: string[]) {
    // Kopie: Drag-and-Drop sortiert die uebergebene Liste gern an Ort und
    // Stelle weiter, und dann schickten wir eine andere als die gemeldete.
    pendingIds = [...itemIds]
    queuedVersion += 1
    status.value = 'pending'
    // Der alte Fehler gehoert zu einem alten Stand; er darf nicht neben dem
    // neuen stehen bleiben.
    lastError.value = null
    cancelTimer()
    timer = setTimeout(() => void flushNow(), SETTLE_MS)
  }

  /** Nach einem Fehlschlag denselben Stand erneut schicken. */
  function retry() {
    // Vor dem ersten save() gibt es nichts zu wiederholen. Die leere Kette
    // ist dagegen ein legitimer Stand ("Kette leeren", siehe Migration) und
    // darf sich sehr wohl wiederholen lassen.
    if (status.value === 'idle') return
    save(pendingIds)
  }

  // Ein haengender Timer beim Verschwinden der Komponente hat zwei
  // moegliche Ausgaenge, und nur einer davon ist vertretbar: verwerfen
  // hiesse, die letzte Verschiebung des Nutzers still zu verlieren. Also
  // wird sie geschickt. Dass ihr Ausgang dann niemanden mehr erreicht, ist
  // das kleinere Uebel.
  if (getCurrentScope()) onScopeDispose(() => void flushNow())

  return { status, failed, lastError, save, retry, flushNow }
}
