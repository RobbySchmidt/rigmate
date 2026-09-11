// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, Suspense, ref as vueRef } from 'vue'
import RigPage from '../../app/pages/rig.vue'
import CatalogPicker from '../../app/components/CatalogPicker.vue'
import GearItemForm from '../../app/components/GearItemForm.vue'
import { installNuxtAutoImports, stubDefinePageMeta, stubUseAsyncData } from '../helpers/nuxtAutoImports'
import { createRequestGuard } from '../../app/utils/requestGuard'
import { classifyGearWriteError } from '../../app/utils/gearWriteError'
import { classifyCatalogCreateError } from '../../app/utils/catalogCreateError'
import { useUserId } from '../../app/composables/useUserId'
import { createSupabaseStub, type SupabaseStubConfig } from '../helpers/supabaseStub'
import { de } from '../../app/locales/de'

const DEBOUNCE_WAIT_MS = 150
const EMPTY_RIG: SupabaseStubConfig['initialReads'] = {
  gear_items: { data: [] },
  preferences: { data: [] },
  wishlist_items: { data: [] },
}

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

// rig.vue hat eine asynchrone setup() (drei await useAsyncData()-Aufrufe) -
// dafuer verlangt Vue offiziell eine Suspense-Grenze, siehe
// https://test-utils.vuejs.org/guide/advanced/async-suspense.html
async function mountRig(supabase: ReturnType<typeof createSupabaseStub>) {
  installNuxtAutoImports()
  stubDefinePageMeta()
  stubUseAsyncData()
  vi.stubGlobal('createRequestGuard', createRequestGuard)
  vi.stubGlobal('classifyGearWriteError', classifyGearWriteError)
  vi.stubGlobal('classifyCatalogCreateError', classifyCatalogCreateError)
  vi.stubGlobal('useSupabaseClient', () => supabase)
  // Claims-Form wie das echte @nuxtjs/supabase-Modul sie liefert (sub, kein
  // id - siehe app/composables/useUserId.ts) statt eines erfundenen
  // User-Objekts. useUserId() ist die echte Implementierung, nur ihre
  // Bausteine (useSupabaseUser, computed) sind gestubbt - der Test prueft
  // damit tatsaechlich die reale Normalisierung statt sie zu umgehen.
  vi.stubGlobal('useSupabaseUser', () => vueRef({ sub: 'test-user' }))
  vi.stubGlobal('useUserId', useUserId)

  const wrapper = mount(
    defineComponent({
      render: () => h(Suspense, null, { default: () => h(RigPage) }),
    }),
    { global: { components: { CatalogPicker, GearItemForm } } },
  )
  await flushPromises()
  return wrapper
}

/** Sucht im Equipment-Picker nach `item` und waehlt den ersten Treffer aus. */
async function selectGearItem(wrapper: Awaited<ReturnType<typeof mountRig>>, item: ReturnType<typeof fakeSearchResult>) {
  vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({ results: [item] }))
  const gearPicker = wrapper.findComponent(CatalogPicker)
  await gearPicker.get('input').setValue(item.name)
  await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_WAIT_MS))
  await flushPromises()
  await gearPicker.get('li button').trigger('click')
  await flushPromises()
}

beforeEach(() => {
  vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({ results: [] }))
})

describe('rig.vue - abgelehntes Schreiben', () => {
  it('zeigt einen generischen Fehlschlag, wenn das Anlegen des Exemplars abgelehnt wird', async () => {
    const supabase = createSupabaseStub({
      initialReads: EMPTY_RIG,
      writes: { gear_items: [{ error: { message: 'new row violates row-level security policy' } }] },
    })
    const wrapper = await mountRig(supabase)
    await selectGearItem(wrapper, fakeSearchResult())

    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain(de.rig.errorGeneric)
    // Das Formular bleibt offen stehen statt so zu tun, als waere es geglueckt.
    expect(wrapper.findComponent(GearItemForm).exists()).toBe(true)
    // Der Fehlschlag aendert nichts daran, DASS bereits mit der echten
    // (aus den Claims normalisierten) Nutzer-Id geschrieben wurde - genau
    // das war project-weit undefined, bevor useUserId() das behob.
    expect(supabase.inserts.gear_items[0]).toMatchObject({ owner_id: 'test-user' })
  })

  it('zeigt die eigene Meldung, wenn die Datenbank Verbrauchsmaterial als Geraet ablehnt', async () => {
    // Unerreichbar ueber die Oberflaeche, seit die Kategorie entscheidet -
    // aber der Trigger bleibt die letzte Instanz, und wenn er zuschlaegt,
    // muss die Meldung stimmen statt generisch zu sein.
    const supabase = createSupabaseStub({
      initialReads: {
        ...EMPTY_RIG,
        categories: { data: [{ id: 'strings', is_consumable: false, sort_order: 90 }] },
      },
      writes: { gear_items: [{ error: { message: 'consumable items belong in preferences, not in gear_items' } }] },
    })
    const wrapper = await mountRig(supabase)
    await selectGearItem(wrapper, fakeSearchResult({ categoryId: 'strings' }))

    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain(de.rig.errorConsumableAsGear)
  })
})

describe('rig.vue - eigene Nutzer-Id in jedem Schreibzugriff', () => {
  // Regressionstest fuer Fix-Runde 2: createSupabaseStub()s insert()
  // akzeptierte bisher jede Nutzlast ungeprueft, deshalb blieben acht
  // Stellen im Projekt unbemerkt undefined statt der echten Nutzer-Id
  // schreiben (siehe task-14-report.md, Fix-Runde 1). Hier wird das
  // aufgezeichnete Argument jedes .insert()-Aufrufs geprueft - fuer
  // Praeferenz und Wunschliste gab es dafuer bislang gar keinen Test.
  it('schreibt die eigene Nutzer-Id in Praeferenz- und Wunschlisten-Eintraege', async () => {
    const supabase = createSupabaseStub({
      initialReads: {
        ...EMPTY_RIG,
        // Seit dem einen Eingabefeld (Task 5) entscheidet die Kategorie
        // ueber addToRig(), nicht mehr ein eigener Picker - ohne diese
        // Kategorie bliebe der Saiten-Treffer unten ein Geraet.
        categories: { data: [{ id: 'strings', is_consumable: true, sort_order: 90 }] },
      },
      writes: {
        preferences: [{ error: null }],
        wishlist_items: [{ error: null }],
      },
    })
    const wrapper = await mountRig(supabase)

    // Reihenfolge im Template: Equipment/Praeferenz ueber Kategorie (0),
    // Wunschliste (1) - die eigenen Saiten-/Plektrum-Picker sind mit dem
    // einen Eingabefeld (Task 5) entfallen, siehe app/pages/rig.vue.
    await selectGearItem(wrapper, fakeSearchResult({ id: 'slinky-1', name: 'Regular Slinky', categoryId: 'strings' }))

    const wishlistPicker = wrapper.findAllComponents(CatalogPicker)[1]!
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({ results: [fakeSearchResult({ id: 'wish-1', name: 'Traumgitarre' })] }))
    await wishlistPicker.get('input').setValue('Traum')
    await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_WAIT_MS))
    await flushPromises()
    await wishlistPicker.get('li button').trigger('click')
    await flushPromises()

    expect(supabase.inserts.preferences[0]).toMatchObject({ user_id: 'test-user' })
    expect(supabase.inserts.wishlist_items[0]).toMatchObject({ user_id: 'test-user' })
  })
})

describe('rig.vue - ein Eingabefeld fuer alles', () => {
  it('legt Verbrauchsmaterial still als Praeferenz an, ohne Exemplar-Formular', async () => {
    const supabase = createSupabaseStub({
      initialReads: {
        ...EMPTY_RIG,
        categories: { data: [
          { id: 'guitar', is_consumable: false, sort_order: 10 },
          { id: 'strings', is_consumable: true, sort_order: 90 },
        ] },
      },
      writes: { preferences: [{ data: [{ id: 'pref-1' }] }] },
    })
    const wrapper = await mountRig(supabase)

    await selectGearItem(wrapper, fakeSearchResult({
      id: 'exl140', name: 'EXL140 (10-52)', brandName: "D'Addario", categoryId: 'strings',
    }))

    // Kein Formular: bei Verbrauchsmaterial gibt es kein Baujahr und keine
    // Modifikation, danach zu fragen waere eine Rueckfrage nach etwas
    // bereits Bekanntem.
    expect(wrapper.findComponent(GearItemForm).exists()).toBe(false)
    // Die Nutzlast wird gelesen, nicht nur der Aufruf beobachtet.
    expect(supabase.inserts.preferences[0]).toMatchObject({
      user_id: 'test-user',
      catalog_item_id: 'exl140',
    })
    expect(supabase.inserts.gear_items ?? []).toHaveLength(0)
  })

  it('oeffnet fuer ein Geraet weiterhin das Exemplar-Formular', async () => {
    const supabase = createSupabaseStub({
      initialReads: {
        ...EMPTY_RIG,
        categories: { data: [{ id: 'guitar', is_consumable: false, sort_order: 10 }] },
      },
    })
    const wrapper = await mountRig(supabase)

    await selectGearItem(wrapper, fakeSearchResult())

    expect(wrapper.findComponent(GearItemForm).exists()).toBe(true)
    expect(supabase.inserts.preferences ?? []).toHaveLength(0)
  })

  it('zeigt einen Fehler, wenn die Kategorien nicht geladen werden koennen', async () => {
    const supabase = createSupabaseStub({
      initialReads: {
        ...EMPTY_RIG,
        categories: { error: { message: 'permission denied for table categories' } },
      },
    })
    const wrapper = await mountRig(supabase)

    // Ohne Kategorien ist unentscheidbar, was Verbrauchsmaterial ist. Das
    // muss sichtbar scheitern statt alles als Geraet zu behandeln.
    expect(wrapper.text()).toContain(de.rig.loadError)
  })
})

describe('rig.vue - neu anlegen', () => {
  it('fuehrt nach erfolgreichem Anlegen in das Equipment-Formular weiter', async () => {
    const supabase = createSupabaseStub({ initialReads: EMPTY_RIG })
    const wrapper = await mountRig(supabase)

    const created = fakeSearchResult({ id: 'new-item', name: 'Ganz Neu' })
    vi.stubGlobal(
      '$fetch',
      vi
        .fn()
        .mockResolvedValueOnce({ results: [] }) // Suche waehrend des Tippens
        .mockResolvedValueOnce({ id: 'new-item' }) // POST /api/catalog/items
        .mockResolvedValueOnce({ results: [created] }), // Nachschlagen nach dem Anlegen
    )

    const gearPicker = wrapper.findComponent(CatalogPicker)
    await gearPicker.get('input').setValue('Ganz Neu')
    await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_WAIT_MS))
    await flushPromises()

    const hintButton = gearPicker.findAll('button').find((button) => button.text() === de.picker.createHint)
    await hintButton!.trigger('click')
    const [brandInput, nameInput] = gearPicker.get('form').findAll('input')
    await brandInput.setValue('Eigenbau')
    await nameInput.setValue('Ganz Neu')
    await gearPicker.get('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.findComponent(GearItemForm).exists()).toBe(true)
    expect(wrapper.text()).toContain('Ganz Neu')
  })
})
