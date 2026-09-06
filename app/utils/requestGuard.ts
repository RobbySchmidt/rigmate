// Entscheidet, ob eine Antwort noch aktuell ist. Ein Debounce mit
// clearTimeout() verhindert nur, dass ein Timer feuert, der noch nicht
// gefeuert hat - er tut nichts gegen eine Anfrage, die schon unterwegs ist.
// Ohne diese Wache kann eine langsame Antwort auf "str" eine schnellere
// Antwort auf "strat" ueberschreiben, oder eine Antwort auf einen laengst
// geloeschten Suchbegriff eine leere Liste wieder fuellen.
export interface RequestGuard {
  /** Macht diesen Aufruf zum aktuellen und liefert sein Ticket. */
  next: () => number
  /** Ist das Ticket noch das aktuelle, oder ist inzwischen etwas Neueres dran? */
  isCurrent: (ticket: number) => boolean
}

export function createRequestGuard(): RequestGuard {
  let latest = 0
  return {
    next: () => {
      latest += 1
      return latest
    },
    isCurrent: (ticket: number) => ticket === latest,
  }
}
