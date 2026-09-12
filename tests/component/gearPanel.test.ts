// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import GearPanel from '../../app/components/GearPanel.vue'
import GearList from '../../app/components/GearList.vue'
import SignalChain from '../../app/components/SignalChain.vue'
import SignalChainEditor from '../../app/components/SignalChainEditor.vue'
import { installNuxtAutoImports } from '../helpers/nuxtAutoImports'
import { de } from '../../app/locales/de'

// Minimaler Ersatz fuer NuxtLink - ausserhalb von Nuxt gibt es die
// Komponente nicht, ein <a> reicht.
const NuxtLinkStub = defineComponent({
  props: ['to'],
  setup(props, { slots }) {
    return () => h('a', { href: props.to }, slots.default?.())
  },
})

// ClientOnly rendert im Browser einfach seinen Slot. Genau das braucht der
// Test - der Bearbeitungsmodus steckt in der echten Komponente darin.
const ClientOnlyStub = defineComponent({
  setup(_, { slots }) {
    return () => slots.default?.()
  },
})

// vuedraggable braucht echtes DOM-Verhalten, das happy-dom nicht vollstaendig
// nachbildet. Der Stub rendert Header-, Item- und Footer-Slot und macht den
// Namen der Zug-Gruppe als data-Attribut sichtbar: nur so laesst sich pruefen,
// dass Kette und Pool ueberhaupt in derselben Gruppe liegen.
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

const groups = [
  {
    key: 'guitar',
    label: 'Gitarre',
    entries: [
      {
        id: 'g1',
        slug: 'gretsch-white-falcon',
        label: 'Gretsch White Falcon',
        detail: '1997',
        rarity: 'rare' as const,
      },
    ],
  },
  {
    key: 'amp',
    label: 'Amp',
    entries: [{ id: 'g3', slug: 'marshall-jtm45', label: 'Marshall JTM45', detail: null, rarity: null }],
  },
]

const stations = [
  {
    id: 'g1',
    slug: 'gretsch-white-falcon',
    category: 'Gitarre',
    label: 'Gretsch White Falcon',
    detail: '1997',
    rarity: 'rare' as const,
  },
  { id: 'g2', slug: 'boss-ce-2', category: 'Pedal', label: 'Boss CE-2 Chorus', detail: null, rarity: 'special' as const },
]

const poolItems = [
  { id: 'g3', slug: 'marshall-jtm45', category: 'Amp', label: 'Marshall JTM45', detail: null, rarity: null },
]

function mountPanel(props: Record<string, unknown> = {}) {
  installNuxtAutoImports()
  return mount(GearPanel, {
    props: {
      groups,
      stations,
      poolItems,
      isOwn: false,
      editing: false,
      saveStatus: 'idle',
      lastError: null,
      loadFailed: false,
      ...props,
    },
    global: {
      // Die echten Kinder, nicht Attrappen: dieser Task setzt die Teile
      // zusammen, und ein Stub wuerde genau die Naht ungeprueft lassen.
      components: {
        GearList,
        SignalChain,
        SignalChainEditor,
        NuxtLink: NuxtLinkStub,
        ClientOnly: ClientOnlyStub,
      },
      stubs: {
        draggable: draggableStub,
        RarityPip: { props: ['rarity'], template: '<span data-pip :data-rarity="rarity" />' },
      },
    },
  })
}

function tabs(wrapper: VueWrapper) {
  return wrapper.findAll('[role="tab"]')
}

function tabByText(wrapper: VueWrapper, text: string) {
  return tabs(wrapper).find((tab) => tab.text() === text)
}

function buttonByText(wrapper: VueWrapper, text: string) {
  return wrapper.findAll('button').find((button) => button.text() === text)
}

async function openChain(wrapper: VueWrapper) {
  const tab = tabByText(wrapper, de.profile.tabChain)
  expect(tab, 'Ketten-Reiter fehlt').toBeTruthy()
  await tab!.trigger('click')
}

describe('GearPanel', () => {
  it('startet auf dem Equipment-Reiter', () => {
    const wrapper = mountPanel()
    const found = tabs(wrapper)
    expect(found.map((tab) => tab.text())).toEqual([de.profile.tabEquipment, de.profile.tabChain])
    expect(found[0].attributes('aria-selected')).toBe('true')
    expect(found[1].attributes('aria-selected')).toBe('false')

    // data-count ist der Gruppenzaehler aus GearList und steht nur dort -
    // damit laesst sich der Equipment-Reiter von der Kette unterscheiden,
    // ohne an Geraetenamen zu haengen, die in beiden vorkommen.
    expect(wrapper.findAll('[data-count]').length).toBeGreaterThan(0)
  })

  it('zeigt den aktiven Reiter als Pille mit Akzentflaeche', () => {
    const wrapper = mountPanel()

    const found = tabs(wrapper)
    expect(found.length).toBe(2)

    const active = found.find((tab) => tab.attributes('aria-selected') === 'true')
    expect(active).toBeTruthy()
    // Positive Zusicherung: die Pille IST eine Akzentflaeche.
    expect(active!.classes()).toContain('rounded-full')
    expect(active!.classes()).toContain('bg-accent-wash')

    const inactive = found.find((tab) => tab.attributes('aria-selected') !== 'true')
    expect(inactive!.classes()).toContain('bg-surface-2')
    // Der Unterstrich unter der Reiterzeile ist weg (P3): eine Pille, die
    // durch ihre Flaeche aktiv ist, braucht keine zweite Auszeichnung.
    expect(wrapper.get('[role="tablist"]').classes()).not.toContain('border-b')
  })

  it('verdrahtet Reiter und Panel ueber ARIA', () => {
    const wrapper = mountPanel()
    expect(wrapper.find('[role="tablist"]').attributes('aria-label')).toBe(de.profile.tabsLabel)

    const panel = wrapper.find('[role="tabpanel"]')
    const tab = tabs(wrapper)[0]
    expect(tab.attributes('aria-controls')).toBe(panel.attributes('id'))
    expect(panel.attributes('aria-labelledby')).toBe(tab.attributes('id'))
  })

  it('wechselt auf den Ketten-Reiter', async () => {
    const wrapper = mountPanel()
    await openChain(wrapper)

    expect(tabs(wrapper)[0].attributes('aria-selected')).toBe('false')
    expect(tabs(wrapper)[1].attributes('aria-selected')).toBe('true')
    expect(wrapper.find('[data-count]').exists()).toBe(false)
    // Das Patchkabel gibt es nur im Signalweg.
    expect(wrapper.find('[data-cable]').exists()).toBe(true)
  })

  it('wechselt den Reiter mit den Pfeiltasten', async () => {
    const wrapper = mountPanel()
    await tabs(wrapper)[0].trigger('keydown', { key: 'ArrowRight' })
    expect(tabs(wrapper)[1].attributes('aria-selected')).toBe('true')
  })

  it('haelt den Ketten-Reiter auf einem fremden Profil ohne Kette zurueck', () => {
    // Ein leerer Reiter auf einem fremden Profil ist eine Sackgasse.
    const wrapper = mountPanel({ isOwn: false, stations: [] })
    expect(tabs(wrapper).map((tab) => tab.text())).toEqual([de.profile.tabEquipment])
  })

  it('zeigt den Ketten-Reiter auf einem fremden Profil mit Kette', () => {
    const wrapper = mountPanel({ isOwn: false })
    expect(tabs(wrapper).map((tab) => tab.text())).toEqual([de.profile.tabEquipment, de.profile.tabChain])
  })

  it('zeigt den Ketten-Reiter auf dem eigenen Profil auch ohne Kette', () => {
    // Auf dem eigenen Profil ist die leere Kette eine Einladung.
    const wrapper = mountPanel({ isOwn: true, stations: [] })
    expect(tabs(wrapper).map((tab) => tab.text())).toEqual([de.profile.tabEquipment, de.profile.tabChain])
  })

  it('zeigt die Equipment-Liste, wenn Geraete eingetragen sind', () => {
    const wrapper = mountPanel()
    expect(wrapper.text()).toContain('Gretsch White Falcon')
    expect(wrapper.text()).not.toContain(de.profile.emptyRig)
    expect(wrapper.text()).not.toContain(de.profile.loadError)
  })

  it('sagt bei leerem Rig, dass nichts eingetragen ist', () => {
    const wrapper = mountPanel({ groups: [] })
    expect(wrapper.text()).toContain(de.profile.emptyRig)
    expect(wrapper.text()).not.toContain(de.profile.loadError)
    expect(wrapper.find('[data-count]').exists()).toBe(false)
  })

  it('unterscheidet ein fehlgeschlagenes Laden von einem leeren Rig', () => {
    // Der Kern dieses Tasks: ohne diese Unterscheidung sieht ein kaputter
    // Request aus wie ein Nutzer, der noch nichts eingetragen hat.
    expect(de.profile.loadError).not.toBe(de.profile.emptyRig)

    const broken = mountPanel({ groups: [], loadFailed: true })
    expect(broken.text()).toContain(de.profile.loadError)
    expect(broken.text()).not.toContain(de.profile.emptyRig)

    const empty = mountPanel({ groups: [], loadFailed: false })
    expect(empty.text()).toContain(de.profile.emptyRig)
    expect(empty.text()).not.toContain(de.profile.loadError)
  })

  it('zeigt auch im Ketten-Reiter den Ladefehler statt einer leeren Kette', async () => {
    const wrapper = mountPanel({ isOwn: true, stations: [], loadFailed: true })
    await openChain(wrapper)
    expect(wrapper.text()).toContain(de.profile.loadError)
    expect(wrapper.text()).not.toContain(de.profile.chainEmptyOwn)
  })

  it('bietet Kette bearbeiten nur auf dem eigenen Profil an', async () => {
    const own = mountPanel({ isOwn: true })
    await openChain(own)
    expect(buttonByText(own, de.profile.chainEdit)).toBeTruthy()

    const other = mountPanel({ isOwn: false })
    await openChain(other)
    expect(buttonByText(other, de.profile.chainEdit)).toBeUndefined()
  })

  it('haelt Kette bearbeiten zurueck, wenn das Rig nicht geladen werden konnte', async () => {
    // Eine Kette, die gar nicht ankam, laesst sich nicht bearbeiten - ein
    // Speichern daraus wuerde die echte Reihenfolge ueberschreiben.
    const wrapper = mountPanel({ isOwn: true, loadFailed: true })
    await openChain(wrapper)
    expect(buttonByText(wrapper, de.profile.chainEdit)).toBeUndefined()
  })

  it('meldet den Wunsch zu bearbeiten nach oben, statt selbst umzuschalten', async () => {
    const wrapper = mountPanel({ isOwn: true })
    await openChain(wrapper)
    await buttonByText(wrapper, de.profile.chainEdit)!.trigger('click')

    expect(wrapper.emitted('edit')).toHaveLength(1)
    // Die Seite tauscht die rechte Spalte, nicht das Panel: solange sie
    // editing nicht setzt, bleibt hier die Ansichtsfassung stehen.
    expect(buttonByText(wrapper, de.profile.chainDone)).toBeUndefined()
  })

  it('meldet das Ende der Bearbeitung nach oben', async () => {
    const wrapper = mountPanel({ isOwn: true, editing: true })
    expect(buttonByText(wrapper, de.profile.chainEdit)).toBeUndefined()
    await buttonByText(wrapper, de.profile.chainDone)!.trigger('click')
    expect(wrapper.emitted('done')).toHaveLength(1)
  })

  it('oeffnet den Ketten-Reiter, sobald die Seite den Bearbeitungsmodus setzt', () => {
    // Sonderfall aus der Aufgabe: leere Kette auf dem eigenen Profil - die
    // Seite startet direkt im Bearbeitungsmodus, ohne dass jemand klickt.
    const wrapper = mountPanel({ isOwn: true, stations: [], editing: true })
    expect(tabs(wrapper)[1].attributes('aria-selected')).toBe('true')
  })

  it('stellt bei leerer Kette eine Ablageflaeche in derselben Zug-Gruppe wie der Pool', () => {
    const wrapper = mountPanel({ isOwn: true, stations: [], editing: true })
    const drop = wrapper.find('[data-chain-drop]')
    expect(drop.exists()).toBe(true)
    expect(drop.text()).toContain(de.profile.chainEmptyDrop)
    // Ohne dieselbe Gruppe wie GearPool nimmt die Flaeche nichts an - der
    // Zug liefe ins Leere, ohne Fehlermeldung.
    expect(drop.attributes('data-group')).toBe('chain')
  })

  it('zeigt bei gefuellter Kette den Editor statt der Ablageflaeche', () => {
    const wrapper = mountPanel({ isOwn: true, editing: true })
    expect(wrapper.find('[data-chain-drop]').exists()).toBe(false)
    expect(wrapper.findAll(`[aria-label="${de.profile.chainMoveDown}"]`)).toHaveLength(stations.length)
  })

  it('reicht eine neue Reihenfolge aus dem Editor nach oben', async () => {
    const wrapper = mountPanel({ isOwn: true, editing: true })
    await wrapper.findAll(`[aria-label="${de.profile.chainMoveDown}"]`)[0].trigger('click')

    const emitted = wrapper.emitted('update:stations')
    expect(emitted).toHaveLength(1)
    expect((emitted![0][0] as typeof stations).map((station) => station.id)).toEqual(['g2', 'g1'])
  })

  it('reicht das Herausnehmen einer Station nach oben', async () => {
    const wrapper = mountPanel({ isOwn: true, editing: true })
    await wrapper.findAll(`[aria-label="${de.profile.chainRemove}"]`)[0].trigger('click')
    expect(wrapper.emitted('remove')).toEqual([['g1']])
  })

  it('zaehlt die Geraete ausserhalb der Kette aus dem Pool', async () => {
    const wrapper = mountPanel()
    await openChain(wrapper)
    expect(wrapper.find('[data-outside-count]').text()).toBe(String(poolItems.length))
  })

  it('schweigt, solange nichts gespeichert wurde', () => {
    const wrapper = mountPanel({ isOwn: true, saveStatus: 'idle' })
    const text = wrapper.text()
    expect(text).not.toContain(de.profile.chainSaving)
    expect(text).not.toContain(de.profile.chainSaved)
    expect(text).not.toContain(de.profile.chainSaveError)
  })

  it('zeigt waehrend des Speicherns einen Hinweis', () => {
    const wrapper = mountPanel({ isOwn: true, saveStatus: 'pending' })
    expect(wrapper.text()).toContain(de.profile.chainSaving)
  })

  it('bestaetigt eine gespeicherte Reihenfolge', () => {
    const wrapper = mountPanel({ isOwn: true, editing: true, saveStatus: 'saved' })
    expect(wrapper.text()).toContain(de.profile.chainSaved)
  })

  // Die Quittung gehoert an die Handlung. Vorher blieb sie nach "Fertig"
  // bis zum Neuladen stehen und behauptete auf einer reinen Ansichtsseite
  // etwas ueber einen Vorgang, den dort niemand ausgeloest hat.
  it('nimmt die Quittung zurueck, sobald der Bearbeitungsmodus endet', () => {
    const wrapper = mountPanel({ isOwn: true, editing: false, saveStatus: 'saved' })
    expect(wrapper.text()).not.toContain(de.profile.chainSaved)
  })

  // Die Gegenrichtung, und die ist die wichtigere: das Zuruecknehmen darf
  // nur die Quittung treffen. Ein laufender oder fehlgeschlagener
  // Schreibvorgang muss "Fertig" ueberleben, sonst verschwindet ein
  // Fehlschlag wortlos - der wiederkehrende Fehler dieses Projekts.
  it('haelt einen laufenden Schreibvorgang auch nach "Fertig" sichtbar', () => {
    const wrapper = mountPanel({ isOwn: true, editing: false, saveStatus: 'pending' })
    expect(wrapper.text()).toContain(de.profile.chainSaving)
  })

  it('haelt einen Fehlschlag auch nach "Fertig" sichtbar', () => {
    const wrapper = mountPanel({
      isOwn: true,
      editing: false,
      saveStatus: 'error',
      lastError: { message: 'irgendwas ging schief' },
    })
    expect(wrapper.text()).toContain(de.profile.chainSaveError)
  })

  it('bietet nach einem Fehlschlag einen zweiten Versuch an', async () => {
    const wrapper = mountPanel({
      isOwn: true,
      saveStatus: 'error',
      lastError: { message: 'irgendwas ging schief' },
    })
    expect(wrapper.text()).toContain(de.profile.chainSaveError)

    const retry = buttonByText(wrapper, de.profile.chainRetry)
    expect(retry).toBeTruthy()
    await retry!.trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })

  it('nennt eine abgelaufene Sitzung beim Namen', () => {
    // RG001 verlangt etwas anderes vom Nutzer als der Sammelfehler: neu
    // anmelden statt noch einmal probieren.
    expect(de.profile.chainSaveErrorSession).not.toBe(de.profile.chainSaveError)

    const wrapper = mountPanel({
      isOwn: true,
      saveStatus: 'error',
      lastError: { message: 'nicht angemeldet', code: 'RG001' },
    })
    expect(wrapper.text()).toContain(de.profile.chainSaveErrorSession)
    expect(wrapper.text()).not.toContain(de.profile.chainSaveError)
  })

  it('nennt ein veraltetes Rig beim Namen', () => {
    expect(de.profile.chainSaveErrorStale).not.toBe(de.profile.chainSaveError)
    expect(de.profile.chainSaveErrorStale).not.toBe(de.profile.chainSaveErrorSession)

    const wrapper = mountPanel({
      isOwn: true,
      saveStatus: 'error',
      lastError: { message: 'gehoert nicht dir', code: 'RG005' },
    })
    const text = wrapper.text()
    expect(text).toContain(de.profile.chainSaveErrorStale)
    expect(text).not.toContain(de.profile.chainSaveError)
    expect(text).not.toContain(de.profile.chainSaveErrorSession)
  })

  it('faellt bei einem Code ohne eigenen Text auf den Sammeltext zurueck', () => {
    // RG002/RG003/RG004 kann ein Nutzer nicht ausloesen - dafuer gibt es
    // bewusst keinen eigenen Satz.
    const wrapper = mountPanel({
      isOwn: true,
      saveStatus: 'error',
      lastError: { message: 'leere Id', code: 'RG003' },
    })
    expect(wrapper.text()).toContain(de.profile.chainSaveError)
  })

  it('bringt keine rohe Postgres-Meldung auf den Schirm', () => {
    const wrapper = mountPanel({
      isOwn: true,
      saveStatus: 'error',
      lastError: {
        message: 'permission denied for function set_chain_order',
        code: 'RG001',
        details: 'PG-Details',
        hint: 'PG-Hinweis',
      },
    })
    const text = wrapper.text()
    expect(text).not.toContain('permission denied')
    expect(text).not.toContain('PG-Details')
    expect(text).not.toContain('PG-Hinweis')
  })

  it('zeigt einem fremden Besucher keinen Speicherzustand', () => {
    // Der Speicherzustand gehoert dem Besitzer; auf einem fremden Profil
    // gibt es nichts zu speichern.
    const wrapper = mountPanel({ isOwn: false, saveStatus: 'error', lastError: { message: 'x', code: 'RG001' } })
    expect(wrapper.text()).not.toContain(de.profile.chainSaveErrorSession)
  })
})
