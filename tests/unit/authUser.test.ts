import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createError } from 'h3'

// server/utils/authUser.ts importiert serverSupabaseUser aus '#supabase/server' -
// einem Nuxt-Alias, den es ausserhalb der Nuxt-Build-Pipeline gar nicht gibt.
// vi.mock() faengt den Import ab, bevor Vitest ihn aufzuloesen versucht.
const serverSupabaseUserMock = vi.fn()
vi.mock('#supabase/server', () => ({
  serverSupabaseUser: serverSupabaseUserMock,
}))

const { normalizeUserId, requireUserId } = await import('../../server/utils/authUser')

beforeEach(() => {
  serverSupabaseUserMock.mockReset()
  // createError ist in Nitro ein globaler Auto-Import (siehe
  // server/utils/catalogSnapshot.ts fuer ein Vorbild) - ausserhalb davon
  // muss der echte h3-createError als Stub bereitstehen, genau wie
  // installNuxtAutoImports() es fuer ref/computed/useText auf der
  // Client-Seite tut. vitest.config.ts setzt unstubGlobals: true, das raeumt
  // den Stub nach jedem Test wieder ab - deshalb hier statt einmalig oben.
  vi.stubGlobal('createError', createError)
})

describe('normalizeUserId', () => {
  it('nimmt sub, wenn kein id vorhanden ist - der Fall, der bei jedem echten Login tatsaechlich auftritt', () => {
    // @nuxtjs/supabase 2.0.10s serverSupabaseUser() liefert genau diese
    // Form (siehe authUser.ts fuer die ausfuehrliche Begruendung) - ein
    // echter Login hat claims.sub und ueberhaupt kein claims.id.
    expect(normalizeUserId({ sub: 'user-123' })).toBe('user-123')
  })

  it('faellt auf id zurueck, falls das Modul irgendwann wieder ein echtes User-Objekt liefert', () => {
    expect(normalizeUserId({ id: 'user-456' })).toBe('user-456')
  })

  it('bevorzugt sub, wenn beide Felder vorhanden sind', () => {
    expect(normalizeUserId({ sub: 'sub-id', id: 'other-id' })).toBe('sub-id')
  })

  it('liefert null ohne jede brauchbare Id', () => {
    expect(normalizeUserId(null)).toBeNull()
    expect(normalizeUserId(undefined)).toBeNull()
    expect(normalizeUserId({})).toBeNull()
  })
})

describe('requireUserId', () => {
  it('liefert die Id aus sub, wenn die Claims kein id tragen', async () => {
    serverSupabaseUserMock.mockResolvedValue({ sub: 'user-123' })
    await expect(requireUserId({} as any)).resolves.toBe('user-123')
  })

  it('wirft 401, wenn niemand angemeldet ist', async () => {
    serverSupabaseUserMock.mockResolvedValue(null)
    await expect(requireUserId({} as any)).rejects.toMatchObject({ statusCode: 401 })
  })
})
