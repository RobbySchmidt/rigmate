<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const t = useText()
const { data } = await useFetch<{ fallback: boolean; suggestions: any[] }>('/api/recommendations')
</script>

<template>
  <div class="flex flex-col gap-f-8">
    <h1 class="text-f-4xl font-semibold">{{ t.suggestions.title }}</h1>

    <!-- Die Leere erklaeren statt kaschieren: der leere Zustand bringt der
         App ihr eigenes Prinzip bei. -->
    <div v-if="data?.fallback" class="rounded border border-dashed p-4">
      <p class="mb-2 font-medium">{{ t.suggestions.emptyTitle }}</p>
      <p class="mb-4 text-neutral-600">{{ t.suggestions.emptyBody }}</p>
      <NuxtLink to="/onboarding" class="rounded bg-neutral-900 px-4 py-2 text-white">
        {{ t.suggestions.emptyCta }}
      </NuxtLink>
    </div>
    <p v-else class="text-sm text-neutral-500">{{ t.suggestions.refineHint }}</p>

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
  </div>
</template>
