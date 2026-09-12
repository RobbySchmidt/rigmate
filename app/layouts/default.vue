<script setup lang="ts">
const t = useText()
const user = useSupabaseUser()
const supabase = useSupabaseClient()
// useSupabaseUser() liefert die JWT-Claims, nicht ein User-Objekt - die Id
// steckt unter "sub", nicht unter "id". useUserId() normalisiert das. Ein
// Griff auf user.value.id waere hier undefined, und der Profil-Link zeigte
// stumm auf /profile/undefined.
const userId = useUserId()

async function logout() {
  await supabase.auth.signOut()
  await navigateTo('/login')
}
</script>

<template>
  <div class="min-h-screen bg-bg font-sans text-ink">
    <div class="mx-auto max-w-5xl px-f-6 pt-4">
      <header class="rounded-card bg-surface">
        <nav class="flex flex-wrap items-center gap-f-6 px-f-6 py-4">
          <NuxtLink to="/" class="display rounded-btn text-f-xl font-semibold outline-none focus-visible:ring-2 focus-visible:ring-accent">{{ t.app.name }}</NuxtLink>
          <NuxtLink to="/search" class="rounded-btn text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent">{{ t.nav.search }}</NuxtLink>
          <template v-if="user">
            <NuxtLink v-if="userId" :to="`/profile/${userId}`" class="rounded-btn text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent">{{ t.nav.profile }}</NuxtLink>
            <NuxtLink to="/rig" class="rounded-btn text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent">{{ t.nav.rig }}</NuxtLink>
            <NuxtLink to="/settings" class="rounded-btn text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent">{{ t.nav.settings }}</NuxtLink>
            <button type="button" class="ml-auto rounded-btn text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent" @click="logout">{{ t.nav.logout }}</button>
          </template>
          <template v-else>
            <NuxtLink to="/login" class="ml-auto rounded-btn text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent">{{ t.nav.login }}</NuxtLink>
          </template>
        </nav>
      </header>
    </div>
    <main class="mx-auto max-w-5xl px-f-6 py-f-8">
      <slot />
    </main>
  </div>
</template>
