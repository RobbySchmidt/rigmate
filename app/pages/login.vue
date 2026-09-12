<script setup lang="ts">
const t = useText()
const supabase = useSupabaseClient()
const route = useRoute()

const email = ref('')
const password = ref('')
const error = ref('')
const pending = ref(false)

async function submit() {
  pending.value = true
  error.value = ''
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value,
  })
  pending.value = false
  if (signInError) {
    error.value = t.auth.errorInvalidCredentials
    return
  }
  await navigateTo(safeRedirect(route.query.redirect))
}
</script>

<template>
  <div class="mx-auto max-w-sm">
    <h1 class="mb-f-6 display text-f-3xl font-semibold">{{ t.auth.loginTitle }}</h1>
    <form class="flex flex-col gap-4 rounded-card bg-surface p-f-6" @submit.prevent="submit">
      <label class="flex flex-col gap-1">
        <span class="text-sm">{{ t.auth.email }}</span>
        <input v-model="email" type="email" required class="rounded-field bg-surface-2 px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-accent" />
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-sm">{{ t.auth.password }}</span>
        <input v-model="password" type="password" required class="rounded-field bg-surface-2 px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-accent" />
      </label>
      <p v-if="error" class="text-sm text-danger">{{ error }}</p>
      <button type="submit" :disabled="pending" class="rounded-btn bg-accent px-4 py-2 text-accent-ink outline-none focus-visible:ring-2 focus-visible:ring-accent">
        {{ t.auth.submitLogin }}
      </button>
    </form>
    <NuxtLink to="/register" class="mt-4 block rounded-btn text-sm underline outline-none focus-visible:ring-2 focus-visible:ring-accent">{{ t.auth.toRegister }}</NuxtLink>
  </div>
</template>
