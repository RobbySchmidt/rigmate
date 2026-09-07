// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, ref as vueRef } from 'vue'
import DefaultLayout from '../../app/layouts/default.vue'
import { installNuxtAutoImports } from '../helpers/nuxtAutoImports'
import { useUserId } from '../../app/composables/useUserId'
import { de } from '../../app/locales/de'

const NuxtLinkStub = defineComponent({
  props: ['to'],
  setup(props, { slots }) {
    return () => h('a', { href: props.to }, slots.default?.())
  },
})

// Claims-Form wie das echte @nuxtjs/supabase-Modul: die Id steckt unter
// "sub", nicht unter "id". useUserId() ist die echte Implementierung, damit
// dieser Test den Fallstrick wirklich abdeckt statt ihn nachzubauen.
function mountLayout(viewerSub: string | null) {
  installNuxtAutoImports()
  vi.stubGlobal('useSupabaseUser', () => vueRef(viewerSub ? { sub: viewerSub } : null))
  vi.stubGlobal('useSupabaseClient', () => ({ auth: { signOut: vi.fn() } }))
  vi.stubGlobal('useUserId', useUserId)
  vi.stubGlobal('navigateTo', vi.fn())

  return mount(DefaultLayout, {
    global: { components: { NuxtLink: NuxtLinkStub } },
  })
}

describe('Layout-Navigation', () => {
  it('fuehrt Angemeldete zu ihrem eigenen Profil', () => {
    const wrapper = mountLayout('alice-1')
    const hrefs = wrapper.findAll('a').map((link) => link.attributes('href'))

    // Ohne diesen Link ist das eigene Profil unerreichbar: alle anderen Wege
    // dorthin (Suche, Gear-Seite, Vorschlaege) fuehren zu FREMDEN Profilen.
    // Damit waere auch der Bearbeitungsmodus der Signalkette unerreichbar,
    // den es nur auf dem eigenen Profil gibt.
    expect(hrefs).toContain('/profile/alice-1')
  })

  it('benennt den Link so, dass er als eigenes Profil erkennbar ist', () => {
    const wrapper = mountLayout('alice-1')
    expect(wrapper.text()).toContain(de.nav.profile)
  })

  it('baut die Id aus den Claims, nicht aus einem User-Objekt', () => {
    const wrapper = mountLayout('alice-1')
    const hrefs = wrapper.findAll('a').map((link) => link.attributes('href'))

    // Der Fallstrick dieses Projekts: @nuxtjs/supabase liefert Claims mit
    // "sub", kein User-Objekt mit "id". Ein Griff auf user.value.id ergaebe
    // "/profile/undefined" - ein Link, der aussieht wie jeder andere und ins
    // Leere fuehrt. Das hat hier schon einmal acht Schreibstellen lahmgelegt.
    expect(hrefs).not.toContain('/profile/undefined')
  })

  it('zeigt Nicht-Angemeldeten keinen Profil-Link', () => {
    const wrapper = mountLayout(null)
    const hrefs = wrapper.findAll('a').map((link) => link.attributes('href'))

    expect(hrefs.some((href) => href?.startsWith('/profile/'))).toBe(false)
    expect(wrapper.text()).not.toContain(de.nav.profile)
  })
})
