// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import GearList from '../../app/components/GearList.vue'
import { installNuxtAutoImports } from '../helpers/nuxtAutoImports'
import { de } from '../../app/locales/de'

// Minimaler Ersatz fuer NuxtLink: ausserhalb von Nuxt gibt es die
// Komponente nicht, aber ein einfaches <a> reicht fuer diesen Test.
const NuxtLinkStub = defineComponent({
  props: ['to'],
  setup(props, { slots }) {
    return () => h('a', { href: props.to }, slots.default?.())
  },
})

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
    entries: [
      { id: 'g2', slug: 'marshall-jtm45', label: 'Marshall JTM45', detail: null, rarity: 'special' as const },
    ],
  },
]

function mountList(props: Record<string, unknown>) {
  installNuxtAutoImports()
  return mount(GearList, {
    props,
    global: { components: { NuxtLink: NuxtLinkStub }, stubs: { RarityPip: true } },
  })
}

describe('GearList', () => {
  it('zeigt je Gruppe ein Label mit der Anzahl', () => {
    const wrapper = mountList({ groups })
    expect(wrapper.text()).toContain('Gitarre')
    expect(wrapper.text()).toContain('Amp')
  })

  it('verlinkt jeden Eintrag auf seine Gear-Seite', () => {
    const wrapper = mountList({ groups })
    const links = wrapper.findAll('a')
    expect(links.map((link) => link.attributes('href'))).toEqual([
      '/gear/gretsch-white-falcon',
      '/gear/marshall-jtm45',
    ])
  })

  it('faerbt eine Raritaet anders als eine Besonderheit', () => {
    const wrapper = mountList({ groups })
    const links = wrapper.findAll('a')
    expect(links[0].classes()).toContain('text-rare')
    expect(links[1].classes()).toContain('text-special')
  })

  it('zeigt Detailangaben, wenn es welche gibt', () => {
    const wrapper = mountList({ groups })
    expect(wrapper.text()).toContain('1997')
  })

  it('laesst leere Gruppen ganz weg, statt eine leere Ueberschrift zu zeigen', () => {
    const wrapper = mountList({
      groups: [...groups, { key: 'pedal', label: 'Pedal', entries: [] }],
    })
    expect(wrapper.text()).not.toContain('Pedal')
  })

  it('zeigt eine Legende, solange etwas Ausgezeichnetes in der Liste steht', () => {
    const wrapper = mountList({ groups })
    expect(wrapper.text()).toContain(de.rarity.rare)
    expect(wrapper.text()).toContain(de.rarity.special)
  })

  it('laesst die Legende weg, wenn nichts ausgezeichnet ist', () => {
    const wrapper = mountList({
      groups: [
        {
          key: 'pedal',
          label: 'Pedal',
          entries: [{ id: 'g3', slug: 'boss-ds1', label: 'Boss DS-1', detail: null, rarity: 'mass' as const }],
        },
      ],
    })
    // Eine Legende, die nichts erklaert, ist Rauschen.
    expect(wrapper.text()).not.toContain(de.rarity.rare)
  })
})
