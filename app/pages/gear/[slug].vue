<script setup lang="ts">
// Kein middleware: 'auth' hier - das ist der Punkt dieser Seite. Der
// Katalog ist das Schaufenster (Abschnitt 10): oeffentlich lesbar und
// auffindbar, ohne Login. Nur die Spielernamen weiter unten haengen am
// Login-Status, nicht die Seite selbst.
const t = useText()
const route = useRoute()
const user = useSupabaseUser()

const { data } = await useFetch<any>(`/api/gear/${route.params.slug}`)

useSeoMeta({
  title: () => `${data.value?.item.brandName} ${data.value?.item.name} - ${t.app.name}`,
  description: () =>
    `${data.value?.item.brandName} ${data.value?.item.name}: ${t.gearPage.playersCount.replace('{count}', String(data.value?.stats.ownerCount ?? 0))}`,
})

const categoryLabel = computed(
  () => t.categories[data.value?.item.categoryId as keyof typeof t.categories] ?? '',
)
</script>

<template>
  <article v-if="data" class="flex flex-col gap-f-8">
    <header class="flex flex-col gap-2">
      <p class="text-sm text-neutral-500">{{ categoryLabel }}</p>
      <h1 class="text-f-5xl font-semibold">{{ data.item.brandName }} {{ data.item.name }}</h1>
      <p class="text-sm text-neutral-600">
        {{ t.gearPage.rarity[data.item.rarityBase as keyof typeof t.gearPage.rarity] }} ·
        {{ t.gearPage.playersCount.replace('{count}', String(data.stats.ownerCount)) }} ·
        {{ t.gearPage.wishCount.replace('{count}', String(data.stats.wishCount)) }}
      </p>
      <p v-if="!data.item.isVerified" class="text-sm text-amber-700">{{ t.gearPage.unverified }}</p>
      <p v-if="data.line" class="text-sm">
        {{ t.gearPage.partOf }}:
        <NuxtLink :to="`/gear/${data.line.slug}`" class="underline">{{ data.line.name }}</NuxtLink>
      </p>
    </header>

    <section v-if="data.variants.length > 0">
      <h2 class="mb-3 text-f-2xl font-semibold">{{ t.gearPage.variants }}</h2>
      <ul class="divide-y rounded border">
        <li v-for="variant in data.variants" :key="variant.id" class="px-3 py-2">
          <NuxtLink :to="`/gear/${variant.slug}`" class="underline">{{ variant.name }}</NuxtLink>
        </li>
      </ul>
    </section>

    <section>
      <h2 class="mb-3 text-f-2xl font-semibold">{{ t.gearPage.players }}</h2>
      <p v-if="!user" class="text-neutral-600">{{ t.gearPage.signInToSeePlayers }}</p>
      <p v-else-if="data.players.length === 0" class="text-neutral-600">{{ t.gearPage.noPlayers }}</p>
      <ul v-else class="divide-y rounded border">
        <li v-for="player in data.players" :key="player.userId" class="flex gap-2 px-3 py-2">
          <NuxtLink :to="`/profile/${player.userId}`" class="underline">{{ player.displayName }}</NuxtLink>
          <span v-if="player.year" class="text-sm text-neutral-500">{{ player.year }}</span>
          <span v-if="player.finish" class="text-sm text-neutral-500">{{ player.finish }}</span>
        </li>
      </ul>
    </section>
  </article>
</template>
