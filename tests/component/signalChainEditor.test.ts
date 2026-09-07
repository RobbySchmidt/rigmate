// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SignalChainEditor from '../../app/components/SignalChainEditor.vue'
import { installNuxtAutoImports } from '../helpers/nuxtAutoImports'
import { de } from '../../app/locales/de'

const stations = [
  { id: 'g1', slug: 'a', category: 'Gitarre', label: 'Gretsch White Falcon', detail: '1997', rarity: 'rare' as const },
  { id: 'g2', slug: 'b', category: 'Pedal', label: 'Boss CE-2 Chorus', detail: null, rarity: 'special' as const },
  { id: 'g3', slug: 'c', category: 'Amp', label: 'Marshall JTM45', detail: null, rarity: null },
]

function mountEditor(props: Record<string, unknown> = {}) {
  installNuxtAutoImports()
  return mount(SignalChainEditor, {
    props: { stations, ...props },
    // vuedraggable braucht echtes DOM-Verhalten, das happy-dom nicht
    // vollstaendig nachbildet. Fuer die Logik reicht ein Stub, der seinen
    // Item-Slot rendert. Das Ziehen selbst ist Bibliotheksverhalten und
    // wird hier nicht getestet - die Pfeile schon, und die tragen dieselbe
    // Aufgabe.
    global: {
      stubs: {
        draggable: {
          // "group" ist mit deklariert, damit der Name der Zug-Gruppe als
          // data-Attribut nachpruefbar wird - sonst landet das Objekt nur
          // als "[object Object]" im Fallthrough.
          props: ['modelValue', 'itemKey', 'group'],
          template:
            '<div :data-group="group && group.name"><template v-for="(el, i) in modelValue" :key="el.id"><slot name="item" :element="el" :index="i" /></template></div>',
        },
      },
    },
  })
}

describe('SignalChainEditor', () => {
  it('zeichnet Namen und Knoten wie die Ansichtsfassung aus', () => {
    // Zwischen Ansehen und Bearbeiten darf sich die Seltenheit nicht anders
    // lesen - beide haengen an derselben Quelle.
    const wrapper = mountEditor()
    const names = wrapper.findAll('.font-display')
    expect(names.map((name) => name.text())).toEqual([
      'Gretsch White Falcon',
      'Boss CE-2 Chorus',
      'Marshall JTM45',
    ])
    expect(names[0].classes()).toContain('text-rare')
    expect(names[1].classes()).toContain('text-special')
    expect(names[2].classes()).toContain('text-ink')

    const nodes = wrapper.findAll('.rounded-full')
    expect(nodes).toHaveLength(stations.length)
    expect(nodes[0].classes()).toContain('bg-rare')
    expect(nodes[1].classes()).toContain('border-special')
    expect(nodes[2].classes()).toContain('bg-surface')
  })

  it('liegt in derselben Zug-Gruppe wie der Geraete-Pool', () => {
    // Ohne diese Gruppe nimmt die Kette nichts an, was aus GearPool kommt -
    // der Zug laeuft ins Leere, und zwar ohne Fehlermeldung.
    const wrapper = mountEditor()
    expect(wrapper.find('[data-group]').attributes('data-group')).toBe('chain')
  })

  it('schiebt eine Station mit dem Pfeil nach oben', async () => {
    const wrapper = mountEditor()
    await wrapper.findAll(`[aria-label="${de.profile.chainMoveUp}"]`)[1].trigger('click')

    const emitted = wrapper.emitted('update:stations')
    expect(emitted).toBeTruthy()
    expect((emitted!.at(-1)![0] as typeof stations).map((s) => s.id)).toEqual(['g2', 'g1', 'g3'])
  })

  it('schiebt eine Station mit dem Pfeil nach unten', async () => {
    const wrapper = mountEditor()
    await wrapper.findAll(`[aria-label="${de.profile.chainMoveDown}"]`)[0].trigger('click')

    const emitted = wrapper.emitted('update:stations')
    expect((emitted!.at(-1)![0] as typeof stations).map((s) => s.id)).toEqual(['g2', 'g1', 'g3'])
  })

  it('deaktiviert hoch bei der ersten und runter bei der letzten Station', () => {
    const wrapper = mountEditor()
    const up = wrapper.findAll(`[aria-label="${de.profile.chainMoveUp}"]`)
    const down = wrapper.findAll(`[aria-label="${de.profile.chainMoveDown}"]`)

    expect(up[0].attributes('disabled')).toBeDefined()
    expect(up[1].attributes('disabled')).toBeUndefined()
    expect(down.at(-1)!.attributes('disabled')).toBeDefined()
    expect(down[0].attributes('disabled')).toBeUndefined()
  })

  it('meldet das Herausnehmen als eigenes Ereignis, nicht als Loeschen', async () => {
    const wrapper = mountEditor()
    await wrapper.findAll(`[aria-label="${de.profile.chainRemove}"]`)[1].trigger('click')

    // Das Geraet bleibt im Rig - die Seite darueber schiebt es zurueck in
    // die Liste daneben. Ein "removed"-Ereignis mit Id, kein Loeschen.
    expect(wrapper.emitted('remove')).toEqual([['g2']])
    expect((wrapper.emitted('update:stations')!.at(-1)![0] as typeof stations).map((s) => s.id)).toEqual(['g1', 'g3'])
  })

  it('nummeriert die Stationen sichtbar durch', () => {
    const wrapper = mountEditor()
    const text = wrapper.text()
    expect(text).toContain('1')
    expect(text).toContain('3')
  })

  it('zeigt jede Station mit Kategorie und Namen', () => {
    const wrapper = mountEditor()
    const text = wrapper.text()
    expect(text).toContain('Gretsch White Falcon')
    expect(text).toContain('Gitarre')
  })

  it('haelt bei einer einzigen Station beide Pfeile deaktiviert', () => {
    const wrapper = mountEditor({ stations: [stations[0]] })
    expect(wrapper.find(`[aria-label="${de.profile.chainMoveUp}"]`).attributes('disabled')).toBeDefined()
    expect(wrapper.find(`[aria-label="${de.profile.chainMoveDown}"]`).attributes('disabled')).toBeDefined()
  })

  it('rechnet zwei Klicks im selben Tick auf dem gemeldeten Stand, nicht auf dem alten', async () => {
    const wrapper = mountEditor()
    const down = wrapper.findAll(`[aria-label="${de.profile.chainMoveDown}"]`)

    // props.stations kommt erst nach dem Re-Render des Elternteils zurueck.
    // Bewusst ohne await dazwischen: beide Klicks fallen in dasselbe Tick,
    // die Props sind beim zweiten also nachweislich noch der alte Stand.
    down[0].trigger('click')
    down[1].trigger('click')
    await wrapper.vm.$nextTick()

    const emitted = wrapper.emitted('update:stations')!
    expect(emitted).toHaveLength(2)
    // Erster Klick: g1 eine Stufe runter.
    expect((emitted[0][0] as typeof stations).map((s) => s.id)).toEqual(['g2', 'g1', 'g3'])
    // Zweiter Klick auf denselben Knopf an Position 1 - dort steht jetzt g1.
    // Auf dem alten Stand waere dort noch g2 gestanden und das Ergebnis
    // ['g1', 'g3', 'g2'], die erste Verschiebung also verloren.
    expect((emitted[1][0] as typeof stations).map((s) => s.id)).toEqual(['g2', 'g3', 'g1'])
  })

  it('faellt auf die Props zurueck, wenn das Elternteil die Aenderung nicht uebernimmt', async () => {
    const wrapper = mountEditor()

    // Kein Elternteil haengt an update:stations, die Props bleiben also, wie
    // sie sind. Nach einem Tick muss wieder ausschliesslich der Prop gelten -
    // sonst rechnete die Komponente dauerhaft auf einer Fassung weiter, die
    // niemand uebernommen hat.
    await wrapper.findAll(`[aria-label="${de.profile.chainMoveDown}"]`)[0].trigger('click')
    await wrapper.findAll(`[aria-label="${de.profile.chainMoveDown}"]`)[0].trigger('click')

    const emitted = wrapper.emitted('update:stations')!
    expect((emitted.at(-1)![0] as typeof stations).map((s) => s.id)).toEqual(['g2', 'g1', 'g3'])
  })
})
