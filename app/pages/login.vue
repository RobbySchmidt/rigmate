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
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
  await navigateTo(redirect)
}
</script>

<template>
  <div class="mx-auto max-w-sm">
    <h1 class="mb-f-6 text-f-3xl font-semibold">{{ t.auth.loginTitle }}</h1>
    <form class="flex flex-col gap-4" @submit.prevent="submit">
      <label class="flex flex-col gap-1">
        <span class="text-sm">{{ t.auth.email }}</span>
        <input v-model="email" type="email" required class="rounded border px-3 py-2" />
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-sm">{{ t.auth.password }}</span>
        <input v-model="password" type="password" required class="rounded border px-3 py-2" />
      </label>
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <button type="submit" :disabled="pending" class="rounded bg-neutral-900 px-4 py-2 text-white">
        {{ t.auth.submitLogin }}
      </button>
    </form>
    <NuxtLink to="/register" class="mt-4 block text-sm underline">{{ t.auth.toRegister }}</NuxtLink>
  </div>
</template>
