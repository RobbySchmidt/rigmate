<script setup lang="ts">
// Kein middleware: 'auth' hier - das ist der Punkt dieser Seite (Abschnitt
// 10). Suchen darf jeder, Equipment ist das Schaufenster; nur die
// Personen-Ergebnisse haengen am Login-Status, nicht die Seite selbst.
interface CatalogHit {
  id: string
  slug: string
  name: string
  brandName: string
  categoryId: string
  level: 'line' | 'variant'
}

interface PersonHit {
  userId: string
  displayName: string
}

interface SearchResponse {
  catalog: CatalogHit[]
  people: PersonHit[]
}

const t = useText()
const route = useRoute()
const router = useRouter()
const user = useSupabaseUser()

const term = ref(typeof route.query.q === 'string' ? route.query.q : '')

// Dritter Teil des CatalogPicker-Musters, der in Fix-Runde 1 fehlte: ein
// eigener Fehler-Status. Ohne ihn sehen ein Netzwerkfehler und "nichts
// gefunden" identisch aus - eine leere Liste in beiden Faellen. Muss von
// einer echten Null-Treffer-Antwort unterscheidbar bleiben, deshalb ein
// eigenes Flag statt eines weiteren Sonderwerts in `data`.
const searchError = ref(false)

// Erstes Laden bleibt SSR-faehig wie bei gear/[slug].vue: ein "await
// useFetch(...)" beim Seitenaufbau, damit ein direkt aufgerufener Link wie
// /search?q=ac30 sofort Ergebnisse zeigt statt erst auf eine Eingabe zu
// warten. useFetch wirft bei einem Fehler nicht selbst (anders als $fetch
// unten) - es fuellt statt dessen `error`, waehrend `data` still bei `null`
// bleibt. Ungeprueft haette das genau denselben Effekt wie unten: eine leere
// Antwort sieht aus wie "nichts gefunden".
const { data, error } = await useFetch<SearchResponse>('/api/search', {
  query: { q: term.value },
})
if (error.value) searchError.value = true

// Ab hier dieselbe Kombination wie in CatalogPicker.vue: ein eigener
// setTimeout-Debounce statt VueUse's watchDebounced (keine neue Abhaengigkeit
// fuer eine einzige Funktion), der bestehende requestGuard, der eine spaet
// eintreffende Antwort auf einen laengst verlassenen Suchbegriff verwirft,
// und jetzt auch der sichtbare Fehlertext, den CatalogPicker fuer denselben
// Fall schon zeigt.
let debounce: ReturnType<typeof setTimeout> | undefined
const guard = createRequestGuard()

watch(term, (value) => {
  clearTimeout(debounce)
  const ticket = guard.next()

  if (value.trim() === '') {
    // .catch(): eine verworfene/doppelte Navigation lehnt das Promise von
    // router.replace() ab, ohne dass hier ein Ergebnis noch aussteht - eine
    // unbehandelte Ablehnung waere nur Laerm, kein Zustand, der die Seite
    // wie "nichts gefunden" aussehen liesse.
    router.replace({ query: {} }).catch(() => {})
    searchError.value = false
    data.value = { catalog: [], people: [] }
    return
  }

  debounce = setTimeout(async () => {
    router.replace({ query: { q: value } }).catch(() => {})
    try {
      const body = await $fetch<SearchResponse>('/api/search', { query: { q: value } })
      // Inzwischen kam ein neuerer Tastendruck - diese Antwort ist
      // Vergangenheit und darf nichts mehr ueberschreiben.
      if (!guard.isCurrent(ticket)) return
      searchError.value = false
      data.value = body
    } catch {
      if (!guard.isCurrent(ticket)) return
      // Nicht still auf eine leere Liste zurueckfallen: ein Fehlschlag ist
      // ein Fehlschlag, kein Nulltreffer. Siehe searchError-Deklaration oben.
      searchError.value = true
      data.value = { catalog: [], people: [] }
    }
  }, 200)
})
</script>

<template>
  <div class="flex flex-col gap-f-8">
    <h1 class="text-f-4xl font-semibold">{{ t.search.title }}</h1>
    <input
      v-model="term"
      type="search"
      :placeholder="t.search.placeholder"
      class="w-full rounded border border-line px-3 py-2"
    />

    <!-- Ein Fehlschlag ersetzt die Ergebnisflaeche vollstaendig statt in
         einer der beiden Sektionen mitzulaufen - sonst muesste jede Sektion
         fuer sich zwischen "leer" und "kaputt" unterscheiden, und genau das
         war die Luecke aus Fix-Runde 1. Eigener Text, damit er nie wie
         t.search.noResults oder t.search.peopleLoginHint aussieht. -->
    <p v-if="searchError" class="text-danger">{{ t.search.searchError }}</p>
    <template v-else>
      <section v-if="(data?.catalog ?? []).length > 0">
        <h2 class="mb-3 text-f-2xl font-semibold">{{ t.search.gearHeading }}</h2>
        <ul class="divide-y divide-line-soft rounded border border-line">
          <li v-for="hit in data.catalog" :key="hit.id" class="px-3 py-2">
            <NuxtLink :to="`/gear/${hit.slug}`" class="underline">
              {{ hit.brandName }} {{ hit.name }}
            </NuxtLink>
          </li>
        </ul>
      </section>

      <section>
        <h2 class="mb-3 text-f-2xl font-semibold">{{ t.search.peopleHeading }}</h2>
        <p v-if="!user" class="text-muted">{{ t.search.peopleLoginHint }}</p>
        <ul v-else-if="(data?.people ?? []).length > 0" class="divide-y divide-line-soft rounded border border-line">
          <li v-for="hit in data.people" :key="hit.userId" class="px-3 py-2">
            <NuxtLink :to="`/profile/${hit.userId}`" class="underline">{{ hit.displayName }}</NuxtLink>
          </li>
        </ul>
        <p v-else class="text-muted">{{ t.search.noResults }}</p>
      </section>
    </template>
  </div>
</template>
