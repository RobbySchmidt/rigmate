// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, Suspense, ref as vueRef } from 'vue'
import ProfilePage from '../../app/pages/profile/[id].vue'
import { installNuxtAutoImports, stubDefinePageMeta, stubUseAsyncData } from '../helpers/nuxtAutoImports'
import { useUserId } from '../../app/composables/useUserId'
import { createSupabaseStub, type SupabaseStubConfig } from '../helpers/supabaseStub'
import { de } from '../../app/locales/de'

// Minimaler Ersatz fuer NuxtLink, wie in tests/component/gear.test.ts.
const NuxtLinkStub = defineComponent({
  props: ['to'],
  setup(props, { slots }) {
    return () => h('a', { href: props.to }, slots.default?.())
  },
})

function fakeProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: 'alice-1',
    display_name: 'Alice Ampeg',
    real_name: null,
    bio: null,
    avatar_path: null,
    bands: [],
    links: [],
    ...overrides,
  }
}

function fakeGearRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'g1',
    year: 2018,
    finish: null,
    modifications: null,
    catalog_items: {
      slug: 'fender-stratocaster',
      name: 'Stratocaster',
      category_id: 'guitar',
      brands: { name: 'Fender' },
    },
    ...overrides,
  }
}

// profile/[id].vue hat eine asynchrone setup() (vier await useAsyncData()-
// Aufrufe) - dafuer verlangt Vue eine Suspense-Grenze, wie bei rig.vue.
async function mountProfile(routeId: string, viewerSub: string | null, reads: SupabaseStubConfig['initialReads']) {
  installNuxtAutoImports()
  stubDefinePageMeta()
  stubUseAsyncData()
  vi.stubGlobal('useRoute', () => ({ params: { id: routeId } }))
  const supabase = createSupabaseStub({ initialReads: reads })
  vi.stubGlobal('useSupabaseClient', () => supabase)
  // Claims-Form wie das echte @nuxtjs/supabase-Modul (sub, kein id) - siehe
  // app/composables/useUserId.ts. useUserId() ist die echte Implementierung.
  vi.stubGlobal('useSupabaseUser', () => vueRef(viewerSub ? { sub: viewerSub } : null))
  vi.stubGlobal('useUserId', useUserId)

  const wrapper = mount(
    defineComponent({
      render: () => h(Suspense, null, { default: () => h(ProfilePage) }),
    }),
    { global: { components: { NuxtLink: NuxtLinkStub } } },
  )
  await flushPromises()
  return wrapper
}

describe('profile/[id].vue - Rig anzeigen', () => {
  it('zeigt das Rig eines fremden Profils', async () => {
    const wrapper = await mountProfile('alice-1', 'bob-1', {
      profiles: { data: fakeProfile() },
      gear_items: { data: [fakeGearRow()] },
      wishlist_items: { data: [] },
      preferences: { data: [] },
    })

    expect(wrapper.text()).toContain('Alice Ampeg')
    expect(wrapper.text()).toContain('Fender Stratocaster')
    expect(wrapper.text()).toContain('2018')
    expect(wrapper.text()).not.toContain(de.profile.emptyRig)
  })

  it('zeigt den Leer-Hinweis, wenn noch kein Equipment eingetragen ist', async () => {
    const wrapper = await mountProfile('alice-1', 'bob-1', {
      profiles: { data: fakeProfile() },
      gear_items: { data: [] },
      wishlist_items: { data: [] },
      preferences: { data: [] },
    })

    expect(wrapper.text()).toContain(de.profile.emptyRig)
  })

  it('zeigt einen Fehlertext statt eines leeren Abschnitts, wenn das Rig nicht geladen werden kann', async () => {
    const wrapper = await mountProfile('alice-1', 'bob-1', {
      profiles: { data: fakeProfile() },
      gear_items: { data: null, error: { message: 'network down' } },
      wishlist_items: { data: [] },
      preferences: { data: [] },
    })

    // Ein Fehlschlag darf nicht wie "kein Equipment eingetragen" aussehen -
    // genau die Verwechslung, die diese Seite verhindern soll.
    expect(wrapper.text()).toContain(de.profile.loadError)
    expect(wrapper.text()).not.toContain(de.profile.emptyRig)
  })
})

describe('profile/[id].vue - Bearbeiten-Link nur im eigenen Profil', () => {
  it('zeigt den Bearbeiten-Link im eigenen Profil', async () => {
    const wrapper = await mountProfile('alice-1', 'alice-1', {
      profiles: { data: fakeProfile({ id: 'alice-1' }) },
      gear_items: { data: [] },
      wishlist_items: { data: [] },
      preferences: { data: [] },
    })

    expect(wrapper.text()).toContain(de.profile.editCta)
    expect(wrapper.text()).toContain(de.profile.ownProfile)
  })

  it('zeigt den Bearbeiten-Link nicht im fremden Profil', async () => {
    const wrapper = await mountProfile('alice-1', 'bob-1', {
      profiles: { data: fakeProfile({ id: 'alice-1' }) },
      gear_items: { data: [] },
      wishlist_items: { data: [] },
      preferences: { data: [] },
    })

    expect(wrapper.text()).not.toContain(de.profile.editCta)
  })
})
