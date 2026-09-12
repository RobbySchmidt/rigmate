<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const t = useText()

// Fix-Runde (Abschluss): dasselbe Muster wie search.vue und
// profile/[id].vue. useFetch wirft bei einem Fehler nicht selbst - es
// fuellt `error` und laesst `data` bei `null`. Ungeprueft sah ein
// fehlgeschlagener Request hier identisch aus wie "kein eigenes Rig"
// (fallback-Karte) UND wie "echte Treffer, aber gerade keine da"
// (refineHint mit leerer Liste) - drei Zustaende, zwei Erscheinungsbilder.
// Ein eigenes Flag haelt sie auseinander.
const { data, error } = await useFetch<{ fallback: boolean; suggestions: any[] }>('/api/recommendations')
const recommendationsError = computed(() => !!error.value)
</script>

<template>
  <div class="flex flex-col gap-f-8">
    <h1 class="display text-f-4xl font-semibold">{{ t.suggestions.title }}</h1>

    <p v-if="recommendationsError" class="text-danger">{{ t.suggestions.loadError }}</p>
    <template v-else>
      <!-- Die Leere erklaeren statt kaschieren: der leere Zustand bringt der
           App ihr eigenes Prinzip bei. -->
      <div v-if="data?.fallback" class="rounded-card border border-dashed border-line p-4">
        <p class="mb-2 font-medium">{{ t.suggestions.emptyTitle }}</p>
        <p class="mb-4 text-muted">{{ t.suggestions.emptyBody }}</p>
        <NuxtLink
          to="/onboarding"
          class="rounded-btn bg-accent px-4 py-2 text-accent-ink outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {{ t.suggestions.emptyCta }}
        </NuxtLink>
      </div>
      <p v-else class="text-sm text-muted">{{ t.suggestions.refineHint }}</p>

      <div class="grid gap-4 sm:grid-cols-2">
        <PersonSuggestion
          v-for="suggestion in data?.suggestions ?? []"
          :key="suggestion.userId"
          :user-id="suggestion.userId"
          :display-name="suggestion.displayName"
          :reason="suggestion.reason"
          :match-count="suggestion.matchCount"
        />
      </div>
    </template>
  </div>
</template>
