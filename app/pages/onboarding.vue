<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const t = useText()
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const added = ref<string[]>([])
const addError = ref('')

async function add(result: any) {
  addError.value = ''
  const { error } = await supabase
    .from('gear_items')
    .insert({ owner_id: user.value!.id, catalog_item_id: result.id })
  if (error) {
    // Wie auf /rig filtert der Picker hier keine Kategorie heraus - deshalb
    // kann Verbrauchsmaterial ankommen, das der Trigger
    // enforce_gear_item_rules() ablehnt. Das verdient eine eigene, ehrliche
    // Erklaerung statt eines stillen Nichts oder eines generischen Fehlers.
    addError.value =
      classifyGearWriteError(error) === 'consumable' ? t.onboarding.errorConsumableAsGear : t.onboarding.errorGeneric
    return
  }
  added.value.push(`${result.brandName} ${result.name}`)
}

// Deckt sich bewusst mit rig.vue: der Picker meldet einen neu angelegten
// Katalogeintrag ueber dasselbe "select"-Event wie einen gefundenen - das
// Eintragen ins eigene Rig passiert also in add() oben, einmalig fuer
// beide Wege. Ein zweiter, eigener Insert hier wuerde denselben Eintrag
// doppelt schreiben und die Fehlerbehandlung ein zweites Mal erfinden.
async function createCatalogItem(input: { brand: string; name: string; categoryId: string }) {
  try {
    const created = await $fetch<{ id: string }>('/api/catalog/items', { method: 'POST', body: input })
    const body = await $fetch<{ results: any[] }>(
      `/api/catalog/search?q=${encodeURIComponent(`${input.brand} ${input.name}`)}`,
    )
    const item = body.results.find((r) => r.id === created.id)
    if (!item) {
      // Sollte nicht vorkommen, aber ein Treffer, der sich selbst nicht
      // wiederfindet, ist kein Erfolg, den man dem Formular vorspielen darf.
      return { success: false as const, message: t.picker.createGenericError }
    }
    return { success: true as const, item }
  } catch (error) {
    const kind = classifyCatalogCreateError(error)
    return {
      success: false as const,
      message: kind === 'duplicate' ? t.picker.createDuplicateError : t.picker.createGenericError,
    }
  }
}

const countLabel = computed(() =>
  added.value.length === 1
    ? t.onboarding.addedOne
    : t.onboarding.addedMany.replace('{count}', String(added.value.length)),
)
</script>

<template>
  <div class="mx-auto flex max-w-lg flex-col gap-f-8">
    <div>
      <h1 class="mb-3 text-f-4xl font-semibold">{{ t.onboarding.title }}</h1>
      <p class="text-neutral-600">{{ t.onboarding.intro }}</p>
    </div>

    <CatalogPicker :create-handler="createCatalogItem" @select="add" />
    <p v-if="addError" class="text-sm text-red-600">{{ addError }}</p>

    <div v-if="added.length > 0" class="flex flex-col gap-2">
      <p class="text-sm text-neutral-600">{{ countLabel }}</p>
      <ul class="divide-y rounded border">
        <li v-for="(item, index) in added" :key="index" class="px-3 py-2">{{ item }}</li>
      </ul>
      <p class="text-sm text-neutral-500">{{ t.onboarding.keepGoing }}</p>
    </div>

    <div class="flex gap-3">
      <NuxtLink v-if="added.length > 0" to="/" class="rounded bg-neutral-900 px-4 py-2 text-white">
        {{ t.onboarding.done }}
      </NuxtLink>
      <NuxtLink to="/" class="rounded border px-4 py-2">{{ t.onboarding.skip }}</NuxtLink>
    </div>
  </div>
</template>
