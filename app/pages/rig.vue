<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const t = useText()
const supabase = useSupabaseClient()
const userId = useUserId()

const pendingItem = ref<any | null>(null)
const gearError = ref('')
const preferencesError = ref('')
const wishlistError = ref('')

// Fix-Runde (Abschluss): dieselbe Datei hatte ihre SCHREIB-Pfade schon aus
// einer frueheren Runde gehaertet (siehe gearError/preferencesError/
// wishlistError oben), aber die drei Lese-Zugriffe darunter wurden nie
// nachgezogen - derselbe Fehler im selben File. Ein verschlucktes { error }
// liess einen fehlgeschlagenen Read wie "du hast noch nichts eingetragen"
// aussehen und damit wie einen Datenverlust. Eigene Flags, Muster wie in
// app/pages/profile/[id].vue: Fehler und "leer" sind zwei verschiedene
// Zustaende.
const gearLoadError = ref(false)
const preferencesLoadError = ref(false)
const wishlistLoadError = ref(false)

const { data: gear, refresh: refreshGear } = await useAsyncData('rig-gear', async () => {
  const { data, error } = await supabase
    .from('gear_items')
    .select('id, year, finish, installed_in_id, catalog_items ( id, name, category_id, brands ( name ) )')
    .eq('owner_id', userId.value!)
    .order('created_at')
  if (error) {
    gearLoadError.value = true
    return []
  }
  return data ?? []
})

const { data: preferences, refresh: refreshPreferences } = await useAsyncData('rig-preferences', async () => {
  const { data, error } = await supabase
    .from('preferences')
    .select('id, catalog_items ( id, name, brands ( name ) )')
    .eq('user_id', userId.value!)
  if (error) {
    preferencesLoadError.value = true
    return []
  }
  return data ?? []
})

const { data: wishlist, refresh: refreshWishlist } = await useAsyncData('rig-wishlist', async () => {
  const { data, error } = await supabase
    .from('wishlist_items')
    .select('id, note, catalog_items ( id, name, brands ( name ) )')
    .eq('user_id', userId.value!)
  if (error) {
    wishlistLoadError.value = true
    return []
  }
  return data ?? []
})

const categoriesLoadError = ref(false)

// Welche Kategorie Verbrauchsmaterial ist, weiss die Datenbank. Eine Kopie
// im Frontend waere eine zweite Wahrheit, die auseinanderlaeuft.
const { data: categories } = await useAsyncData('rig-categories', async () => {
  const { data, error } = await supabase.from('categories').select('id, is_consumable, sort_order')
  if (error) {
    categoriesLoadError.value = true
    return []
  }
  return data ?? []
})

const consumableIds = computed(
  () => new Set((categories.value ?? []).filter((row: any) => row.is_consumable).map((row: any) => row.id)),
)

function label(row: any): string {
  return `${row.catalog_items.brands.name} ${row.catalog_items.name}`
}

const ownedGear = computed(() =>
  (gear.value ?? [])
    .filter((row: any) => row.installed_in_id === null)
    .map((row: any) => ({ id: row.id, label: label(row) })),
)

async function addPreference(result: any) {
  preferencesError.value = ''
  const { error } = await supabase.from('preferences').insert({ user_id: userId.value!, catalog_item_id: result.id })
  if (error) {
    // Der Picker filtert hier zwar schon auf Saiten/Plektren, aber die
    // Datenbank bleibt die letzte Instanz - ein generischer Fehlschlag statt
    // stiller Nichtigkeit.
    preferencesError.value = t.rig.errorGeneric
    return
  }
  await refreshPreferences()
}

// Autovervollstaendigung statt Rueckfrage (Abschnitt 5 der Hauptspec): was
// aus einem Treffer wird, entscheidet seine Kategorie, nicht der Nutzer.
async function addToRig(result: any) {
  if (consumableIds.value.has(result.categoryId)) {
    await addPreference(result)
    return
  }
  pendingItem.value = result
}

async function addWish(result: any) {
  wishlistError.value = ''
  const { error } = await supabase.from('wishlist_items').insert({ user_id: userId.value!, catalog_item_id: result.id })
  if (error) {
    wishlistError.value = t.rig.errorGeneric
    return
  }
  await refreshWishlist()
}

async function saveGear(details: any) {
  gearError.value = ''
  const { error } = await supabase.from('gear_items').insert({
    owner_id: userId.value!,
    catalog_item_id: pendingItem.value.id,
    year: details.year,
    finish: details.finish,
    modifications: details.modifications,
    notes: details.notes,
    installed_in_id: details.installedInId,
  })
  if (error) {
    // Der Gear-Picker filtert bewusst keine Kategorie heraus (Abschnitt 6),
    // deshalb kann hier echtes Verbrauchsmaterial ankommen. Der Trigger
    // enforce_gear_item_rules() lehnt das ab - und genau dieser Fall bekommt
    // eine eigene, ehrliche Erklaerung statt eines generischen Fehlschlags.
    gearError.value =
      classifyGearWriteError(error) === 'consumable' ? t.rig.errorConsumableAsGear : t.rig.errorGeneric
    return
  }
  pendingItem.value = null
  await refreshGear()
}

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

async function removeRow(table: 'gear_items' | 'preferences' | 'wishlist_items', id: string) {
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) {
    if (table === 'gear_items') gearError.value = t.rig.errorGeneric
    if (table === 'preferences') preferencesError.value = t.rig.errorGeneric
    if (table === 'wishlist_items') wishlistError.value = t.rig.errorGeneric
    return
  }
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
      <CatalogPicker v-if="!pendingItem" :create-handler="createCatalogItem" @select="addToRig" />
      <GearItemForm
        v-else
        :catalog-item-label="`${pendingItem.brandName} ${pendingItem.name}`"
        :owned-gear="ownedGear"
        :show-precision-hint="pendingItem.needsPrecisionHint"
        @save="saveGear"
        @cancel="pendingItem = null"
      />
      <p v-if="gearError" class="text-sm text-danger">{{ gearError }}</p>
      <p v-if="preferencesError" class="text-sm text-danger">{{ preferencesError }}</p>
      <p v-if="categoriesLoadError" class="text-sm text-danger">{{ t.rig.loadError }}</p>
      <!-- Liste bleibt hier unveraendert, Task 6 ersetzt sie -->
      <p v-if="gearLoadError" class="text-sm text-danger">{{ t.rig.loadError }}</p>
      <p v-else-if="(gear ?? []).length === 0" class="text-muted">{{ t.rig.empty }}</p>
      <ul v-else class="divide-y divide-line-soft rounded border border-line">
        <li v-for="row in gear" :key="row.id" class="flex items-center gap-2 px-3 py-2">
          <span>{{ label(row) }}</span>
          <span v-if="row.year" class="text-sm text-muted">{{ row.year }}</span>
          <span v-if="row.finish" class="text-sm text-muted">{{ row.finish }}</span>
          <button type="button" class="ml-auto text-sm underline" @click="removeRow('gear_items', row.id)">
            {{ t.rig.remove }}
          </button>
        </li>
      </ul>
    </section>

    <section class="flex flex-col gap-4">
      <h2 class="text-f-2xl font-semibold">{{ t.rig.preferences }}</h2>
      <p v-if="preferencesError" class="text-sm text-danger">{{ preferencesError }}</p>
      <p v-if="preferencesLoadError" class="text-sm text-danger">{{ t.rig.loadError }}</p>
      <p v-else-if="(preferences ?? []).length === 0" class="text-muted">{{ t.rig.emptyPreferences }}</p>
      <ul v-else class="divide-y divide-line-soft rounded border border-line">
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
      <CatalogPicker :create-handler="createCatalogItem" @select="addWish" />
      <p v-if="wishlistError" class="text-sm text-danger">{{ wishlistError }}</p>
      <p v-if="wishlistLoadError" class="text-sm text-danger">{{ t.rig.loadError }}</p>
      <p v-else-if="(wishlist ?? []).length === 0" class="text-muted">{{ t.rig.emptyWishlist }}</p>
      <ul v-else class="divide-y divide-line-soft rounded border border-line">
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
