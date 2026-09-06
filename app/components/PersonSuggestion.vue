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
  <NuxtLink :to="`/profile/${userId}`" class="flex flex-col gap-1 rounded border p-4">
    <span class="text-f-lg font-medium">{{ displayName }}</span>
    <span class="text-sm text-neutral-600">{{ text }}</span>
    <span v-if="!reason" class="text-xs text-neutral-400">{{ t.suggestions.fallbackBadge }}</span>
  </NuxtLink>
</template>
