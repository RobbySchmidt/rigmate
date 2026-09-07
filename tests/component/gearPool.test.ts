// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import GearPool from '../../app/components/GearPool.vue'
import { installNuxtAutoImports } from '../helpers/nuxtAutoImports'
import { de } from '../../app/locales/de'

const items = [
  { id: 'g3', slug: 'c', category: 'Amp', label: 'Marshall JTM45', detail: null, rarity: 'special' as const },
  { id: 'g4', slug: 'd', category: 'Cabinet', label: 'Marshall 1960B', detail: null, rarity: null },
]

function mountPool(props: Record<string, unknown> = {}) {
  installNuxtAutoImports()
  return mount(GearPool, {
    props: { items, ...props },
    global: {
      stubs: {
        draggable: {
          props: ['modelValue', 'itemKey'],
          template:
            '<div><template v-for="(el, i) in modelValue" :key="el.id"><slot name="item" :element="el" :index="i" /></template></div>',
        },
      },
    },
  })
}

describe('GearPool', () => {
  it('listet jedes Geraet ausserhalb der Kette', () => {
    const wrapper = mountPool()
    expect(wrapper.text()).toContain('Marshall JTM45')
    expect(wrapper.text()).toContain('Marshall 1960B')
  })

  it('zeigt zu jedem Geraet seine Kategorie', () => {
    const wrapper = mountPool()
    expect(wrapper.text()).toContain('Amp')
    expect(wrapper.text()).toContain('Cabinet')
  })

  it('haengt ein Geraet per Knopf an, ohne Ziehen', async () => {
    const wrapper = mountPool()
    const buttons = wrapper.findAll(`[aria-label="${de.profile.chainAppend}"]`)
    expect(buttons).toHaveLength(2)
    await buttons[1].trigger('click')

    // Der Knopf traegt die schmale Ansicht, wo nichts nach links gezogen wird.
    expect(wrapper.emitted('append')).toEqual([['g4']])
  })

  it('faerbt eine Besonderheit anders als ein Allerweltsgeraet', () => {
    const wrapper = mountPool()
    const html = wrapper.html()
    expect(html).toContain('text-special')
  })

  it('sagt es, wenn alles schon in der Kette steht', () => {
    const wrapper = mountPool({ items: [] })
    expect(wrapper.text()).toContain(de.profile.chainPoolEmpty)
  })

  it('zeigt bei leerem Pool keine Anhaengen-Knoepfe', () => {
    const wrapper = mountPool({ items: [] })
    expect(wrapper.findAll(`[aria-label="${de.profile.chainAppend}"]`)).toHaveLength(0)
  })

  it('sagt, dass die Geraete hier nicht verschwinden', () => {
    const wrapper = mountPool()
    // Ohne den Hinweis wirkt die Liste wie ein Wartezimmer.
    expect(wrapper.text()).toContain(de.profile.chainPoolHint)
  })
})
