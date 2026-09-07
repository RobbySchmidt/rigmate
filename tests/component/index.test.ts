// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, Suspense } from 'vue'
import IndexPage from '../../app/pages/index.vue'
import PersonSuggestion from '../../app/components/PersonSuggestion.vue'
import { installNuxtAutoImports, stubDefinePageMeta, stubUseFetch } from '../helpers/nuxtAutoImports'
import { useRecommendationReason } from '../../app/composables/useRecommendationReason'
import { de } from '../../app/locales/de'

// Minimaler Ersatz fuer NuxtLink: ausserhalb von Nuxt gibt es die
// Komponente nicht, aber ein einfaches <a> reicht, um Sichtbarkeit und
// Zieltext im Test zu pruefen.
const NuxtLinkStub = defineComponent({
  props: ['to'],
  setup(props, { slots }) {
    return () => h('a', { href: props.to }, slots.default?.())
  },
})

// index.vue hat eine asynchrone setup() (ein "await useFetch(...)") - dafuer
// verlangt Vue offiziell eine Suspense-Grenze, genau wie bei rig.vue (siehe
// dortiger Kommentar in tests/component/rig.test.ts).
async function mountIndex(response: { fallback: boolean; suggestions: any[] }) {
  installNuxtAutoImports()
  stubDefinePageMeta()
  stubUseFetch(response)
  vi.stubGlobal('useRecommendationReason', useRecommendationReason)

  const wrapper = mount(
    defineComponent({
      render: () => h(Suspense, null, { default: () => h(IndexPage) }),
    }),
    { global: { components: { PersonSuggestion, NuxtLink: NuxtLinkStub } } },
  )
  await flushPromises()
  return wrapper
}

describe('index.vue - Ersatzmodus', () => {
  it('erklaert die Leere und kennzeichnet die Fuellung als zufaellig, statt sie zu kaschieren', async () => {
    const wrapper = await mountIndex({
      fallback: true,
      suggestions: [
        { userId: 'random-1', displayName: 'Zufalls-Nutzer', avatarPath: null, score: 0, matchCount: 0, reason: null },
      ],
    })

    // Die Leere wird erklaert, nicht kaschiert.
    expect(wrapper.text()).toContain(de.suggestions.emptyTitle)
    expect(wrapper.text()).toContain(de.suggestions.emptyBody)
    expect(wrapper.text()).not.toContain(de.suggestions.refineHint)

    // Und jede Zufalls-Fuellung traegt sichtbar ihre eigene, eigens dafuer
    // vorgesehene Kennzeichnung - nicht nur zufaellig denselben Text wie die
    // (bei fehlendem Grund ebenfalls auf "Zufaellig ausgewaehlt" lautende)
    // Begruendungszeile.
    const card = wrapper.findComponent(PersonSuggestion)
    expect(card.props('reason')).toBeNull()
    const badge = card.find('[data-fallback]')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toBe(de.suggestions.fallbackBadge)
  })
})

describe('index.vue - echte Treffer', () => {
  it('zeigt zu einem Vorschlag seinen Grund statt eines leeren Zustands', async () => {
    const wrapper = await mountIndex({
      fallback: false,
      suggestions: [
        {
          userId: 'bob-1',
          displayName: 'Bob Bassman',
          avatarPath: null,
          score: 1.2,
          matchCount: 1,
          reason: { kind: 'gear', depth: 'line', catalogItemId: 'klon-1', brandName: 'Klon', name: 'Centaur' },
        },
      ],
    })

    expect(wrapper.text()).toContain('Bob Bassman')
    // "Spielt auch: Klon Centaur" - bewusst ohne Artikel (siehe
    // useRecommendationReason.ts).
    expect(wrapper.text()).toContain(`${de.suggestions.reasonKind.gear}: Klon Centaur`)
    expect(wrapper.text()).not.toContain(de.suggestions.emptyTitle)
    expect(wrapper.text()).not.toContain(de.suggestions.fallbackBadge)
  })
})
