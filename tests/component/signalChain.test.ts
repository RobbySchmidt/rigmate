// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import SignalChain from '../../app/components/SignalChain.vue'
import { installNuxtAutoImports } from '../helpers/nuxtAutoImports'
import { de } from '../../app/locales/de'

const NuxtLinkStub = defineComponent({
  props: ['to'],
  setup(props, { slots }) {
    return () => h('a', { href: props.to }, slots.default?.())
  },
})

const stations = [
  {
    id: 'g1',
    slug: 'gretsch-white-falcon',
    category: 'Gitarre',
    label: 'Gretsch White Falcon',
    detail: '1997 · White',
    rarity: 'rare' as const,
  },
  { id: 'g2', slug: 'boss-ce-2', category: 'Pedal', label: 'Boss CE-2 Chorus', detail: null, rarity: 'special' as const },
  { id: 'g3', slug: 'marshall-jtm45', category: 'Amp', label: 'Marshall JTM45', detail: null, rarity: null },
]

function mountChain(props: Record<string, unknown>) {
  installNuxtAutoImports()
  return mount(SignalChain, {
    props: { stations, isOwn: false, outsideCount: 0, ...props },
    global: { components: { NuxtLink: NuxtLinkStub } },
  })
}

describe('SignalChain', () => {
  it('zeigt jede Station in der uebergebenen Reihenfolge', () => {
    const wrapper = mountChain({})
    expect(wrapper.findAll('a').map((link) => link.text())).toEqual([
      'Gretsch White Falcon',
      'Boss CE-2 Chorus',
      'Marshall JTM45',
    ])
  })

  it('verlinkt jede Station auf ihre Gear-Seite', () => {
    const wrapper = mountChain({})
    expect(wrapper.findAll('a')[0].attributes('href')).toBe('/gear/gretsch-white-falcon')
  })

  it('zeichnet Namen und Knoten nach Seltenheit aus', () => {
    const wrapper = mountChain({})
    const links = wrapper.findAll('a')
    expect(links[0].classes()).toContain('text-rare')
    expect(links[1].classes()).toContain('text-special')
    expect(links[2].classes()).toContain('text-ink')
    // Hier stehen die Namen schon in font-semibold - ein zusaetzliches
    // font-medium waere eine Abstufung nach unten, kein Zugewinn.
    expect(links[0].classes()).not.toContain('font-medium')

    const nodes = wrapper.findAll('.rounded-full')
    expect(nodes).toHaveLength(stations.length)
    expect(nodes[0].classes()).toContain('bg-rare')
    expect(nodes[1].classes()).toContain('border-special')
    // Der stille Knoten wird auf dem Kabel vom Rand getragen, nicht von der
    // Deckkraft: zwischen zwei bg-line-Stuecken laese sich ein
    // halbtransparenter Punkt als duennere Stelle im Kabel, nicht als Station.
    expect(nodes[2].classes()).toContain('bg-surface')
    expect(nodes[2].classes()).toContain('border-line')
    expect(nodes[2].classes()).not.toContain('opacity-55')
  })

  it('setzt ein Kabel zwischen die Stationen, aber keins hinter die letzte', () => {
    const wrapper = mountChain({})
    // Ein Kabel ins Nichts liest sich als fehlendes Glied.
    expect(wrapper.findAll('[data-cable]')).toHaveLength(stations.length - 1)
  })

  it('zeigt bei einer einzigen Station gar kein Kabel', () => {
    const wrapper = mountChain({ stations: [stations[0]] })
    expect(wrapper.findAll('[data-cable]')).toHaveLength(0)
  })

  it('erklaert dem Eigentuemer die leere Kette', () => {
    const wrapper = mountChain({ stations: [], isOwn: true })
    expect(wrapper.text()).toContain(de.profile.chainEmptyOwn)
  })

  it('zeigt Besuchern bei leerer Kette gar nichts', () => {
    const wrapper = mountChain({ stations: [], isOwn: false })
    // Auf einem fremden Profil ist ein leerer Reiter eine Sackgasse.
    expect(wrapper.text().trim()).toBe('')
  })

  it('sagt, wo die Geraete ohne Platz im Signalweg geblieben sind', () => {
    const wrapper = mountChain({ outsideCount: 2 })
    // Ohne diesen Hinweis wirkt der Reiter, als haette er Geraete verschluckt.
    expect(wrapper.text()).toContain(de.profile.chainOutsideTitle)
    // Die Zahl darf nicht bloss ein Schalter sein - sie steht am Label und
    // muss die uebergebene Anzahl zeigen. Ein toContain('2') auf dem ganzen
    // Text waere schon durch "Boss CE-2 Chorus" gruen geworden.
    expect(wrapper.get('[data-outside-count]').text()).toBe('2')
  })

  it('schweigt, wenn das ganze Rig in der Kette steht', () => {
    const wrapper = mountChain({ outsideCount: 0 })
    // Ein Hinweis auf Geraete, die es nicht gibt, behauptet etwas ueber nichts.
    expect(wrapper.text()).not.toContain(de.profile.chainOutsideTitle)
  })
})
