<script setup lang="ts">
// Abschnitt 10: Profile nur mit Login (siehe RLS-Policy in
// supabase/migrations/20260906115314_profiles.sql). Kein Schaufenster wie
// bei gear/[slug].vue - anders als der Katalog ist eine Person hier kein
// oeffentliches Aushaengeschild.
definePageMeta({ middleware: 'auth' })

interface ProfileLink {
  label: string
  url: string
}

const t = useText()
const route = useRoute()
const supabase = useSupabaseClient()
// useSupabaseUser() liefert die JWT-Claims, nicht ein User-Objekt - die Id
// steckt unter "sub". useUserId() normalisiert das (siehe dortiger
// Kommentar). Ein direkter Vergleich gegen user.value.id waere hier immer
// falsch und wuerde den Bearbeiten-Link nie im eigenen Profil zeigen.
const userId = useUserId()

const id = computed(() => String(route.params.id))
const isOwn = computed(() => userId.value !== null && userId.value === id.value)

// Jeder Lesezugriff bekommt sein eigenes Fehler-Flag. Eine leere Liste
// (kein Equipment, keine Wunschliste) ist ein legitimer Zustand - ein
// fehlgeschlagener Request ist keiner, und beides sah in einer frueheren
// Fassung dieser Seite identisch aus (verworfenes `{ error }`).
const profileError = ref(false)
const rigError = ref(false)
const wishlistError = ref(false)
const preferencesError = ref(false)

const { data: profile } = await useAsyncData(`profile-${id.value}`, async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, real_name, bio, avatar_path, bands, links')
    .eq('id', id.value)
    .maybeSingle()
  if (error) profileError.value = true
  return data
})

const { data: rig } = await useAsyncData(`profile-rig-${id.value}`, async () => {
  const { data, error } = await supabase
    .from('gear_items')
    .select('id, year, finish, modifications, catalog_items ( slug, name, category_id, brands ( name ) )')
    .eq('owner_id', id.value)
    .order('created_at')
  if (error) {
    rigError.value = true
    return []
  }
  return data ?? []
})

const { data: wishlist } = await useAsyncData(`profile-wishlist-${id.value}`, async () => {
  const { data, error } = await supabase
    .from('wishlist_items')
    .select('id, note, catalog_items ( slug, name, brands ( name ) )')
    .eq('user_id', id.value)
  if (error) {
    wishlistError.value = true
    return []
  }
  return data ?? []
})

const { data: preferences } = await useAsyncData(`profile-preferences-${id.value}`, async () => {
  const { data, error } = await supabase
    .from('preferences')
    .select('id, catalog_items ( slug, name, brands ( name ) )')
    .eq('user_id', id.value)
  if (error) {
    preferencesError.value = true
    return []
  }
  return data ?? []
})

// jsonb kommt als plain array/object zurueck - hier einmal typisiert statt
// an jeder Stelle im Template neu zu casten.
const links = computed<ProfileLink[]>(() => ((profile.value?.links as ProfileLink[] | null) ?? []))

const avatarUrl = computed(() => {
  const path = profile.value?.avatar_path
  if (!path) return null
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
})

function label(row: any): string {
  return `${row.catalog_items.brands.name} ${row.catalog_items.name}`
}
</script>

<template>
  <div v-if="profile" class="flex flex-col gap-f-8">
    <header class="flex flex-col gap-2">
      <img
        v-if="avatarUrl"
        :src="avatarUrl"
        :alt="profile.display_name"
        class="h-24 w-24 rounded-full object-cover"
      />
      <h1 class="text-f-5xl font-semibold">{{ profile.display_name }}</h1>
      <p v-if="profile.real_name" class="text-neutral-600">{{ profile.real_name }}</p>
      <p v-if="profile.bio">{{ profile.bio }}</p>
      <p v-if="profile.bands.length > 0" class="text-sm text-neutral-600">
        {{ t.profile.bands }}: {{ profile.bands.join(', ') }}
      </p>
      <ul v-if="links.length > 0" class="flex flex-wrap gap-3 text-sm">
        <li v-for="link in links" :key="link.url">
          <a :href="link.url" target="_blank" rel="noopener noreferrer" class="underline">{{ link.label }}</a>
        </li>
      </ul>
      <div v-if="isOwn" class="flex items-center gap-2 text-sm">
        <span>{{ t.profile.ownProfile }}</span>
        <NuxtLink to="/settings" class="underline">{{ t.profile.editCta }}</NuxtLink>
      </div>
    </header>

    <section>
      <h2 class="mb-3 text-f-2xl font-semibold">{{ t.profile.rig }}</h2>
      <p v-if="rigError" class="text-sm text-red-600">{{ t.profile.loadError }}</p>
      <p v-else-if="(rig ?? []).length === 0" class="text-neutral-600">{{ t.profile.emptyRig }}</p>
      <ul v-else class="divide-y rounded border">
        <li v-for="row in rig" :key="row.id" class="flex flex-wrap items-baseline gap-2 px-3 py-2">
          <NuxtLink :to="`/gear/${row.catalog_items.slug}`" class="underline">{{ label(row) }}</NuxtLink>
          <span v-if="row.year" class="text-sm text-neutral-500">{{ row.year }}</span>
          <span v-if="row.finish" class="text-sm text-neutral-500">{{ row.finish }}</span>
          <span v-if="row.modifications" class="text-sm text-neutral-500">{{ row.modifications }}</span>
        </li>
      </ul>
    </section>

    <section v-if="preferencesError || (preferences ?? []).length > 0">
      <h2 class="mb-3 text-f-2xl font-semibold">{{ t.profile.preferences }}</h2>
      <p v-if="preferencesError" class="text-sm text-red-600">{{ t.profile.loadError }}</p>
      <ul v-else class="divide-y rounded border">
        <li v-for="row in preferences" :key="row.id" class="px-3 py-2">
          <NuxtLink :to="`/gear/${row.catalog_items.slug}`" class="underline">{{ label(row) }}</NuxtLink>
        </li>
      </ul>
    </section>

    <section v-if="wishlistError || (wishlist ?? []).length > 0">
      <h2 class="mb-3 text-f-2xl font-semibold">{{ t.profile.wishlist }}</h2>
      <p v-if="wishlistError" class="text-sm text-red-600">{{ t.profile.loadError }}</p>
      <ul v-else class="divide-y rounded border">
        <li v-for="row in wishlist" :key="row.id" class="flex gap-2 px-3 py-2">
          <NuxtLink :to="`/gear/${row.catalog_items.slug}`" class="underline">{{ label(row) }}</NuxtLink>
          <span v-if="row.note" class="text-sm text-neutral-500">{{ row.note }}</span>
        </li>
      </ul>
    </section>
  </div>
  <p v-else-if="profileError" class="text-red-600">{{ t.profile.loadError }}</p>
  <p v-else class="text-neutral-600">{{ t.profile.notFound }}</p>
</template>
