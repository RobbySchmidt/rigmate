// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, ref as vueRef } from 'vue'
import OnboardingPage from '../../app/pages/onboarding.vue'
import CatalogPicker from '../../app/components/CatalogPicker.vue'
import { installNuxtAutoImports, stubDefinePageMeta } from '../helpers/nuxtAutoImports'
import { createRequestGuard } from '../../app/utils/requestGuard'
import { classifyGearWriteError } from '../../app/utils/gearWriteError'
import { classifyCatalogCreateError } from '../../app/utils/catalogCreateError'
import { createSupabaseStub } from '../helpers/supabaseStub'
import { de } from '../../app/locales/de'

const DEBOUNCE_WAIT_MS = 150

// Minimaler Ersatz fuer NuxtLink: ausserhalb von Nuxt gibt es die
// Komponente nicht, aber ein einfaches <a> reicht, um Sichtbarkeit und
// Zieltext im Test zu pruefen.
const NuxtLinkStub = defineComponent({
  props: ['to'],
  setup(props, { slots }) {
    return () => h('a', { href: props.to }, slots.default?.())
  },
})

function fakeSearchResult(overrides: Record<string, unknown> = {}) {
  return {
    id: 'strat-1',
    name: 'Stratocaster',
    slug: 'fender-stratocaster',
    brandName: 'Fender',
    categoryId: 'guitar',
    level: 'line',
    lineId: 'strat-1',
    lineName: 'Stratocaster',
    rarityBase: 'mass',
    isVerified: true,
    needsPrecisionHint: true,
    ...overrides,
  }
}

function mountOnboarding(supabase: ReturnType<typeof createSupabaseStub>) {
  installNuxtAutoImports()
  stubDefinePageMeta()
  vi.stubGlobal('createRequestGuard', createRequestGuard)
  vi.stubGlobal('classifyGearWriteError', classifyGearWriteError)
  vi.stubGlobal('classifyCatalogCreateError', classifyCatalogCreateError)
  vi.stubGlobal('useSupabaseClient', () => supabase)
  vi.stubGlobal('useSupabaseUser', () => vueRef({ id: 'test-user' }))

  return mount(OnboardingPage, {
    global: { components: { CatalogPicker, NuxtLink: NuxtLinkStub } },
  })
}

/** Sucht im Picker nach `item` und waehlt den ersten Treffer aus - zwei Interaktionen: tippen, klicken. */
async function selectItem(wrapper: ReturnType<typeof mountOnboarding>, item: ReturnType<typeof fakeSearchResult>) {
  vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({ results: [item] }))
  const picker = wrapper.findComponent(CatalogPicker)
  await picker.get('input').setValue(item.name)
  await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_WAIT_MS))
  await flushPromises()
  await picker.get('li button').trigger('click')
  await flushPromises()
}

beforeEach(() => {
  vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({ results: [] }))
})

describe('onboarding.vue - erfolgreicher Eintrag', () => {
  it('haengt ein hinzugefuegtes Geraet an die Liste an und zeigt danach den Fertig-Button', async () => {
    const supabase = createSupabaseStub({ writes: { gear_items: [{ error: null }] } })
    const wrapper = mountOnboarding(supabase)

    // Vorher: noch nichts eingetragen, also auch kein "Fertig"-Ausgang.
    expect(wrapper.text()).not.toContain(de.onboarding.done)

    await selectItem(wrapper, fakeSearchResult())

    expect(wrapper.text()).toContain('Fender Stratocaster')
    expect(wrapper.text()).toContain(de.onboarding.addedOne)
    expect(wrapper.text()).toContain(de.onboarding.done)
  })
})

describe('onboarding.vue - abgelehntes Schreiben', () => {
  it('zeigt einen generischen Fehlschlag und haengt nichts an die Liste an', async () => {
    const supabase = createSupabaseStub({
      writes: { gear_items: [{ error: { message: 'new row violates row-level security policy' } }] },
    })
    const wrapper = mountOnboarding(supabase)

    // Bewusst NICHT "Fender Stratocaster" - das Beispiel steht schon im
    // Intro-Text und wuerde die Pruefung auf "nicht angehaengt" verfaelschen.
    await selectItem(wrapper, fakeSearchResult({ id: 'lp-1', name: 'Les Paul', brandName: 'Gibson' }))

    expect(wrapper.text()).toContain(de.onboarding.errorGeneric)
    expect(wrapper.findAll('li')).toHaveLength(0)
    // Ohne einen erfolgreich eingetragenen Eintrag bleibt der Ausgang aus.
    expect(wrapper.text()).not.toContain(de.onboarding.done)
  })

  it('zeigt die eigene Meldung, wenn Verbrauchsmaterial als Ausruestung abgelehnt wird', async () => {
    // Der Picker filtert hier bewusst keine Kategorie heraus (wie auf
    // /rig) - Saiten landen also wirklich an, und der Trigger
    // enforce_gear_item_rules() lehnt sie ab.
    const supabase = createSupabaseStub({
      writes: { gear_items: [{ error: { message: 'consumable items belong in preferences, not in gear_items' } }] },
    })
    const wrapper = mountOnboarding(supabase)

    await selectItem(wrapper, fakeSearchResult({ id: 'slinky-1', name: 'Regular Slinky', categoryId: 'strings' }))

    expect(wrapper.text()).toContain(de.onboarding.errorConsumableAsGear)
    expect(wrapper.text()).not.toContain(de.onboarding.done)
  })
})

describe('onboarding.vue - neu anlegen', () => {
  it('zeigt einen Fehlschlag beim Neuanlegen im Picker-Formular, statt es zu leeren', async () => {
    const supabase = createSupabaseStub()
    const wrapper = mountOnboarding(supabase)
    vi.stubGlobal(
      '$fetch',
      vi
        .fn()
        .mockResolvedValueOnce({ results: [] }) // Suche waehrend des Tippens
        .mockRejectedValueOnce(new Error('duplicate key value violates unique constraint "catalog_items_brand_id_name_key"')), // POST /api/catalog/items
    )

    const picker = wrapper.findComponent(CatalogPicker)
    await picker.get('input').setValue('Ganz Neu')
    await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_WAIT_MS))
    await flushPromises()

    const hintButton = picker.findAll('button').find((button) => button.text() === de.picker.createHint)
    await hintButton!.trigger('click')
    const [brandInput, nameInput] = picker.get('form').findAll('input')
    await brandInput.setValue('Fender')
    await nameInput.setValue('Ganz Neu')
    await picker.get('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain(de.picker.createDuplicateError)
    expect((brandInput.element as HTMLInputElement).value).toBe('Fender')
    expect(wrapper.text()).not.toContain(de.onboarding.done)
  })
})
