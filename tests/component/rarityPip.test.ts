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
    expect(wrapper.classes()).not.toContain('bg-special')
  })

  it('bleibt bei common still - sonst leuchtet die ganze Liste', () => {
    const wrapper = mount(RarityPip, { props: { rarity: 'common' } })
    expect(wrapper.classes()).not.toContain('bg-rare')
    expect(wrapper.classes()).not.toContain('border-special')
  })

  it('bleibt auch bei mass still', () => {
    const wrapper = mount(RarityPip, { props: { rarity: 'mass' } })
    expect(wrapper.classes()).not.toContain('bg-rare')
    expect(wrapper.classes()).not.toContain('border-special')
  })

  it('vertraegt null, ohne zu brechen', () => {
    const wrapper = mount(RarityPip, { props: { rarity: null } })
    expect(wrapper.classes()).not.toContain('bg-rare')
  })
})
