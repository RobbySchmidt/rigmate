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

// Erstes Laden bleibt SSR-faehig wie bei gear/[slug].vue: ein "await
// useFetch(...)" beim Seitenaufbau, damit ein direkt aufgerufener Link wie
// /search?q=ac30 sofort Ergebnisse zeigt statt erst auf eine Eingabe zu
// warten.
const { data } = await useFetch<SearchResponse>('/api/search', {
  query: { q: term.value },
})

// Ab hier dieselbe Kombination wie in CatalogPicker.vue: ein eigener
// setTimeout-Debounce statt VueUse's watchDebounced (keine neue Abhaengigkeit
// fuer eine einzige Funktion) plus der bestehende requestGuard, der eine
// spaet eintreffende Antwort auf einen laengst verlassenen Suchbegriff
// verwirft.
let debounce: ReturnType<typeof setTimeout> | undefined
const guard = createRequestGuard()

watch(term, (value) => {
  clearTimeout(debounce)
  const ticket = guard.next()

  if (value.trim() === '') {
    router.replace({ query: {} })
    data.value = { catalog: [], people: [] }
    return
  }

  debounce = setTimeout(async () => {
    router.replace({ query: { q: value } })
    try {
      const body = await $fetch<SearchResponse>('/api/search', { query: { q: value } })
      // Inzwischen kam ein neuerer Tastendruck - diese Antwort ist
      // Vergangenheit und darf nichts mehr ueberschreiben.
      if (!guard.isCurrent(ticket)) return
      data.value = body
    } catch {
      if (!guard.isCurrent(ticket)) return
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
      class="w-full rounded border px-3 py-2"
    />

    <section v-if="(data?.catalog ?? []).length > 0">
      <h2 class="mb-3 text-f-2xl font-semibold">{{ t.search.gearHeading }}</h2>
      <ul class="divide-y rounded border">
        <li v-for="hit in data.catalog" :key="hit.id" class="px-3 py-2">
          <NuxtLink :to="`/gear/${hit.slug}`" class="underline">
            {{ hit.brandName }} {{ hit.name }}
          </NuxtLink>
        </li>
      </ul>
    </section>

    <section>
      <h2 class="mb-3 text-f-2xl font-semibold">{{ t.search.peopleHeading }}</h2>
      <p v-if="!user" class="text-neutral-600">{{ t.search.peopleLoginHint }}</p>
      <ul v-else-if="(data?.people ?? []).length > 0" class="divide-y rounded border">
        <li v-for="hit in data.people" :key="hit.userId" class="px-3 py-2">
          <NuxtLink :to="`/profile/${hit.userId}`" class="underline">{{ hit.displayName }}</NuxtLink>
        </li>
      </ul>
      <p v-else class="text-neutral-600">{{ t.search.noResults }}</p>
    </section>
  </div>
</template>
