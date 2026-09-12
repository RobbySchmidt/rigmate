<script setup lang="ts">
const props = defineProps<{
  userId: string
  displayName: string
  reason: any | null
  matchCount: number
}>()

const t = useText()
const text = computed(() => useRecommendationReason(props.reason, props.matchCount))
</script>

<template>
  <NuxtLink :to="`/profile/${userId}`" class="flex flex-col gap-1 rounded-card bg-surface p-4 outline-none transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent">
    <span class="text-f-lg font-medium">{{ displayName }}</span>
    <span class="text-sm text-muted">{{ text }}</span>
    <span v-if="!reason" data-fallback class="text-xs text-muted opacity-70">{{ t.suggestions.fallbackBadge }}</span>
  </NuxtLink>
</template>
