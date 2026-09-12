<script setup lang="ts">
const t = useText()
const supabase = useSupabaseClient()

const email = ref('')
const password = ref('')
const displayName = ref('')
const error = ref('')
const sent = ref(false)
const pending = ref(false)

async function submit() {
  pending.value = true
  error.value = ''
  const { error: signUpError } = await supabase.auth.signUp({
    email: email.value,
    password: password.value,
    options: {
      data: { display_name: displayName.value },
      emailRedirectTo: `${window.location.origin}/confirm`,
    },
  })
  pending.value = false
  if (signUpError) {
    // With email confirmation mandatory project-wide, Supabase deliberately
    // returns an obfuscated success (no error) for a re-registration of an
    // existing confirmed address - on purpose, so the signup form cannot be
    // used to discover which addresses already have accounts. So any error
    // reaching here is a genuine failure, never "address already in use".
    error.value = t.auth.errorGeneric
    return
  }
  sent.value = true
}
</script>

<template>
  <div class="mx-auto max-w-sm">
    <h1 class="mb-f-6 text-f-3xl font-semibold">{{ t.auth.registerTitle }}</h1>
    <template v-if="sent">
      <p class="text-f-lg">{{ t.auth.confirmSent }}</p>
      <NuxtLink to="/login" class="mt-4 block rounded-btn text-sm underline outline-none focus-visible:ring-2 focus-visible:ring-accent">{{ t.auth.confirmSentLoginHint }}</NuxtLink>
    </template>
    <template v-else>
      <form class="flex flex-col gap-4 rounded-card bg-surface p-f-6" @submit.prevent="submit">
        <label class="flex flex-col gap-1">
          <span class="text-sm">{{ t.auth.displayName }}</span>
          <input v-model="displayName" type="text" required minlength="2" maxlength="40" class="rounded-field bg-surface-2 px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-accent" />
          <span class="text-xs text-muted">{{ t.auth.displayNameHint }}</span>
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-sm">{{ t.auth.email }}</span>
          <input v-model="email" type="email" required class="rounded-field bg-surface-2 px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-accent" />
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-sm">{{ t.auth.password }}</span>
          <input v-model="password" type="password" required minlength="8" class="rounded-field bg-surface-2 px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-accent" />
        </label>
        <p v-if="error" class="text-sm text-danger">{{ error }}</p>
        <button type="submit" :disabled="pending" class="rounded-btn bg-accent px-4 py-2 text-accent-ink outline-none focus-visible:ring-2 focus-visible:ring-accent">
          {{ t.auth.submitRegister }}
        </button>
      </form>
      <NuxtLink to="/login" class="mt-4 block rounded-btn text-sm underline outline-none focus-visible:ring-2 focus-visible:ring-accent">{{ t.auth.toLogin }}</NuxtLink>
    </template>
  </div>
</template>
