import { describe, it, expect } from 'vitest'
import { adminClient, anonClient } from '../helpers/supabase'

describe('Supabase-Verbindung', () => {
  it('erreicht die gehostete Instanz mit dem service_role key', async () => {
    const { error } = await adminClient().auth.admin.listUsers({ page: 1, perPage: 1 })
    expect(error).toBeNull()
  })

  it('erreicht die Instanz mit dem anon key', async () => {
    const { error } = await anonClient().auth.getSession()
    expect(error).toBeNull()
  })
})
