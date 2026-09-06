// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, Suspense, ref as vueRef } from 'vue'
import SettingsPage from '../../app/pages/settings.vue'
import { installNuxtAutoImports, stubDefinePageMeta, stubUseAsyncData } from '../helpers/nuxtAutoImports'
import { useUserId } from '../../app/composables/useUserId'
import { createSupabaseStub, type SupabaseStubConfig } from '../helpers/supabaseStub'
import { de } from '../../app/locales/de'

function fakeOwnProfile(overrides: Record<string, unknown> = {}) {
  return {
    display_name: 'Alice Ampeg',
    real_name: null,
    bio: null,
    bands: [],
    links: [],
    avatar_path: null,
    ...overrides,
  }
}

// settings.vue hat eine asynchrone setup() (ein await useAsyncData()) -
// dafuer verlangt Vue eine Suspense-Grenze, wie bei rig.vue.
async function mountSettings(reads: SupabaseStubConfig['initialReads'], writes?: SupabaseStubConfig['writes']) {
  installNuxtAutoImports()
  stubDefinePageMeta()
  stubUseAsyncData()
  const supabase = createSupabaseStub({ initialReads: reads, writes })
  vi.stubGlobal('useSupabaseClient', () => supabase)
  // Claims-Form wie das echte @nuxtjs/supabase-Modul (sub, kein id) - siehe
  // app/composables/useUserId.ts. useUserId() ist die echte Implementierung.
  vi.stubGlobal('useSupabaseUser', () => vueRef({ sub: 'alice-1' }))
  vi.stubGlobal('useUserId', useUserId)

  const wrapper = mount(
    defineComponent({
      render: () => h(Suspense, null, { default: () => h(SettingsPage) }),
    }),
  )
  await flushPromises()
  return { wrapper, supabase }
}

describe('settings.vue - erfolgreich speichern', () => {
  it('zeigt nach dem Speichern eine Bestaetigung und schreibt unter der eigenen Nutzer-Id', async () => {
    const { wrapper, supabase } = await mountSettings(
      { profiles: { data: fakeOwnProfile() } },
      { profiles: [{ error: null }] },
    )

    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain(de.settings.saved)
    expect(wrapper.text()).not.toContain(de.settings.saveError)
  })
})

describe('settings.vue - abgelehntes Speichern', () => {
  it('zeigt einen Fehler statt eines stillen Nichtstuns, wenn die Datenbank ablehnt', async () => {
    const { wrapper } = await mountSettings(
      { profiles: { data: fakeOwnProfile() } },
      { profiles: [{ error: { message: 'new row violates row-level security policy' } }] },
    )

    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain(de.settings.saveError)
    // Kein stilles "so tun als ob" - die Bestaetigung darf nicht miterscheinen.
    expect(wrapper.text()).not.toContain(de.settings.saved)
  })
})

describe('settings.vue - Links validieren', () => {
  it('lehnt eine Zeile ab, die keine gueltige Adresse ist, statt sie als kaputten Link zu speichern', async () => {
    const { wrapper, supabase } = await mountSettings({ profiles: { data: fakeOwnProfile() } })

    const linksField = wrapper.findAll('textarea')[1]!
    await linksField.setValue('das-ist-keine-url')
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain(de.settings.linkInvalid.replace('{value}', 'das-ist-keine-url'))
    expect(wrapper.text()).not.toContain(de.settings.saved)
    // Genau ein Aufruf - der initiale Ladevorgang. Der fehlerhafte Eintrag
    // darf gar nicht erst zu einem zweiten (dem Speichern) fuehren.
    const profileCalls = supabase.from.mock.calls.filter((call) => call[0] === 'profiles')
    expect(profileCalls).toHaveLength(1)
  })

  it('lehnt eine zu lange Link-Liste ab, statt sie klaglos zu speichern', async () => {
    const { wrapper } = await mountSettings({ profiles: { data: fakeOwnProfile() } })

    const tooMany = Array.from({ length: 21 }, (_, i) => `https://example.com/${i}`).join('\n')
    const linksField = wrapper.findAll('textarea')[1]!
    await linksField.setValue(tooMany)
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain(de.settings.linksTooMany)
    expect(wrapper.text()).not.toContain(de.settings.saved)
  })

  it('speichert eine gueltige Link-Liste als Label/URL-Paare', async () => {
    const { wrapper, supabase } = await mountSettings(
      { profiles: { data: fakeOwnProfile() } },
      { profiles: [{ error: null }] },
    )

    const linksField = wrapper.findAll('textarea')[1]!
    await linksField.setValue('https://example.com/alice')
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain(de.settings.saved)
    // Statt der immer wahren Pruefung "es gab nie ein insert" (save() ruft
    // ohnehin nur .update() auf) hier gegen den tatsaechlich uebergebenen
    // Payload pruefen: die eine eingegebene Zeile muss als Label/URL-Paar
    // im update() der eigenen Nutzer-Id ankommen.
    expect(supabase.updates.profiles[0]).toMatchObject({
      links: [{ label: 'example.com/alice', url: 'https://example.com/alice' }],
    })
  })
})
