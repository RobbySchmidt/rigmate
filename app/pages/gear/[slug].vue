<script setup lang="ts">
import { rarityNameClass } from '#shared/utils/rarityStyle'

// Kein middleware: 'auth' hier - das ist der Punkt dieser Seite. Der
// Katalog ist das Schaufenster (Abschnitt 10): oeffentlich lesbar und
// auffindbar, ohne Login. Nur die Spielernamen weiter unten haengen am
// Login-Status, nicht die Seite selbst.
const t = useText()
const route = useRoute()
const user = useSupabaseUser()

const { data, error } = await useFetch<any>(`/api/gear/${route.params.slug}`)

// Fix-Runde (Abschluss), das schwerste der fuenf verschluckten { error }:
// das Template war "<article v-if=\"data\">" ohne v-else - ein fehlgeschlagener
// Fetch ODER ein echtes 404 rendern beide dieselbe komplett leere Seite,
// ausgeliefert mit HTTP 200 und dem Titel "undefined undefined - Rigmate".
// Genau diese Seite ist laut Abschnitt 10 die einzige oeffentliche,
// suchmaschinen-auffindbare - ein Crawler saehe einen leeren 200er. Die
// Route wirft bei einem echten 404 den Statuscode 404, bei jedem anderen
// Lesefehler 502 (server/api/gear/[slug].get.ts) - useFetch reicht das in
// error.value.statusCode unveraendert durch, die Seite uebernimmt ihn 1:1
// statt neu zu raten, und gibt ihn auch an die eigene Antwort weiter.
const notFound = computed(() => error.value?.statusCode === 404)

if (error.value) {
  setResponseStatus(error.value.statusCode ?? 500)
}

useSeoMeta({
  title: () => {
    if (notFound.value) return `${t.gearPage.notFoundTitle} - ${t.app.name}`
    if (error.value) return `${t.gearPage.loadErrorTitle} - ${t.app.name}`
    return `${data.value?.item.brandName} ${data.value?.item.name} - ${t.app.name}`
  },
  description: () =>
    data.value
      ? `${data.value.item.brandName} ${data.value.item.name}: ${t.gearPage.playersCount.replace('{count}', String(data.value.stats.ownerCount ?? 0))}`
      : undefined,
})

const categoryLabel = computed(
  () => t.categories[data.value?.item.categoryId as keyof typeof t.categories] ?? '',
)

// Diese Seite ist neben dem Profil-Panel der einzige Ort, an dem Bernstein
// auftauchen darf - sie ist das oeffentliche Schaufenster des Katalogs
// (Abschnitt 10), und die Seltenheit ist genau das, was ein Besucher hier
// sehen soll. Die Zuordnung kommt aus rarityStyle statt zum siebten Mal
// abgeschrieben zu werden; sie faerbt bewusst nur rare und special.
const rarityClass = computed(() => rarityNameClass(data.value?.item.rarityBase ?? null))
</script>

<template>
  <article v-if="data" class="flex flex-col gap-f-8">
    <header class="flex flex-col gap-2">
      <p class="text-sm text-muted">{{ categoryLabel }}</p>
      <h1 class="text-f-5xl font-semibold">{{ data.item.brandName }} {{ data.item.name }}</h1>
      <p class="text-sm text-muted">
        <span data-rarity :class="rarityClass">{{ t.rarity[data.item.rarityBase as keyof typeof t.rarity] }}</span> ·
        {{ t.gearPage.playersCount.replace('{count}', String(data.stats.ownerCount)) }} ·
        {{ t.gearPage.wishCount.replace('{count}', String(data.stats.wishCount)) }}
      </p>
      <p v-if="!data.item.isVerified" class="text-sm text-muted">{{ t.gearPage.unverified }}</p>
      <p v-if="data.line" class="text-sm">
        {{ t.gearPage.partOf }}:
        <NuxtLink :to="`/gear/${data.line.slug}`" class="text-accent underline">{{ data.line.name }}</NuxtLink>
      </p>
    </header>

    <section v-if="data.variants.length > 0">
      <h2 class="mb-3 text-f-2xl font-semibold">{{ t.gearPage.variants }}</h2>
      <ul class="divide-y divide-line-soft rounded border border-line">
        <li v-for="variant in data.variants" :key="variant.id" class="px-3 py-2">
          <NuxtLink :to="`/gear/${variant.slug}`" class="text-accent underline">{{ variant.name }}</NuxtLink>
        </li>
      </ul>
    </section>

    <section>
      <h2 class="mb-3 text-f-2xl font-semibold">{{ t.gearPage.players }}</h2>
      <p v-if="!user" class="text-muted">{{ t.gearPage.signInToSeePlayers }}</p>
      <p v-else-if="data.players.length === 0" class="text-muted">{{ t.gearPage.noPlayers }}</p>
      <ul v-else class="divide-y divide-line-soft rounded border border-line">
        <li v-for="player in data.players" :key="player.userId" class="flex gap-2 px-3 py-2">
          <NuxtLink :to="`/profile/${player.userId}`" class="text-accent underline">{{ player.displayName }}</NuxtLink>
          <span v-if="player.year" class="text-sm text-muted">{{ player.year }}</span>
          <span v-if="player.finish" class="text-sm text-muted">{{ player.finish }}</span>
        </li>
      </ul>
    </section>
  </article>
  <p v-else-if="notFound" class="text-muted">{{ t.gearPage.notFound }}</p>
  <p v-else class="text-danger">{{ t.gearPage.loadError }}</p>
</template>
