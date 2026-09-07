<script setup lang="ts">
const t = useText()
const user = useSupabaseUser()
const supabase = useSupabaseClient()

async function logout() {
  await supabase.auth.signOut()
  await navigateTo('/login')
}
</script>

<template>
  <div class="min-h-screen bg-bg font-sans text-ink">
    <header class="border-b border-line bg-surface">
      <nav class="mx-auto flex max-w-5xl items-center gap-f-6 px-f-6 py-4">
        <NuxtLink to="/" class="text-f-xl font-display font-semibold">{{ t.app.name }}</NuxtLink>
        <NuxtLink to="/search" class="text-sm">{{ t.nav.search }}</NuxtLink>
        <template v-if="user">
          <NuxtLink to="/rig" class="text-sm">{{ t.nav.rig }}</NuxtLink>
          <NuxtLink to="/settings" class="text-sm">{{ t.nav.settings }}</NuxtLink>
          <button type="button" class="ml-auto text-sm" @click="logout">{{ t.nav.logout }}</button>
        </template>
        <template v-else>
          <NuxtLink to="/login" class="ml-auto text-sm">{{ t.nav.login }}</NuxtLink>
        </template>
      </nav>
    </header>
    <main class="mx-auto max-w-5xl px-f-6 py-f-8">
      <slot />
    </main>
  </div>
</template>
