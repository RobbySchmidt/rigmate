import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { effectScope } from 'vue'
import { useChainOrder } from '../../app/composables/useChainOrder'
import { createSupabaseStub } from '../helpers/supabaseStub'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

/**
 * Der gemeinsame Stub loest jeden rpc-Aufruf sofort auf. Damit laesst sich
 * kein Wettlauf nachstellen, denn zwischen Absenden und Antwort passt kein
 * weiteres save(). Dieser Stub haelt die Antwort offen, bis der Test sie von
 * Hand aufloest - genau das Fenster, in dem der Nutzer weitersortiert.
 */
function createDeferredSupabase() {
  type RpcError = { message: string; code?: string }
  type RpcResult = { data: null; error: RpcError | null }
  const rpcCalls: Array<{ name: string; payload: unknown }> = []
  const open: Array<(result: RpcResult) => void> = []

  const rpc = vi.fn((name: string, payload?: unknown) => {
    rpcCalls.push({ name, payload })
    return new Promise<RpcResult>((resolve) => {
      open.push(resolve)
    })
  })

  /** Loest die n-te abgeschickte Anfrage auf. */
  function settle(index: number, error: RpcError | null = null) {
    const resolve = open[index]
    if (!resolve) throw new Error(`Es gibt keine Anfrage mit Index ${index}`)
    resolve({ data: null, error })
  }

  return { rpc, rpcCalls, settle }
}

describe('useChainOrder', () => {
  it('schickt erst nach der Ruhezeit, und dann nur einmal', async () => {
    const supabase = createSupabaseStub()
    const chain = useChainOrder(supabase as never)

    chain.save(['a'])
    chain.save(['a', 'b'])
    chain.save(['b', 'a'])
    expect(supabase.rpcCalls).toHaveLength(0)

    await vi.advanceTimersByTimeAsync(400)

    // Fuenf schnelle Zuege duerfen nicht fuenf Anfragen werden - es zaehlt
    // nur der letzte Stand.
    expect(supabase.rpcCalls).toHaveLength(1)
    expect(supabase.rpcCalls[0]).toEqual({
      name: 'set_chain_order',
      payload: { item_ids: ['b', 'a'] },
    })
  })

  it('meldet Erfolg als eigenen Zustand', async () => {
    const supabase = createSupabaseStub()
    const chain = useChainOrder(supabase as never)

    chain.save(['a'])
    await vi.advanceTimersByTimeAsync(400)

    expect(chain.status.value).toBe('saved')
    expect(chain.failed.value).toBe(false)
  })

  it('macht einen Fehlschlag sichtbar, statt ihn zu verschlucken', async () => {
    const supabase = createSupabaseStub({
      rpcResults: { set_chain_order: [{ error: { message: 'boom' } }] },
    })
    const chain = useChainOrder(supabase as never)

    chain.save(['a'])
    await vi.advanceTimersByTimeAsync(400)

    // Ohne diesen Zustand zeigt die Oberflaeche die neue Reihenfolge, und
    // nach einem Neuladen ist sie weg - ohne dass etwas kaputt aussah.
    expect(chain.status.value).toBe('error')
    expect(chain.failed.value).toBe(true)
  })

  it('schickt beim Wiederholen dieselbe Reihenfolge erneut', async () => {
    const supabase = createSupabaseStub({
      rpcResults: { set_chain_order: [{ error: { message: 'boom' } }, { error: null }] },
    })
    const chain = useChainOrder(supabase as never)

    chain.save(['a', 'b'])
    await vi.advanceTimersByTimeAsync(400)
    expect(chain.failed.value).toBe(true)

    chain.retry()
    await vi.advanceTimersByTimeAsync(400)

    expect(supabase.rpcCalls).toHaveLength(2)
    expect(supabase.rpcCalls[1].payload).toEqual({ item_ids: ['a', 'b'] })
    expect(chain.status.value).toBe('saved')
  })

  it('zeigt waehrend des Wartens einen eigenen Zustand', () => {
    const supabase = createSupabaseStub()
    const chain = useChainOrder(supabase as never)

    chain.save(['a'])
    // Noch nicht geschickt - aber der Nutzer hat schon etwas geaendert.
    expect(chain.status.value).toBe('pending')
  })

  it('startet im Leerlauf, nicht in einem der Ausgangszustaende', () => {
    const supabase = createSupabaseStub()
    const chain = useChainOrder(supabase as never)

    expect(chain.status.value).toBe('idle')
    expect(chain.failed.value).toBe(false)
    expect(chain.lastError.value).toBeNull()
  })

  // --- Der Fehler selbst, nicht nur die Tatsache des Fehlers ---------------

  it('haelt den Fehler samt SQLSTATE bereit, statt nur zu merken DASS es schiefging', async () => {
    const supabase = createSupabaseStub({
      rpcResults: {
        set_chain_order: [{ error: { message: 'chain contains item x twice', code: 'RG004' } }],
      },
    })
    const chain = useChainOrder(supabase as never)

    chain.save(['a', 'a'])
    await vi.advanceTimersByTimeAsync(400)

    // RG001 (abgemeldet) und RG005 (fremdes Geraet) verlangen von der
    // Oberflaeche verschiedene Reaktionen. Wer den Code hier wegwirft,
    // zwingt sie zu einem Sammeltext oder an der Kette vorbei zum rpc.
    expect(chain.lastError.value).toEqual({
      message: 'chain contains item x twice',
      code: 'RG004',
    })
  })

  it('raeumt den alten Fehler weg, sobald es wieder klappt', async () => {
    const supabase = createSupabaseStub({
      rpcResults: {
        set_chain_order: [{ error: { message: 'boom', code: 'RG005' } }, { error: null }],
      },
    })
    const chain = useChainOrder(supabase as never)

    chain.save(['a'])
    await vi.advanceTimersByTimeAsync(400)
    expect(chain.lastError.value).not.toBeNull()

    chain.retry()
    await vi.advanceTimersByTimeAsync(400)

    // Sonst haengt neben "gespeichert" noch die alte Fehlermeldung.
    expect(chain.status.value).toBe('saved')
    expect(chain.lastError.value).toBeNull()
  })

  // --- Wettlauf: die Antwort kommt, nachdem weitersortiert wurde -----------

  it('meldet keinen Erfolg fuer einen Stand, der schon ueberholt ist', async () => {
    const supabase = createDeferredSupabase()
    const chain = useChainOrder(supabase as never)

    chain.save(['a', 'b'])
    await vi.advanceTimersByTimeAsync(400)
    expect(supabase.rpcCalls).toHaveLength(1)

    // Der Nutzer sortiert weiter, waehrend die erste Anfrage noch laeuft.
    chain.save(['b', 'a'])
    supabase.settle(0, null)
    await vi.advanceTimersByTimeAsync(0)

    // Der Erfolg gehoert zu [a, b]. [b, a] steht noch nirgends - "gespeichert"
    // waere hier genau die Luege, gegen die dieses Composable gebaut ist.
    expect(chain.status.value).toBe('pending')
    expect(supabase.rpcCalls).toHaveLength(2)
    expect(supabase.rpcCalls[1].payload).toEqual({ item_ids: ['b', 'a'] })

    supabase.settle(1, null)
    await vi.advanceTimersByTimeAsync(0)
    expect(chain.status.value).toBe('saved')

    // Der Timer aus dem zweiten save() darf denselben Stand nicht noch
    // einmal schicken.
    await vi.advanceTimersByTimeAsync(1000)
    expect(supabase.rpcCalls).toHaveLength(2)
  })

  it('meldet keinen Fehlschlag fuer einen Stand, der schon ueberholt ist', async () => {
    const supabase = createDeferredSupabase()
    const chain = useChainOrder(supabase as never)

    chain.save(['a', 'b'])
    await vi.advanceTimersByTimeAsync(400)

    chain.save(['b', 'a'])
    supabase.settle(0, { message: 'boom', code: 'RG005' })
    await vi.advanceTimersByTimeAsync(0)

    // Sonst ein Fehlalarm fuer eine Reihenfolge, die ohnehin gleich
    // ueberschrieben wird.
    expect(chain.status.value).toBe('pending')
    expect(chain.failed.value).toBe(false)
    expect(chain.lastError.value).toBeNull()

    supabase.settle(1, null)
    await vi.advanceTimersByTimeAsync(0)
    expect(chain.status.value).toBe('saved')
  })

  it('schickt nie zwei Anfragen gleichzeitig - sonst gewinnt auf der Datenbank die langsamere', async () => {
    const supabase = createDeferredSupabase()
    const chain = useChainOrder(supabase as never)

    chain.save(['a', 'b'])
    await vi.advanceTimersByTimeAsync(400)
    expect(supabase.rpcCalls).toHaveLength(1)

    // Zweiter Stand, dessen Ruhezeit ablaeuft, waehrend der erste noch fliegt.
    chain.save(['b', 'a'])
    await vi.advanceTimersByTimeAsync(400)
    expect(supabase.rpcCalls).toHaveLength(1)

    supabase.settle(0, null)
    await vi.advanceTimersByTimeAsync(0)
    expect(supabase.rpcCalls).toHaveLength(2)
    expect(supabase.rpcCalls[1].payload).toEqual({ item_ids: ['b', 'a'] })
  })

  // --- Aufraeumen ----------------------------------------------------------

  it('schickt beim Aufraeumen den offenen Stand sofort, statt ihn zu verlieren', async () => {
    const supabase = createSupabaseStub()
    const scope = effectScope()
    let chain!: ReturnType<typeof useChainOrder>
    scope.run(() => {
      chain = useChainOrder(supabase as never)
    })

    chain.save(['a', 'b'])
    scope.stop()
    await vi.advanceTimersByTimeAsync(0)

    // Verwerfen waere der stille Verlust: der Nutzer hat sortiert, die Seite
    // ist weg, die Aenderung nie angekommen.
    expect(supabase.rpcCalls).toHaveLength(1)
    expect(supabase.rpcCalls[0].payload).toEqual({ item_ids: ['a', 'b'] })

    // Und der abgeraeumte Timer darf nicht nachtroepfeln.
    await vi.advanceTimersByTimeAsync(1000)
    expect(supabase.rpcCalls).toHaveLength(1)
  })

  it('schickt beim Aufraeumen nichts, wenn gar nichts offen war', async () => {
    const supabase = createSupabaseStub()
    const scope = effectScope()
    scope.run(() => {
      useChainOrder(supabase as never)
    })

    scope.stop()
    await vi.advanceTimersByTimeAsync(400)

    expect(supabase.rpcCalls).toHaveLength(0)
  })

  it('laesst sich ausserhalb eines Scopes benutzen', () => {
    const supabase = createSupabaseStub()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const chain = useChainOrder(supabase as never)
    chain.save(['a'])

    // onScopeDispose() warnt ohne aktiven Scope - Tests und Skripte sollen
    // dieses Composable trotzdem geradeheraus aufrufen koennen.
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  // --- Wiederholen ---------------------------------------------------------

  it('tut beim Wiederholen nichts, wenn nie etwas zu speichern war', async () => {
    const supabase = createSupabaseStub()
    const chain = useChainOrder(supabase as never)

    chain.retry()
    await vi.advanceTimersByTimeAsync(400)

    expect(supabase.rpcCalls).toHaveLength(0)
    expect(chain.status.value).toBe('idle')
  })

  it('wiederholt auch die leere Kette', async () => {
    // Das leere Array ist laut Migration ausdruecklich kein Fehler, sondern
    // der Wunsch "Kette leeren" - ein Wiederholen darf daran nicht scheitern.
    const supabase = createSupabaseStub({
      rpcResults: { set_chain_order: [{ error: { message: 'boom' } }, { error: null }] },
    })
    const chain = useChainOrder(supabase as never)

    chain.save([])
    await vi.advanceTimersByTimeAsync(400)
    expect(chain.failed.value).toBe(true)

    chain.retry()
    await vi.advanceTimersByTimeAsync(400)

    expect(supabase.rpcCalls).toHaveLength(2)
    expect(supabase.rpcCalls[1].payload).toEqual({ item_ids: [] })
    expect(chain.status.value).toBe('saved')
  })

  // --- Geworfene Ausnahme statt zurueckgegebenem Fehler --------------------

  it('macht auch eine geworfene Ausnahme sichtbar, statt sie als Rejection zu verlieren', async () => {
    const rpc = vi
      .fn()
      .mockRejectedValueOnce(new Error('Netzwerk weg'))
      .mockResolvedValue({ data: null, error: null })
    const chain = useChainOrder({ rpc } as never)

    chain.save(['a'])
    await vi.advanceTimersByTimeAsync(400)

    expect(chain.status.value).toBe('error')
    expect(chain.lastError.value).toEqual({ message: 'Netzwerk weg' })

    // Und der Durchgang darf danach nicht verklemmt sein - sonst kaeme nach
    // einem einzigen Netzwerkfehler nie wieder etwas an.
    chain.retry()
    await vi.advanceTimersByTimeAsync(400)
    expect(rpc).toHaveBeenCalledTimes(2)
    expect(chain.status.value).toBe('saved')
  })

  it('haelt die uebergebene Liste fest, auch wenn der Aufrufer sie danach weiterdreht', async () => {
    const supabase = createSupabaseStub()
    const chain = useChainOrder(supabase as never)

    const order = ['a', 'b']
    chain.save(order)
    order.reverse()
    await vi.advanceTimersByTimeAsync(400)

    // Drag-and-Drop-Bibliotheken sortieren das Modell gern an Ort und Stelle.
    expect(supabase.rpcCalls[0].payload).toEqual({ item_ids: ['a', 'b'] })
  })
})
