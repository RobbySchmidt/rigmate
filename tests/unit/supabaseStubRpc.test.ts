import { describe, it, expect } from 'vitest'
import { createSupabaseStub } from '../helpers/supabaseStub'

describe('supabaseStub.rpc', () => {
  it('zeichnet Name und Nutzlast jedes Aufrufs auf', async () => {
    const supabase = createSupabaseStub()
    await supabase.rpc('set_chain_order', { item_ids: ['a', 'b'] })

    expect(supabase.rpcCalls).toEqual([
      { name: 'set_chain_order', payload: { item_ids: ['a', 'b'] } },
    ])
  })

  it('gibt konfigurierte Fehler zurueck, statt zu werfen', async () => {
    const supabase = createSupabaseStub({
      rpcResults: { set_chain_order: [{ error: { message: 'boom' } }] },
    })

    const { error } = await supabase.rpc('set_chain_order', { item_ids: [] })
    expect(error).toEqual({ message: 'boom' })
  })

  it('arbeitet mehrere Ergebnisse der Reihe nach ab', async () => {
    const supabase = createSupabaseStub({
      rpcResults: {
        set_chain_order: [{ error: { message: 'erster Versuch' } }, { error: null }],
      },
    })

    const first = await supabase.rpc('set_chain_order', { item_ids: [] })
    const second = await supabase.rpc('set_chain_order', { item_ids: [] })

    expect(first.error).toEqual({ message: 'erster Versuch' })
    expect(second.error).toBeNull()
  })
})
