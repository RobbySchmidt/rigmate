// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RarityPip from '../../app/components/RarityPip.vue'

describe('RarityPip', () => {
  it('zeigt einen gefuellten Punkt bei rare', () => {
    const wrapper = mount(RarityPip, { props: { rarity: 'rare' } })
    expect(wrapper.classes()).toContain('bg-rare')
  })

  it('zeigt einen hohlen Ring bei special', () => {
    const wrapper = mount(RarityPip, { props: { rarity: 'special' } })
    expect(wrapper.classes()).toContain('border-special')
    // Gemeint ist "kein Hintergrund" - 'bg-special' ist eine Klasse, die im
    // Code an keiner Stelle vorkommt, ein Vergleich dagegen kann also nie rot
    // werden. Stattdessen wird direkt geprueft, dass gar keine bg-Klasse
    // gesetzt ist.
    expect(wrapper.classes().some((name) => name.startsWith('bg-'))).toBe(false)
  })

  it('bleibt bei common still - sonst leuchtet die ganze Liste', () => {
    const wrapper = mount(RarityPip, { props: { rarity: 'common' } })
    expect(wrapper.classes()).not.toContain('bg-rare')
    expect(wrapper.classes()).not.toContain('border-special')
    // Positiv geprueft: der stille Punkt bekommt tatsaechlich die Klasse, die
    // ihn zeichnet - sonst waere ein leerer String hier ebenso gruen.
    expect(wrapper.classes()).toContain('bg-line')
  })

  it('bleibt auch bei mass still', () => {
    const wrapper = mount(RarityPip, { props: { rarity: 'mass' } })
    expect(wrapper.classes()).not.toContain('bg-rare')
    expect(wrapper.classes()).not.toContain('border-special')
    expect(wrapper.classes()).toContain('bg-line')
  })

  it('vertraegt null, ohne zu brechen', () => {
    const wrapper = mount(RarityPip, { props: { rarity: null } })
    expect(wrapper.classes()).not.toContain('bg-rare')
    expect(wrapper.classes()).toContain('bg-line')
  })

  it('traegt selbst keinen vertikalen Versatz mehr', () => {
    // Der Punkt beschreibt nur noch, WAS er ist - nicht, WO er sitzt. Der
    // Versatz haengt am Kontext (Liste vs. Legende) und gehoert deshalb an
    // die Aufrufstelle.
    const wrapper = mount(RarityPip, { props: { rarity: 'rare' } })
    expect(wrapper.classes().filter((name) => name.startsWith('mt-'))).toEqual([])
  })

  it('reicht eine von aussen gesetzte Klasse durch', () => {
    const wrapper = mount(RarityPip, { props: { rarity: 'rare' }, attrs: { class: 'mt-2' } })
    expect(wrapper.classes()).toContain('mt-2')
    // Der wichtige Teil: die durchgereichte Klasse ERGAENZT die eigene,
    // sie ersetzt sie nicht.
    expect(wrapper.classes()).toContain('bg-rare')
  })
})
