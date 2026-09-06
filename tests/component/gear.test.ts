// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, Suspense, ref as vueRef } from 'vue'
import GearPage from '../../app/pages/gear/[slug].vue'
import { installNuxtAutoImports, stubUseFetch } from '../helpers/nuxtAutoImports'
import { de } from '../../app/locales/de'

// Minimaler Ersatz fuer NuxtLink: ausserhalb von Nuxt gibt es die
// Komponente nicht, aber ein einfaches <a> reicht fuer diesen Test.
const NuxtLinkStub = defineComponent({
  props: ['to'],
  setup(props, { slots }) {
    return () => h('a', { href: props.to }, slots.default?.())
  },
})

function fakeGearPageData(overrides: Record<string, unknown> = {}) {
  return {
    item: {
      id: 'strat-1',
      slug: 'fender-stratocaster',
      name: 'Stratocaster',
      brandName: 'Fender',
      categoryId: 'guitar',
      level: 'line',
      rarityBase: 'mass',
      imagePath: null,
      isVerified: true,
    },
    line: null,
    variants: [],
    stats: { ownerCount: 3, wishCount: 1, rarity: 0.2 },
    players: null,
    ...overrides,
  }
}

// gear/[slug].vue hat eine asynchrone setup() (ein "await useFetch(...)") -
// dafuer verlangt Vue offiziell eine Suspense-Grenze, genau wie bei
// index.vue (siehe dortiger Kommentar in tests/component/index.test.ts).
async function mountGearPage(data: ReturnType<typeof fakeGearPageData>, signedInAs: string | null) {
  installNuxtAutoImports()
  stubUseFetch(data)
  vi.stubGlobal('useRoute', () => ({ params: { slug: data.item.slug } }))
  vi.stubGlobal('useSeoMeta', () => {})
  vi.stubGlobal('useSupabaseUser', () => vueRef(signedInAs ? { sub: signedInAs } : null))

  const wrapper = mount(
    defineComponent({
      render: () => h(Suspense, null, { default: () => h(GearPage) }),
    }),
    { global: { components: { NuxtLink: NuxtLinkStub } } },
  )
  await flushPromises()
  return wrapper
}

describe('gear/[slug].vue - abgemeldet', () => {
  it('zeigt die Spielerzahl und den Anmelde-Hinweis, aber keine Namen', async () => {
    const wrapper = await mountGearPage(fakeGearPageData({ players: null }), null)

    // Abschnitt 10: die Zahl ist oeffentlich, die Namen nicht.
    expect(wrapper.text()).toContain(de.gearPage.playersCount.replace('{count}', '3'))
    expect(wrapper.text()).toContain(de.gearPage.signInToSeePlayers)
    expect(wrapper.text()).not.toContain('Alice Ampeg')
  })
})

describe('gear/[slug].vue - angemeldet', () => {
  it('listet die Spieler beim Namen', async () => {
    const wrapper = await mountGearPage(
      fakeGearPageData({
        players: [
          { userId: 'alice-1', displayName: 'Alice Ampeg', year: 2018, finish: 'Sonic Blue' },
          { userId: 'bob-1', displayName: 'Bob Bassman', year: null, finish: null },
        ],
      }),
      'alice-1',
    )

    expect(wrapper.text()).not.toContain(de.gearPage.signInToSeePlayers)
    expect(wrapper.text()).toContain('Alice Ampeg')
    expect(wrapper.text()).toContain('Bob Bassman')
    expect(wrapper.text()).toContain('2018')
    expect(wrapper.text()).toContain('Sonic Blue')
  })
})
