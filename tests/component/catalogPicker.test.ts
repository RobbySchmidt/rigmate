// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import CatalogPicker from '../../app/components/CatalogPicker.vue'
import { installNuxtAutoImports } from '../helpers/nuxtAutoImports'
import { createRequestGuard } from '../../app/utils/requestGuard'
import { de } from '../../app/locales/de'

function fakeResult(overrides: Record<string, unknown> = {}) {
  return {
    id: 'strat-1',
    name: 'Stratocaster',
    slug: 'fender-stratocaster',
    brandName: 'Fender',
    categoryId: 'guitar',
    level: 'line',
    lineId: 'strat-1',
    lineName: 'Stratocaster',
    rarityBase: 'mass',
    isVerified: true,
    needsPrecisionHint: true,
    ...overrides,
  }
}

/** Ein Promise, dessen Aufloesung der Test von aussen steuert - fuer Kontrolle ueber die Reihenfolge der Antworten. */
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const DEBOUNCE_WAIT_MS = 150

function waitForDebounce() {
  return new Promise((resolve) => setTimeout(resolve, DEBOUNCE_WAIT_MS))
}

function mountPicker(props: Record<string, unknown> = {}) {
  return mount(CatalogPicker, {
    props: {
      createHandler: vi.fn(),
      ...props,
    },
  })
}

async function openCreateForm(wrapper: VueWrapper) {
  await wrapper.get('input').setValue('Ganz Neu')
  await waitForDebounce()
  await flushPromises()
  const hintButton = wrapper.findAll('button').find((button) => button.text() === de.picker.createHint)
  await hintButton!.trigger('click')
}

beforeEach(() => {
  installNuxtAutoImports()
  vi.stubGlobal('createRequestGuard', createRequestGuard)
})

describe('CatalogPicker - Suche', () => {
  it('ueberschreibt aktuelle Ergebnisse nicht mit einer veralteten Antwort', async () => {
    // Genau der Fehler aus Fix-Runde 1: eine langsame Antwort auf "str" kam
    // nach einer schnellen Antwort auf "strat" an und ueberschrieb sie.
    const staleResponse = deferred<{ results: unknown[] }>()
    const freshResponse = deferred<{ results: unknown[] }>()
    const fetchMock = vi.fn().mockReturnValueOnce(staleResponse.promise).mockReturnValueOnce(freshResponse.promise)
    vi.stubGlobal('$fetch', fetchMock)

    const wrapper = mountPicker()
    const input = wrapper.get('input')

    await input.setValue('str')
    await waitForDebounce()
    await input.setValue('strat')
    await waitForDebounce()
    expect(fetchMock).toHaveBeenCalledTimes(2)

    freshResponse.resolve({ results: [fakeResult({ id: 'fresh', name: 'Strat aktuell' })] })
    await flushPromises()
    expect(wrapper.text()).toContain('Strat aktuell')

    staleResponse.resolve({ results: [fakeResult({ id: 'stale', name: 'Str veraltet' })] })
    await flushPromises()
    expect(wrapper.text()).toContain('Strat aktuell')
    expect(wrapper.text()).not.toContain('Str veraltet')
  })

  it('verwirft eine Antwort, die noch unterwegs war, als das Feld geleert wurde', async () => {
    const inFlight = deferred<{ results: unknown[] }>()
    vi.stubGlobal('$fetch', vi.fn().mockReturnValue(inFlight.promise))

    const wrapper = mountPicker()
    const input = wrapper.get('input')

    await input.setValue('strat')
    await waitForDebounce()

    await input.setValue('')
    expect(wrapper.findAll('li')).toHaveLength(0)

    inFlight.resolve({ results: [fakeResult()] })
    await flushPromises()
    expect(wrapper.findAll('li')).toHaveLength(0)
  })

  it('zeigt bei einer fehlgeschlagenen Suche einen Fehlertext statt einer veralteten Liste', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ results: [fakeResult({ name: 'Alter Treffer' })] })
      .mockRejectedValueOnce(new Error('network down'))
    vi.stubGlobal('$fetch', fetchMock)

    const wrapper = mountPicker()
    const input = wrapper.get('input')

    await input.setValue('s')
    await waitForDebounce()
    await flushPromises()
    expect(wrapper.text()).toContain('Alter Treffer')

    await input.setValue('st')
    await waitForDebounce()
    await flushPromises()

    expect(wrapper.text()).not.toContain('Alter Treffer')
    expect(wrapper.findAll('li')).toHaveLength(0)
    expect(wrapper.text()).toContain(de.picker.searchError)
  })
})

describe('CatalogPicker - neu anlegen', () => {
  it('zeigt bei einem Fehlschlag eine Meldung und leert das Formular nicht', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({ results: [] }))
    const createHandler = vi.fn().mockResolvedValue({ success: false, message: de.picker.createDuplicateError })
    const wrapper = mountPicker({ createHandler })

    await openCreateForm(wrapper)
    const [brandInput, nameInput] = wrapper.get('form').findAll('input')
    await brandInput.setValue('Fender')
    await nameInput.setValue('Ganz Neu')
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain(de.picker.createDuplicateError)
    expect((brandInput.element as HTMLInputElement).value).toBe('Fender')
    expect((nameInput.element as HTMLInputElement).value).toBe('Ganz Neu')
  })

  it('leert das Formular und meldet den neuen Eintrag als Auswahl nach oben', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({ results: [] }))
    const createdItem = fakeResult({ id: 'new-1', name: 'Ganz Neu' })
    const createHandler = vi.fn().mockResolvedValue({ success: true, item: createdItem })
    const wrapper = mountPicker({ createHandler })

    await openCreateForm(wrapper)
    const [brandInput, nameInput] = wrapper.get('form').findAll('input')
    await brandInput.setValue('Fender')
    await nameInput.setValue('Ganz Neu')
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.emitted('select')?.[0]).toEqual([createdItem])
    expect(wrapper.find('form').exists()).toBe(false)
  })
})
