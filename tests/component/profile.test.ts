// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h, Suspense, ref as vueRef } from 'vue'
import ProfilePage from '../../app/pages/profile/[id].vue'
import ProfileHeader from '../../app/components/ProfileHeader.vue'
import GearPanel from '../../app/components/GearPanel.vue'
import GearList from '../../app/components/GearList.vue'
import GearPool from '../../app/components/GearPool.vue'
import SignalChain from '../../app/components/SignalChain.vue'
import SignalChainEditor from '../../app/components/SignalChainEditor.vue'
import FeedItem from '../../app/components/FeedItem.vue'
import { installNuxtAutoImports, stubDefinePageMeta, stubUseAsyncData } from '../helpers/nuxtAutoImports'
import { useUserId } from '../../app/composables/useUserId'
import { useChainOrder } from '../../app/composables/useChainOrder'
import { createSupabaseStub, type SupabaseStubConfig } from '../helpers/supabaseStub'
import { de } from '../../app/locales/de'

// Minimaler Ersatz fuer NuxtLink, wie in tests/component/gear.test.ts.
const NuxtLinkStub = defineComponent({
  props: ['to'],
  setup(props, { slots }) {
    return () => h('a', { href: props.to }, slots.default?.())
  },
})

// ClientOnly rendert im Browser einfach seinen Slot - genau das braucht der
// Test, denn der Bearbeitungsmodus steckt darin. Dasselbe Vorgehen wie in
// gearPanel.test.ts.
const ClientOnlyStub = defineComponent({
  setup(_, { slots }) {
    return () => slots.default?.()
  },
})

// vuedraggable braucht echtes DOM-Verhalten, das happy-dom nicht vollstaendig
// nachbildet. Der Stub rendert Header-, Item- und Footer-Slot, damit die
// Knoepfe darin (Pfeile, "X", "Anhaengen") anklickbar bleiben.
const draggableStub = {
  props: ['modelValue', 'itemKey', 'group'],
  emits: ['update:modelValue'],
  template:
    '<div :data-group="group && group.name">' +
    '<slot name="header" />' +
    '<template v-for="(el, i) in modelValue" :key="el.id"><slot name="item" :element="el" :index="i" /></template>' +
    '<slot name="footer" />' +
    '</div>',
}

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
    chain_position: null,
    created_at: '2026-09-01T10:00:00.000Z',
    catalog_items: {
      slug: 'fender-stratocaster',
      name: 'Stratocaster',
      category_id: 'guitar',
      rarity_base: 'common',
      brands: { name: 'Fender' },
    },
    ...overrides,
  }
}

// Die vier Lesezugriffe der Seite in einem Rutsch, damit jeder Test nur das
// nennen muss, was ihn angeht. Ohne Vorgabe ist alles leer und heil - ein
// vergessener Eintrag darf nicht zufaellig wie ein Fehler aussehen.
function reads(overrides: SupabaseStubConfig['initialReads'] = {}): SupabaseStubConfig['initialReads'] {
  return {
    profiles: { data: fakeProfile() },
    gear_items: { data: [] },
    wishlist_items: { data: [] },
    preferences: { data: [] },
    ...overrides,
  }
}

interface MountOptions {
  /** Ausgang der Server-Route /api/profile/<id>/mates. */
  mates?: () => Promise<unknown>
}

// profile/[id].vue hat eine asynchrone setup() (fuenf await-Aufrufe) - dafuer
// verlangt Vue eine Suspense-Grenze, wie bei rig.vue.
async function mountProfile(
  routeId: string,
  viewerSub: string | null,
  initialReads: SupabaseStubConfig['initialReads'],
  options: MountOptions = {},
) {
  installNuxtAutoImports()
  stubDefinePageMeta()
  stubUseAsyncData()
  vi.stubGlobal('useRoute', () => ({ params: { id: routeId } }))
  const supabase = createSupabaseStub({ initialReads })
  vi.stubGlobal('useSupabaseClient', () => supabase)
  // Claims-Form wie das echte @nuxtjs/supabase-Modul (sub, kein id) - siehe
  // app/composables/useUserId.ts. useUserId() ist die echte Implementierung.
  vi.stubGlobal('useSupabaseUser', () => vueRef(viewerSub ? { sub: viewerSub } : null))
  vi.stubGlobal('useUserId', useUserId)
  // Ebenfalls die echte Implementierung: der Test soll pruefen, dass die
  // Seite die Kette wirklich schreibt, nicht dass eine Attrappe zurueckruft.
  vi.stubGlobal('useChainOrder', useChainOrder)

  // Die Seite holt die Rig-Kollegen ueber useRequestFetch(), damit der
  // Aufruf im SSR die Cookies des eingehenden Requests mitnimmt. Im Browser
  // ist das schlicht $fetch - deshalb hier beides auf denselben Stub.
  const fetchStub = vi.fn(options.mates ?? (() => Promise.resolve({ mateCount: 0 })))
  vi.stubGlobal('$fetch', fetchStub)
  vi.stubGlobal('useRequestFetch', () => fetchStub)

  const wrapper = mount(
    defineComponent({
      render: () => h(Suspense, null, { default: () => h(ProfilePage) }),
    }),
    {
      global: {
        // Die echten Kinder, nicht Attrappen: dieser Task setzt die Teile
        // zusammen, und ein Stub wuerde genau die Naht ungeprueft lassen.
        components: {
          ProfileHeader,
          GearPanel,
          GearList,
          GearPool,
          SignalChain,
          SignalChainEditor,
          FeedItem,
          NuxtLink: NuxtLinkStub,
          ClientOnly: ClientOnlyStub,
        },
        stubs: {
          draggable: draggableStub,
          RarityPip: { props: ['rarity'], template: '<span data-pip :data-rarity="rarity" />' },
        },
      },
    },
  )
  await flushPromises()
  return { wrapper, supabase, fetchStub }
}

function tabByText(wrapper: VueWrapper, text: string) {
  return wrapper.findAll('[role="tab"]').find((tab) => tab.text() === text)
}

async function openChainTab(wrapper: VueWrapper) {
  const tab = tabByText(wrapper, de.profile.tabChain)
  expect(tab, 'Ketten-Reiter fehlt').toBeTruthy()
  await tab!.trigger('click')
}

afterEach(() => {
  vi.useRealTimers()
})

describe('profile/[id].vue - Rig anzeigen', () => {
  it('zeigt das Rig eines fremden Profils', async () => {
    const { wrapper } = await mountProfile('alice-1', 'bob-1', reads({ gear_items: { data: [fakeGearRow()] } }))

    expect(wrapper.text()).toContain('Alice Ampeg')
    expect(wrapper.text()).toContain('Fender Stratocaster')
    expect(wrapper.text()).toContain('2018')
    expect(wrapper.text()).not.toContain(de.profile.emptyRig)
    expect(wrapper.text()).not.toContain(de.profile.loadError)
  })

  it('gruppiert nach Kategorie und haengt Praeferenzen und Wunschliste an', async () => {
    // Saiten und Plektren stehen in preferences und koennen laut Trigger gar
    // nicht in gear_items stehen - ohne eigene Gruppe waeren sie beim Umbau
    // von der Seite verschwunden.
    const { wrapper } = await mountProfile(
      'alice-1',
      'bob-1',
      reads({
        gear_items: { data: [fakeGearRow()] },
        preferences: {
          data: [{ id: 'p1', catalog_items: { slug: 'ernie-ball-slinky', name: 'Slinky', brands: { name: 'Ernie Ball' } } }],
        },
        wishlist_items: {
          data: [{ id: 'w1', note: null, catalog_items: { slug: 'klon-centaur', name: 'Centaur', brands: { name: 'Klon' } } }],
        },
      }),
    )

    expect(wrapper.text()).toContain(de.categories.guitar)
    expect(wrapper.text()).toContain(de.profile.preferences)
    expect(wrapper.text()).toContain('Ernie Ball Slinky')
    expect(wrapper.text()).toContain(de.profile.wishlist)
    expect(wrapper.text()).toContain('Klon Centaur')
  })

  it('zeigt den Leer-Hinweis, wenn noch kein Equipment eingetragen ist', async () => {
    const { wrapper } = await mountProfile('alice-1', 'bob-1', reads())

    // Ein leeres Rig ist ein legitimer Zustand und darf nicht wie ein
    // Fehlschlag aussehen - die zweite Haelfte des wiederkehrenden Fehlers.
    expect(wrapper.text()).toContain(de.profile.emptyRig)
    expect(wrapper.text()).not.toContain(de.profile.loadError)
    expect(wrapper.text()).not.toContain(de.profile.feedError)
    expect(wrapper.text()).toContain(de.profile.feedEmpty)
  })

  it('zeigt einen Fehlertext statt eines leeren Abschnitts, wenn das Rig nicht geladen werden kann', async () => {
    const { wrapper } = await mountProfile(
      'alice-1',
      'bob-1',
      reads({ gear_items: { data: null, error: { message: 'network down' } } }),
    )

    // Ein Fehlschlag darf nicht wie "kein Equipment eingetragen" aussehen -
    // genau die Verwechslung, die diese Seite verhindern soll.
    expect(wrapper.text()).toContain(de.profile.loadError)
    expect(wrapper.text()).not.toContain(de.profile.emptyRig)
    // Der Verlauf haengt an derselben Abfrage und bekommt seinen eigenen
    // Text, statt als "Noch nichts passiert" durchzugehen.
    expect(wrapper.text()).toContain(de.profile.feedError)
    expect(wrapper.text()).not.toContain(de.profile.feedEmpty)
  })

  it('nennt getrennt, welcher der beiden Zusatz-Zugriffe gescheitert ist', async () => {
    const onlyWishlist = await mountProfile(
      'alice-1',
      'bob-1',
      reads({ wishlist_items: { data: null, error: { message: 'boom' } } }),
    )
    expect(onlyWishlist.wrapper.text()).toContain(`${de.profile.wishlist}: ${de.profile.loadError}`)
    expect(onlyWishlist.wrapper.text()).not.toContain(`${de.profile.preferences}: ${de.profile.loadError}`)

    const onlyPreferences = await mountProfile(
      'alice-1',
      'bob-1',
      reads({ preferences: { data: null, error: { message: 'boom' } } }),
    )
    expect(onlyPreferences.wrapper.text()).toContain(`${de.profile.preferences}: ${de.profile.loadError}`)
    expect(onlyPreferences.wrapper.text()).not.toContain(`${de.profile.wishlist}: ${de.profile.loadError}`)
  })

  it('zeigt Rig-Ereignisse im Verlauf', async () => {
    const { wrapper } = await mountProfile(
      'alice-1',
      'bob-1',
      reads({
        gear_items: {
          data: [
            fakeGearRow({ id: 'g1', created_at: '2026-09-01T10:00:00.000Z' }),
            fakeGearRow({
              id: 'g2',
              year: null,
              created_at: '2026-09-03T08:00:00.000Z',
              catalog_items: {
                slug: 'klon-centaur',
                name: 'Centaur',
                category_id: 'pedal',
                rarity_base: 'rare',
                brands: { name: 'Klon' },
              },
            }),
          ],
        },
      }),
    )

    const events = wrapper.findAllComponents(FeedItem)
    // Zwei Tage, also zwei Beitraege - und der neuere zuerst.
    expect(events).toHaveLength(2)
    expect(events[0]!.text()).toContain('03.09.2026')
    expect(events[0]!.text()).toContain(de.profile.feedRareTitle)
    expect(events[1]!.text()).toContain('01.09.2026')
    expect(events[1]!.text()).not.toContain(de.profile.feedRareTitle)
  })
})

describe('profile/[id].vue - Kopf', () => {
  it('zeigt die Profil-Links weiterhin an', async () => {
    // Sie standen schon vor dem Umbau da. Ohne diesen Test faellt niemandem
    // auf, wenn sie beim naechsten Umbau wieder verschwinden.
    const { wrapper } = await mountProfile(
      'alice-1',
      'bob-1',
      reads({
        profiles: {
          data: fakeProfile({ links: [{ label: 'Bandcamp', url: 'https://example.invalid/alice' }] }),
        },
      }),
    )

    const link = wrapper.get('[data-links] a')
    expect(link.text()).toBe('Bandcamp')
    expect(link.attributes('href')).toBe('https://example.invalid/alice')
    expect(link.attributes('rel')).toBe('noopener noreferrer')
  })

  it('zeigt die Kennzahlen aus Rig und Server-Route', async () => {
    const { wrapper, fetchStub } = await mountProfile(
      'alice-1',
      'bob-1',
      reads({
        gear_items: {
          data: [
            fakeGearRow({ id: 'g1' }),
            fakeGearRow({
              id: 'g2',
              catalog_items: {
                slug: 'klon-centaur',
                name: 'Centaur',
                category_id: 'pedal',
                rarity_base: 'rare',
                brands: { name: 'Klon' },
              },
            }),
          ],
        },
      }),
      { mates: () => Promise.resolve({ mateCount: 7 }) },
    )

    expect(fetchStub).toHaveBeenCalledWith('/api/profile/alice-1/mates')
    expect(wrapper.get('[data-stat="devices"] [data-value]').text()).toBe('2')
    expect(wrapper.get('[data-stat="rarities"] [data-value]').text()).toBe('1')
    expect(wrapper.get('[data-stat="specials"] [data-value]').text()).toBe('0')
    expect(wrapper.get('[data-stat="mates"] [data-value]').text()).toBe('7')
    expect(wrapper.get('[data-stat="mates"]').attributes('data-state')).toBe('ready')
  })

  it('unterscheidet eine gescheiterte Kollegen-Abfrage von der echten Null', async () => {
    const { wrapper } = await mountProfile('alice-1', 'bob-1', reads(), {
      mates: () => Promise.reject(new Error('502')),
    })

    // Eine 0 waere hier eine Behauptung ueber Daten, die nie angekommen sind.
    expect(wrapper.get('[data-stat="mates"]').attributes('data-state')).toBe('error')
    expect(wrapper.get('[data-stat="mates"] [data-value]').text()).not.toBe('0')
    expect(wrapper.get('[data-stat="mates"]').text()).toContain(de.profile.statMatesError)
  })
})

describe('profile/[id].vue - Bearbeiten nur im eigenen Profil', () => {
  it('zeigt den Bearbeiten-Link im eigenen Profil', async () => {
    const { wrapper } = await mountProfile('alice-1', 'alice-1', reads())

    expect(wrapper.get('[data-action="edit"]').text()).toBe(de.profile.editCta)
    expect(wrapper.find('[data-action="follow"]').exists()).toBe(false)
  })

  it('zeigt im fremden Profil Folgen und Nachricht statt des Bearbeiten-Links', async () => {
    const { wrapper } = await mountProfile('alice-1', 'bob-1', reads())

    expect(wrapper.find('[data-action="edit"]').exists()).toBe(false)
    expect(wrapper.get('[data-action="follow"]').text()).toBe(de.profile.follow)
  })

  it('laesst ein fremdes Profil nie in den Bearbeitungsmodus', async () => {
    // Gleiche Ausgangslage wie der Selbstaufruf unten (Equipment da, Kette
    // leer) - nur der Betrachter ist ein anderer.
    const { wrapper } = await mountProfile(
      'alice-1',
      'bob-1',
      reads({ gear_items: { data: [fakeGearRow()] } }),
    )

    expect(wrapper.findComponent(GearPool).exists()).toBe(false)
    expect(wrapper.text()).toContain(de.profile.feedTitle)
    expect(tabByText(wrapper, de.profile.tabChain)).toBeUndefined()
  })
})

describe('profile/[id].vue - Signalkette', () => {
  const chainReads = () =>
    reads({
      gear_items: {
        data: [
          fakeGearRow({
            id: 'g1',
            chain_position: 2,
            catalog_items: {
              slug: 'klon-centaur',
              name: 'Centaur',
              category_id: 'pedal',
              rarity_base: 'rare',
              brands: { name: 'Klon' },
            },
          }),
          fakeGearRow({ id: 'g2', chain_position: 1 }),
          fakeGearRow({
            id: 'g3',
            chain_position: null,
            catalog_items: {
              slug: 'marshall-jtm45',
              name: 'JTM45',
              category_id: 'amp',
              rarity_base: 'common',
              brands: { name: 'Marshall' },
            },
          }),
        ],
      },
    })

  it('ordnet die Stationen nach chain_position, nicht nach Anlagereihenfolge', async () => {
    const { wrapper } = await mountProfile('alice-1', 'bob-1', chainReads())
    await openChainTab(wrapper)

    const names = wrapper.findComponent(SignalChain).findAll('a').map((node) => node.text())
    // g2 steht auf Position 1, kommt aber als zweite Zeile aus der Datenbank.
    expect(names).toEqual(['Fender Stratocaster', 'Klon Centaur'])
  })

  it('bleibt bei vorhandener Kette im Ansichtsmodus und zeigt den Verlauf', async () => {
    const { wrapper } = await mountProfile('alice-1', 'alice-1', chainReads())

    expect(wrapper.findComponent(GearPool).exists()).toBe(false)
    expect(wrapper.text()).toContain(de.profile.feedTitle)
  })

  it('startet bei leerer Kette auf dem eigenen Profil sofort im Bearbeitungsmodus', async () => {
    const { wrapper } = await mountProfile(
      'alice-1',
      'alice-1',
      reads({ gear_items: { data: [fakeGearRow()] } }),
    )

    // Nichts anzusehen, also steht die Geraeteliste sofort rechts
    // (Abschnitt 5.4 der Profil-Spec).
    expect(wrapper.findComponent(GearPool).exists()).toBe(true)
    expect(wrapper.text()).toContain(de.profile.chainPoolTitle)
    expect(wrapper.text()).not.toContain(de.profile.feedTitle)
  })

  it('behauptet bei voellig leerem Rig nicht, alle Geraete stuenden in der Kette', async () => {
    const { wrapper } = await mountProfile('alice-1', 'alice-1', reads())

    expect(wrapper.findComponent(GearPool).exists()).toBe(false)
    expect(wrapper.text()).not.toContain(de.profile.chainPoolEmpty)
  })

  it('geht bei einem Ladefehler nicht in den Bearbeitungsmodus', async () => {
    const { wrapper } = await mountProfile(
      'alice-1',
      'alice-1',
      reads({ gear_items: { data: null, error: { message: 'boom' } } }),
    )

    // Aus einer Kette, die nie ankam, wuerde ein Speichern die echte
    // Reihenfolge ueberschreiben.
    expect(wrapper.findComponent(GearPool).exists()).toBe(false)
    expect(wrapper.text()).toContain(de.profile.loadError)
  })

  it('kommt mit "Fertig" wieder aus dem Bearbeitungsmodus heraus', async () => {
    const { wrapper } = await mountProfile(
      'alice-1',
      'alice-1',
      reads({ gear_items: { data: [fakeGearRow()] } }),
    )
    expect(wrapper.findComponent(GearPool).exists()).toBe(true)

    const done = wrapper.findAll('button').find((button) => button.text() === de.profile.chainDone)
    expect(done, 'Fertig-Knopf fehlt').toBeTruthy()
    await done!.trigger('click')

    // Die Kette ist danach immer noch leer. Ein watchEffect wuerde hier
    // sofort wieder aufmachen und man kaeme nie heraus.
    expect(wrapper.findComponent(GearPool).exists()).toBe(false)
    expect(wrapper.text()).toContain(de.profile.feedTitle)
  })

  it('haengt ein Geraet aus dem Pool an die Kette und schreibt die neue Reihenfolge', async () => {
    vi.useFakeTimers()
    const { wrapper, supabase } = await mountProfile('alice-1', 'alice-1', chainReads())

    // Kette vorhanden, also erst per Knopf in die Bearbeitung.
    await openChainTab(wrapper)
    const edit = wrapper.findAll('button').find((button) => button.text() === de.profile.chainEdit)
    expect(edit, 'Bearbeiten-Knopf fehlt').toBeTruthy()
    await edit!.trigger('click')

    const pool = wrapper.findComponent(GearPool)
    expect(pool.text()).toContain('Marshall JTM45')

    await pool.get(`[aria-label="${de.profile.chainAppend}"]`).trigger('click')

    // useChainOrder buendelt 400ms lang, bevor es schreibt.
    await vi.advanceTimersByTimeAsync(500)

    expect(supabase.rpcCalls).toHaveLength(1)
    expect(supabase.rpcCalls[0]).toEqual({ name: 'set_chain_order', payload: { item_ids: ['g2', 'g1', 'g3'] } })
    // Das Geraet ist aus dem Pool verschwunden, weil der Pool sich aus der
    // Kette ableitet - nicht, weil die Seite es von Hand herausgenommen hat.
    expect(wrapper.findComponent(GearPool).text()).toContain(de.profile.chainPoolEmpty)
  })

  it('nimmt eine Station aus der Kette, schiebt sie in den Pool zurueck und sagt das', async () => {
    vi.useFakeTimers()
    const { wrapper, supabase } = await mountProfile('alice-1', 'alice-1', chainReads())

    await openChainTab(wrapper)
    const edit = wrapper.findAll('button').find((button) => button.text() === de.profile.chainEdit)
    await edit!.trigger('click')

    const remove = wrapper
      .findComponent(SignalChainEditor)
      .findAll(`[aria-label="${de.profile.chainRemove}"]`)
    expect(remove).toHaveLength(2)
    await remove[0]!.trigger('click')

    await vi.advanceTimersByTimeAsync(500)

    expect(supabase.rpcCalls[0]).toEqual({ name: 'set_chain_order', payload: { item_ids: ['g1'] } })
    // "X" nimmt aus der Kette und loescht nicht - das Geraet steht danach im
    // Pool, und auf dem Bildschirm steht auch, dass es so gemeint ist.
    expect(wrapper.findComponent(GearPool).text()).toContain('Fender Stratocaster')
    expect(wrapper.text()).toContain(de.profile.chainRemovedHint)
  })

  it('zeigt einen gescheiterten Schreibvorgang an, statt die neue Reihenfolge stumm zu behalten', async () => {
    vi.useFakeTimers()
    installNuxtAutoImports()
    stubDefinePageMeta()
    stubUseAsyncData()
    vi.stubGlobal('useRoute', () => ({ params: { id: 'alice-1' } }))
    const supabase = createSupabaseStub({
      initialReads: chainReads(),
      rpcResults: { set_chain_order: [{ error: { message: 'nope', code: 'RG005' } }] },
    })
    vi.stubGlobal('useSupabaseClient', () => supabase)
    vi.stubGlobal('useSupabaseUser', () => vueRef({ sub: 'alice-1' }))
    vi.stubGlobal('useUserId', useUserId)
    vi.stubGlobal('useChainOrder', useChainOrder)
    const fetchStub = vi.fn(() => Promise.resolve({ mateCount: 0 }))
    vi.stubGlobal('$fetch', fetchStub)
    vi.stubGlobal('useRequestFetch', () => fetchStub)

    const wrapper = mount(
      defineComponent({ render: () => h(Suspense, null, { default: () => h(ProfilePage) }) }),
      {
        global: {
          components: {
            ProfileHeader,
            GearPanel,
            GearList,
            GearPool,
            SignalChain,
            SignalChainEditor,
            FeedItem,
            NuxtLink: NuxtLinkStub,
            ClientOnly: ClientOnlyStub,
          },
          stubs: {
            draggable: draggableStub,
            RarityPip: { props: ['rarity'], template: '<span data-pip :data-rarity="rarity" />' },
          },
        },
      },
    )
    await flushPromises()

    await openChainTab(wrapper)
    const edit = wrapper.findAll('button').find((button) => button.text() === de.profile.chainEdit)
    await edit!.trigger('click')
    await wrapper
      .findComponent(SignalChainEditor)
      .findAll(`[aria-label="${de.profile.chainRemove}"]`)[0]!
      .trigger('click')

    await vi.advanceTimersByTimeAsync(500)
    await flushPromises()

    // Der gefaehrlichste Fall aus Abschnitt 7: die Anzeige zeigt die neue
    // Reihenfolge, geschrieben wurde sie nicht. RG005 bekommt seinen eigenen
    // Satz statt des Sammeltexts.
    expect(wrapper.text()).toContain(de.profile.chainSaveErrorStale)
    expect(wrapper.text()).not.toContain(de.profile.chainSaved)
  })
})
