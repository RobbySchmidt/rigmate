// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import ProfileHeader from '../../app/components/ProfileHeader.vue'
import { installNuxtAutoImports } from '../helpers/nuxtAutoImports'
import { de } from '../../app/locales/de'

// Minimaler Ersatz fuer NuxtLink - dasselbe Muster wie in gearList.test.ts.
const NuxtLinkStub = defineComponent({
  props: ['to'],
  setup(props, { slots }) {
    return () => h('a', { href: props.to }, slots.default?.())
  },
})

const base = {
  displayName: 'Roehrenglut Ruediger',
  realName: 'Ruediger Behm',
  bio: 'Spielt seit 1987 dieselbe Kiste.',
  bands: ['Nachtschicht', 'Trafohaus'],
  avatarUrl: null,
  // Vier verschiedene Zahlen: eine hartkodierte Kennzahl im Template koennte
  // damit nicht an allen vier Stellen zufaellig stimmen.
  deviceCount: 4,
  rarityCount: 2,
  specialCount: 1,
  mateCount: 0,
  mateCountFailed: false,
  isOwn: false,
}

function mountHeader(props: Record<string, unknown> = {}) {
  installNuxtAutoImports()
  return mount(ProfileHeader, {
    props: { ...base, ...props },
    global: { components: { NuxtLink: NuxtLinkStub } },
  })
}

function statValue(wrapper: ReturnType<typeof mountHeader>, key: string): string {
  return wrapper.get(`[data-stat="${key}"] [data-value]`).text()
}

describe('ProfileHeader', () => {
  it('zeigt Anzeigename, echten Namen, Bio und Bands', () => {
    const wrapper = mountHeader()
    expect(wrapper.get('h1').text()).toBe('Roehrenglut Ruediger')
    expect(wrapper.text()).toContain('Ruediger Behm')
    expect(wrapper.text()).toContain('Spielt seit 1987 dieselbe Kiste.')
    expect(wrapper.text()).toContain('Nachtschicht')
    expect(wrapper.text()).toContain('Trafohaus')
  })

  it('laesst die freiwilligen Angaben weg, wenn es keine gibt', () => {
    // Der Anzeigename ist das Einzige, was Pflicht ist (siehe
    // settings.displayNameHint) - leere Absaetze sind kein Zustand.
    const wrapper = mountHeader({ realName: null, bio: null, bands: [] })
    expect(wrapper.text()).not.toContain('Ruediger Behm')
    expect(wrapper.text()).not.toContain(de.profile.bands)
  })

  it('zeigt alle vier Kennzahlen mit Label und Wert', () => {
    const wrapper = mountHeader()
    const labels = wrapper.findAll('[data-stat] [data-label]').map((node) => node.text())
    expect(labels).toEqual([
      de.profile.statDevices,
      de.profile.statRarities,
      de.profile.statSpecials,
      de.profile.statMates,
    ])
    expect(statValue(wrapper, 'devices')).toBe('4')
    expect(statValue(wrapper, 'rarities')).toBe('2')
    expect(statValue(wrapper, 'specials')).toBe('1')
  })

  it('zeigt bei null Rig-Kollegen eine echte Null', () => {
    // Roehrenglut Ruediger hat in den Demo-Daten tatsaechlich keinen: drei
    // seiner vier Geraete sind rare oder special. Seltenheit verbindet nicht
    // nur, sie isoliert auch - und das ist ein Ergebnis, kein Defekt.
    const wrapper = mountHeader({ mateCount: 0, mateCountFailed: false })
    expect(statValue(wrapper, 'mates')).toBe('0')
    expect(wrapper.get('[data-stat="mates"]').attributes('data-state')).toBe('ready')
    expect(wrapper.get('[data-stat="mates"]').text()).not.toContain(de.profile.statMatesError)
  })

  it('unterscheidet eine fehlgeschlagene Abfrage von der echten Null', () => {
    // Beide Faelle bekommen DIESELBE Zahl - nur das Flag unterscheidet sie.
    // Ein Kopf, der das Flag ignoriert, zeigt hier zweimal dasselbe und
    // faellt durch.
    const zero = mountHeader({ mateCount: 0, mateCountFailed: false })
    const failed = mountHeader({ mateCount: 0, mateCountFailed: true })
    expect(statValue(failed, 'mates')).not.toBe(statValue(zero, 'mates'))
    expect(failed.get('[data-stat="mates"]').attributes('data-state')).toBe('error')
    expect(failed.get('[data-stat="mates"]').text()).toContain(de.profile.statMatesError)
    expect(failed.get('[data-stat="mates"]').attributes('title')).toBe(de.profile.statMatesError)
  })

  it('behauptet keine Zahl, solange keine da ist', () => {
    // null ohne Fehler heisst "noch nicht bekannt". Eine 0 hinzuschreiben
    // waere eine Behauptung ueber Daten, die nie angekommen sind.
    const wrapper = mountHeader({ mateCount: null, mateCountFailed: false })
    expect(statValue(wrapper, 'mates')).not.toBe('0')
    expect(wrapper.get('[data-stat="mates"]').attributes('data-state')).toBe('pending')
    expect(wrapper.get('[data-stat="mates"]').text()).not.toContain(de.profile.statMatesError)
  })

  it('zeigt Folgen und Nachricht auf einem fremden Profil, aber deaktiviert', () => {
    // Sie stehen jetzt schon da, damit der Kopf zu Stufe 2 nicht neu
    // entworfen werden muss.
    const wrapper = mountHeader({ isOwn: false })
    const follow = wrapper.get('[data-action="follow"]')
    const message = wrapper.get('[data-action="message"]')
    expect(follow.text()).toBe(de.profile.follow)
    expect(message.text()).toBe(de.profile.message)
    expect(follow.attributes('disabled')).toBeDefined()
    expect(message.attributes('disabled')).toBeDefined()
    expect(follow.attributes('title')).toBe(de.profile.stageTwoHint)
    expect(message.attributes('title')).toBe(de.profile.stageTwoHint)
  })

  it('zeigt auf dem eigenen Profil statt der Aktionen den Bearbeiten-Link', () => {
    const wrapper = mountHeader({ isOwn: true })
    expect(wrapper.find('[data-action="follow"]').exists()).toBe(false)
    expect(wrapper.find('[data-action="message"]').exists()).toBe(false)
    const edit = wrapper.get('[data-action="edit"]')
    expect(edit.attributes('href')).toBe('/settings')
    expect(edit.text()).toBe(de.profile.editCta)
  })

  it('zeigt Initialen, wenn kein Bild da ist', () => {
    const wrapper = mountHeader({ avatarUrl: null, displayName: 'Tamara Bassmann' })
    expect(wrapper.find('img').exists()).toBe(false)
    // Zwei verschiedene Buchstaben in der richtigen Reihenfolge - "BT" oder
    // "TAM" wuerden hier auffallen.
    expect(wrapper.get('[data-initials]').text()).toBe('TB')
  })

  it('nimmt bei einem einzelnen Wort nur einen Buchstaben', () => {
    const wrapper = mountHeader({ avatarUrl: null, displayName: 'halbtakt' })
    expect(wrapper.get('[data-initials]').text()).toBe('H')
  })

  it('zeigt das Foto, sobald eines da ist, und dann keine Initialen', () => {
    const wrapper = mountHeader({ avatarUrl: 'https://example.invalid/a.jpg' })
    expect(wrapper.get('img').attributes('src')).toBe('https://example.invalid/a.jpg')
    expect(wrapper.get('img').attributes('alt')).toBe('Roehrenglut Ruediger')
    expect(wrapper.find('[data-initials]').exists()).toBe(false)
  })
})
