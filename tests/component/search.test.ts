// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, Suspense, ref as vueRef } from 'vue'
import SearchPage from '../../app/pages/search.vue'
import { installNuxtAutoImports, stubUseFetch } from '../helpers/nuxtAutoImports'
import { createRequestGuard } from '../../app/utils/requestGuard'
import { de } from '../../app/locales/de'

// Minimaler Ersatz fuer NuxtLink: ausserhalb von Nuxt gibt es die
// Komponente nicht, aber ein einfaches <a> reicht fuer diesen Test.
const NuxtLinkStub = defineComponent({
  props: ['to'],
  setup(props, { slots }) {
    return () => h('a', { href: props.to }, slots.default?.())
  },
})

function fakeSearchResponse(overrides: Record<string, unknown> = {}) {
  return {
    catalog: [
      { id: 'ac30-1', slug: 'vox-ac30', name: 'AC30', brandName: 'Vox', categoryId: 'amp', level: 'line' },
    ],
    people: [],
    ...overrides,
  }
}

// search.vue hat eine asynchrone setup() (ein "await useFetch(...)") - dafuer
// verlangt Vue offiziell eine Suspense-Grenze, genau wie bei gear/[slug].vue
// (siehe dortiger Kommentar in tests/component/gear.test.ts).
async function mountSearchPage(data: ReturnType<typeof fakeSearchResponse>, signedInAs: string | null) {
  installNuxtAutoImports()
  stubUseFetch(data)
  // createRequestGuard() ist app/utils/requestGuard.ts - unter echtem Nuxt
  // per Auto-Import verfuegbar (genau wie in CatalogPicker.vue genutzt),
  // hier von Hand als Global bereitgestellt, wie es index.test.ts fuer
  // useRecommendationReason() ebenfalls tut.
  vi.stubGlobal('createRequestGuard', createRequestGuard)
  vi.stubGlobal('useRoute', () => ({ query: {} }))
  vi.stubGlobal('useRouter', () => ({ replace: vi.fn().mockResolvedValue(undefined) }))
  vi.stubGlobal('useSupabaseUser', () => vueRef(signedInAs ? { sub: signedInAs } : null))

  const wrapper = mount(
    defineComponent({
      render: () => h(Suspense, null, { default: () => h(SearchPage) }),
    }),
    { global: { components: { NuxtLink: NuxtLinkStub } } },
  )
  await flushPromises()
  return wrapper
}

describe('search.vue - abgemeldet', () => {
  it('zeigt Equipment-Treffer auch ohne Login', async () => {
    const wrapper = await mountSearchPage(fakeSearchResponse(), null)

    // Abschnitt 10: der Katalog ist das Schaufenster, oeffentlich sichtbar.
    expect(wrapper.text()).toContain('Vox AC30')
  })

  it('zeigt den Anmelde-Hinweis statt einer Personenliste', async () => {
    const wrapper = await mountSearchPage(
      fakeSearchResponse({ people: [{ userId: 'zappa-1', displayName: 'Zappa Zweitname' }] }),
      null,
    )

    // Selbst wenn die Antwort Treffer enthaelt, zeigt eine abgemeldete
    // Person sie nicht - keine leere Liste, die "niemand gefunden"
    // vortaeuscht, sondern der ehrliche Hinweis.
    expect(wrapper.text()).toContain(de.search.peopleLoginHint)
    expect(wrapper.text()).not.toContain('Zappa Zweitname')
  })
})

describe('search.vue - angemeldet', () => {
  it('zeigt Personen-Treffer', async () => {
    const wrapper = await mountSearchPage(
      fakeSearchResponse({ people: [{ userId: 'zappa-1', displayName: 'Zappa Zweitname' }] }),
      'zappa-1',
    )

    expect(wrapper.text()).not.toContain(de.search.peopleLoginHint)
    expect(wrapper.text()).toContain('Zappa Zweitname')
  })
})

describe('search.vue - Fehlerfall', () => {
  // Fix-Runde 1: ein fehlgeschlagenes $fetch setzte data still auf leere
  // Listen zurueck - ununterscheidbar von einer echten Null-Treffer-Antwort.
  // Genau wie CatalogPicker.vue > "zeigt bei einer fehlgeschlagenen Suche
  // einen Fehlertext statt einer veralteten Liste" (tests/component/catalogPicker.test.ts).
  it('zeigt bei einer fehlgeschlagenen Suche einen Fehlertext statt einer leeren Liste', async () => {
    const wrapper = await mountSearchPage(fakeSearchResponse(), null)
    expect(wrapper.text()).toContain('Vox AC30')

    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(new Error('network down')))

    await wrapper.get('input').setValue('marshall')
    // 200ms Debounce in search.vue plus Puffer - echte Timer, wie bereits in
    // tests/component/catalogPicker.test.ts fuer denselben Zweck genutzt.
    await new Promise((resolve) => setTimeout(resolve, 250))
    await flushPromises()

    expect(wrapper.text()).toContain(de.search.searchError)
    // Weder die veraltete Trefferliste noch der "nichts gefunden"-Text -
    // ein Fehlschlag darf mit keinem der beiden verwechselbar sein.
    expect(wrapper.text()).not.toContain('Vox AC30')
    expect(wrapper.text()).not.toContain(de.search.noResults)
  })

  it('zeigt bei einem fehlgeschlagenen ersten Laden ebenfalls den Fehlertext statt eines leeren Ergebnisses', async () => {
    // useFetch() wirft bei einem Fehler nicht - es fuellt `error`, waehrend
    // `data` null bleibt. Ungeprueft saehe das erste Laden dann genauso aus
    // wie eine echte Null-Treffer-Antwort.
    installNuxtAutoImports()
    stubUseFetch(null, new Error('network down'))
    vi.stubGlobal('createRequestGuard', createRequestGuard)
    vi.stubGlobal('useRoute', () => ({ query: {} }))
    vi.stubGlobal('useRouter', () => ({ replace: vi.fn().mockResolvedValue(undefined) }))
    vi.stubGlobal('useSupabaseUser', () => vueRef(null))

    const wrapper = mount(
      defineComponent({
        render: () => h(Suspense, null, { default: () => h(SearchPage) }),
      }),
      { global: { components: { NuxtLink: NuxtLinkStub } } },
    )
    await flushPromises()

    expect(wrapper.text()).toContain(de.search.searchError)
    expect(wrapper.text()).not.toContain(de.search.noResults)
  })
})
