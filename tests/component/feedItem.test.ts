// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import FeedItem from '../../app/components/FeedItem.vue'
import { installNuxtAutoImports } from '../helpers/nuxtAutoImports'
import { de } from '../../app/locales/de'
import type { RigEvent } from '../../shared/utils/rigEvents'

const NuxtLinkStub = defineComponent({
  props: ['to'],
  setup(props, { slots }) {
    return () => h('a', { href: props.to }, slots.default?.())
  },
})

const manyItems: RigEvent = {
  day: '2026-09-07',
  items: [
    {
      id: 'g1',
      label: 'Gretsch White Falcon',
      slug: 'gretsch-white-falcon',
      detail: '1997',
      rarity: 'rare',
      createdAt: '2026-09-07T18:20:00.000Z',
    },
    {
      id: 'g2',
      label: 'Boss CE-2 Chorus',
      slug: 'boss-ce-2',
      detail: null,
      rarity: 'special',
      createdAt: '2026-09-07T09:05:00.000Z',
    },
    {
      id: 'g3',
      label: 'Boss DS-1',
      slug: 'boss-ds1',
      detail: null,
      rarity: 'mass',
      createdAt: '2026-09-07T08:00:00.000Z',
    },
  ],
  hasRarity: true,
}

const oneItem: RigEvent = {
  day: '2026-01-03',
  items: [
    {
      id: 'g4',
      label: 'Boss DS-1',
      slug: 'boss-ds1',
      detail: null,
      rarity: 'mass',
      createdAt: '2026-01-03T11:00:00.000Z',
    },
  ],
  hasRarity: false,
}

function mountItem(props: Record<string, unknown> = {}) {
  installNuxtAutoImports()
  return mount(FeedItem, {
    props: { event: manyItems, displayName: 'Halbtakt Hanno', ...props },
    global: { components: { NuxtLink: NuxtLinkStub } },
  })
}

describe('FeedItem', () => {
  it('nennt die Person', () => {
    expect(mountItem().text()).toContain('Halbtakt Hanno')
  })

  it('zeigt jedes Geraet des Ereignisses und verlinkt es auf seine Gear-Seite', () => {
    const wrapper = mountItem()
    const links = wrapper.findAll('[data-device]')
    expect(links.map((link) => link.text())).toEqual([
      'Gretsch White Falcon',
      'Boss CE-2 Chorus',
      'Boss DS-1',
    ])
    expect(links.map((link) => link.attributes('href'))).toEqual([
      '/gear/gretsch-white-falcon',
      '/gear/boss-ce-2',
      '/gear/boss-ds1',
    ])
  })

  it('traegt die Seltenheitsfarbe an den Geraetenamen', () => {
    const links = mountItem().findAll('[data-device]')
    expect(links[0].classes()).toContain('text-rare')
    expect(links[1].classes()).toContain('text-special')
    expect(links[2].classes()).toContain('text-ink')
  })

  it('zeigt Detailangaben, wenn es welche gibt', () => {
    expect(mountItem().text()).toContain('1997')
  })

  it('sagt bei einem Geraet etwas anderes als bei mehreren', () => {
    const many = mountItem({ event: manyItems })
    expect(many.text()).toContain(de.profile.feedAddedMany)
    expect(many.text()).not.toContain(de.profile.feedAddedOne)

    const one = mountItem({ event: oneItem })
    expect(one.text()).toContain(de.profile.feedAddedOne)
    expect(one.text()).not.toContain(de.profile.feedAddedMany)
  })

  it('zeigt den Raritaetshinweis nur, wenn das Ereignis eine Raritaet enthaelt', () => {
    const withRarity = mountItem({ event: manyItems })
    const hint = withRarity.get('[data-rarity-hint]')
    expect(hint.text()).toContain(de.profile.feedRareTitle)
    expect(hint.text()).toContain(de.profile.feedRareHint)

    const without = mountItem({ event: oneItem })
    expect(without.find('[data-rarity-hint]').exists()).toBe(false)
    expect(without.text()).not.toContain(de.profile.feedRareHint)
  })

  it('schreibt den Tag deutsch und haelt das ISO-Datum maschinenlesbar', () => {
    // Bewusst ohne Date und ohne toLocaleDateString: die Seite rendert
    // serverseitig, und ein Server mit anderer Standardsprache oder
    // Zeitzone als der Browser gibt sonst einen Hydration-Mismatch. Hier
    // wird nur die ISO-Zeichenkette umgestellt - das kann auf beiden Seiten
    // nur dasselbe ergeben.
    const time = mountItem({ event: manyItems }).get('time')
    expect(time.text()).toBe('07.09.2026')
    expect(time.attributes('datetime')).toBe('2026-09-07')

    // Zweites Datum, damit kein fest verdrahteter String durchgeht.
    const other = mountItem({ event: oneItem }).get('time')
    expect(other.text()).toBe('03.01.2026')
    expect(other.attributes('datetime')).toBe('2026-01-03')
  })
})
