import { vi } from 'vitest'
import {
  ref,
  reactive,
  computed,
  watch,
  watchEffect,
  onMounted,
  onUnmounted,
  nextTick,
  toRef,
  toRefs,
  unref,
  shallowRef,
  readonly,
} from 'vue'
import { de } from '../../app/locales/de'

/**
 * Nuxt loest ref/computed/watch/... und eigene Composables wie useText() per
 * Auto-Import auf, ohne dass eine Komponente sie importiert. Ausserhalb von
 * Nuxts Build-Pipeline (reines Vitest + @vitejs/plugin-vue) muessen diese
 * Namen von Hand als Globals bereitstehen, sonst schlaegt eine kompilierte
 * <script setup>-Datei mit "ref is not defined" fehl. vi.stubGlobal() macht
 * genau das; vitest.config.ts setzt `unstubGlobals: true`, das raeumt
 * zwischen Tests automatisch wieder auf.
 */
export function installNuxtAutoImports(): void {
  vi.stubGlobal('ref', ref)
  vi.stubGlobal('reactive', reactive)
  vi.stubGlobal('computed', computed)
  vi.stubGlobal('watch', watch)
  vi.stubGlobal('watchEffect', watchEffect)
  vi.stubGlobal('onMounted', onMounted)
  vi.stubGlobal('onUnmounted', onUnmounted)
  vi.stubGlobal('nextTick', nextTick)
  vi.stubGlobal('toRef', toRef)
  vi.stubGlobal('toRefs', toRefs)
  vi.stubGlobal('unref', unref)
  vi.stubGlobal('shallowRef', shallowRef)
  vi.stubGlobal('readonly', readonly)
  vi.stubGlobal('useText', () => de)
}

/**
 * definePageMeta ist ein Nuxt-Makro, das der normale Vue-SFC-Compiler nicht
 * kennt und deshalb nicht wegkompiliert - unter reinem Vitest bleibt ein
 * echter Funktionsaufruf uebrig, der ins Leere laufen muss.
 */
export function stubDefinePageMeta(): void {
  vi.stubGlobal('definePageMeta', () => {})
}

/**
 * Bildet nach, wie sich Nuxts echtes useAsyncData() von aussen verhaelt:
 * `await useAsyncData(key, handler)` liefert `{ data, refresh }`, wobei
 * `data` ein Ref ist und `refresh()` den Handler erneut ausfuehrt und
 * `data` aktualisiert. Genug, um eine Seite zu testen, ohne Nuxts eigene
 * SSR-Datenorchestrierung nachzubauen.
 */
export function stubUseAsyncData(): void {
  vi.stubGlobal('useAsyncData', async (_key: string, handler: () => Promise<unknown>) => {
    const data = ref(await handler())
    const refresh = vi.fn(async () => {
      data.value = await handler()
    })
    return { data, refresh }
  })
}

/**
 * Bildet nach, wie sich Nuxts echtes useFetch() von aussen verhaelt:
 * `await useFetch(url)` liefert `{ data }` mit dem schon aufgeloesten
 * Ergebnis als Ref. Anders als useAsyncData nimmt useFetch keinen Handler
 * entgegen, sondern eine URL - fuer eine Seite wie index.vue, die genau
 * einen Endpunkt ohne weitere Optionen laedt, reicht es, das uebergebene
 * Ergebnis direkt zurueckzugeben.
 */
export function stubUseFetch(response: unknown): void {
  vi.stubGlobal('useFetch', async () => ({ data: ref(response) }))
}
