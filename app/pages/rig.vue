<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const t = useText()
const supabase = useSupabaseClient()
const user = useSupabaseUser()

const pendingItem = ref<any | null>(null)

const { data: gear, refresh: refreshGear } = await useAsyncData('rig-gear', async () => {
  const { data } = await supabase
    .from('gear_items')
    .select('id, year, finish, installed_in_id, catalog_items ( id, name, category_id, brands ( name ) )')
    .eq('owner_id', user.value!.id)
    .order('created_at')
  return data ?? []
})

const { data: preferences, refresh: refreshPreferences } = await useAsyncData('rig-preferences', async () => {
  const { data } = await supabase
    .from('preferences')
    .select('id, catalog_items ( id, name, brands ( name ) )')
    .eq('user_id', user.value!.id)
  return data ?? []
})

const { data: wishlist, refresh: refreshWishlist } = await useAsyncData('rig-wishlist', async () => {
  const { data } = await supabase
    .from('wishlist_items')
    .select('id, note, catalog_items ( id, name, brands ( name ) )')
    .eq('user_id', user.value!.id)
  return data ?? []
})

function label(row: any): string {
  return `${row.catalog_items.brands.name} ${row.catalog_items.name}`
}

const ownedGear = computed(() =>
  (gear.value ?? [])
    .filter((row: any) => row.installed_in_id === null)
    .map((row: any) => ({ id: row.id, label: label(row) })),
)

async function addPreference(result: any) {
  await supabase.from('preferences').insert({ user_id: user.value!.id, catalog_item_id: result.id })
  await refreshPreferences()
}

async function addWish(result: any) {
  await supabase.from('wishlist_items').insert({ user_id: user.value!.id, catalog_item_id: result.id })
  await refreshWishlist()
}

async function saveGear(details: any) {
  await supabase.from('gear_items').insert({
    owner_id: user.value!.id,
    catalog_item_id: pendingItem.value.id,
    year: details.year,
    finish: details.finish,
    modifications: details.modifications,
    notes: details.notes,
    installed_in_id: details.installedInId,
  })
  pendingItem.value = null
  await refreshGear()
}

async function createCatalogItem(input: { brand: string; name: string; categoryId: string }) {
  const created = await $fetch<{ id: string }>('/api/catalog/items', { method: 'POST', body: input })
  const body = await $fetch<{ results: any[] }>(
    `/api/catalog/search?q=${encodeURIComponent(`${input.brand} ${input.name}`)}`,
  )
  pendingItem.value = body.results.find((r) => r.id === created.id) ?? null
}

async function removeRow(table: 'gear_items' | 'preferences' | 'wishlist_items', id: string) {
  await supabase.from(table).delete().eq('id', id)
  if (table === 'gear_items') await refreshGear()
  if (table === 'preferences') await refreshPreferences()
  if (table === 'wishlist_items') await refreshWishlist()
}
</script>

<template>
  <div class="flex flex-col gap-f-12">
    <h1 class="text-f-4xl font-semibold">{{ t.rig.title }}</h1>

    <section class="flex flex-col gap-4">
      <h2 class="text-f-2xl font-semibold">{{ t.rig.gear }}</h2>
      <CatalogPicker v-if="!pendingItem" @select="pendingItem = $event" @create="createCatalogItem" />
      <GearItemForm
        v-else
        :catalog-item-label="`${pendingItem.brandName} ${pendingItem.name}`"
        :owned-gear="ownedGear"
        :show-precision-hint="pendingItem.needsPrecisionHint"
        @save="saveGear"
        @cancel="pendingItem = null"
      />
      <p v-if="(gear ?? []).length === 0" class="text-neutral-500">{{ t.rig.empty }}</p>
      <ul v-else class="divide-y rounded border">
        <li v-for="row in gear" :key="row.id" class="flex items-center gap-2 px-3 py-2">
          <span>{{ label(row) }}</span>
          <span v-if="row.year" class="text-sm text-neutral-500">{{ row.year }}</span>
          <span v-if="row.finish" class="text-sm text-neutral-500">{{ row.finish }}</span>
          <button type="button" class="ml-auto text-sm underline" @click="removeRow('gear_items', row.id)">
            {{ t.rig.remove }}
          </button>
        </li>
      </ul>
    </section>

    <section class="flex flex-col gap-4">
      <h2 class="text-f-2xl font-semibold">{{ t.rig.preferences }}</h2>
      <CatalogPicker category-id="strings" @select="addPreference" />
      <CatalogPicker category-id="pick" @select="addPreference" />
      <ul class="divide-y rounded border">
        <li v-for="row in preferences" :key="row.id" class="flex items-center px-3 py-2">
          <span>{{ label(row) }}</span>
          <button type="button" class="ml-auto text-sm underline" @click="removeRow('preferences', row.id)">
            {{ t.rig.remove }}
          </button>
        </li>
      </ul>
    </section>

    <section class="flex flex-col gap-4">
      <h2 class="text-f-2xl font-semibold">{{ t.rig.wishlist }}</h2>
      <CatalogPicker @select="addWish" />
      <ul class="divide-y rounded border">
        <li v-for="row in wishlist" :key="row.id" class="flex items-center px-3 py-2">
          <span>{{ label(row) }}</span>
          <button type="button" class="ml-auto text-sm underline" @click="removeRow('wishlist_items', row.id)">
            {{ t.rig.remove }}
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>
