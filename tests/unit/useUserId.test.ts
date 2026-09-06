import { describe, it, expect, vi } from 'vitest'
import { ref as vueRef } from 'vue'
import { installNuxtAutoImports } from '../helpers/nuxtAutoImports'
import { useUserId } from '../../app/composables/useUserId'

describe('useUserId', () => {
  it('nimmt sub, wenn die Claims kein id tragen - der Fall, den ein echter Login liefert', () => {
    installNuxtAutoImports()
    vi.stubGlobal('useSupabaseUser', () => vueRef({ sub: 'user-123' }))

    expect(useUserId().value).toBe('user-123')
  })

  it('faellt auf id zurueck, falls das Modul irgendwann wieder ein echtes User-Objekt liefert', () => {
    installNuxtAutoImports()
    vi.stubGlobal('useSupabaseUser', () => vueRef({ id: 'user-456' }))

    expect(useUserId().value).toBe('user-456')
  })

  it('liefert null ohne angemeldeten Nutzer', () => {
    installNuxtAutoImports()
    vi.stubGlobal('useSupabaseUser', () => vueRef(null))

    expect(useUserId().value).toBeNull()
  })
})
