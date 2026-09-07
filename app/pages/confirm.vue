<script setup lang="ts">
const t = useText()
</script>

<template>
  <div class="mx-auto max-w-sm text-center">
    <h1 class="mb-4 text-f-3xl font-semibold">{{ t.auth.confirmTitle }}</h1>
    <p class="mb-f-6">{{ t.auth.confirmBody }}</p>
    <NuxtLink to="/onboarding" class="rounded bg-accent px-4 py-2 text-accent-ink">
      {{ t.auth.confirmCta }}
    </NuxtLink>
  </div>
</template>
