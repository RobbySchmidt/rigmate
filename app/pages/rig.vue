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
    .select('id, catalog_items ( id, name, category_id, brands ( name ) )')
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

// Gruppiert Exemplare und Praeferenzen gemeinsam nach Kategorie. Die
// Reihenfolge kommt aus sort_order in der Datenbank, nicht aus einer
// Reihenfolge im Frontend - sonst gaebe es zwei Wahrheiten.
const groupedRig = computed(() => {
  const labels = t.categories as Record<string, string>
  const zeilen = [
    ...(gear.value ?? []).map((row: any) => ({
      key: `gear-${row.id}`,
      table: 'gear_items' as const,
      id: row.id,
      label: label(row),
      detail: [row.year, row.finish].filter(Boolean).join(' · '),
      categoryId: row.catalog_items.category_id,
    })),
    ...(preferences.value ?? []).map((row: any) => ({
      key: `pref-${row.id}`,
      table: 'preferences' as const,
      id: row.id,
      label: label(row),
      detail: '',
      categoryId: row.catalog_items.category_id,
    })),
  ]

  return (categories.value ?? [])
    .slice()
    .sort((a: any, b: any) => a.sort_order - b.sort_order)
    .map((category: any) => ({
      categoryId: category.id,
      label: labels[category.id] ?? category.id,
      rows: zeilen.filter((zeile) => zeile.categoryId === category.id),
    }))
    .filter((group: any) => group.rows.length > 0)
})

const rigIstLeer = computed(() => groupedRig.value.length === 0)

async function addPreference(result: any) {
  preferencesError.value = ''
  const { error } = await supabase.from('preferences').insert({ user_id: userId.value!, catalog_item_id: result.id })
  if (error) {
    // Nicht der Picker entscheidet hier ueber Verbrauchsmaterial - er sucht
    // ueber alle Kategorien. Die Weiche steht in addToRig(): die entscheidet
    // anhand der Kategorie des Treffers, ob addPreference() ueberhaupt
    // aufgerufen wird. Die Datenbank bleibt trotzdem die letzte Instanz -
    // ein generischer Fehlschlag statt stiller Nichtigkeit.
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
    // Seit Task 5 entscheidet die Kategorie schon in addToRig() zwischen
    // Exemplar und Praeferenz - dieser Pfad wird im Regelfall gar nicht mehr
    // erreicht, nur noch bei einem Kategorien-Ladefehler oder inkonsistenten
    // Daten. Der Trigger enforce_gear_item_rules() bleibt trotzdem die
    // letzte Instanz, und genau dieser Fall bekommt weiterhin eine eigene,
    // ehrliche Erklaerung statt eines generischen Fehlschlags.
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
      <p v-if="gearLoadError || preferencesLoadError || categoriesLoadError" class="text-sm text-danger">{{ t.rig.loadError }}</p>
      <p v-else-if="rigIstLeer" class="text-muted">{{ t.rig.empty }}</p>
      <div v-else class="flex flex-col gap-6">
        <!-- data-group traegt die Kategorie, nicht bloss eine Testmarke -
             dasselbe Muster wie data-count und data-pip im Projekt. -->
        <div v-for="group in groupedRig" :key="group.categoryId" :data-group="group.categoryId" class="flex flex-col gap-2">
          <h3 class="text-f-sm font-semibold uppercase tracking-wide text-muted">
            {{ group.label }}
          </h3>
          <ul class="flex flex-col gap-2">
            <li v-for="row in group.rows" :key="row.key" class="flex items-center gap-2 rounded-card bg-surface px-4 py-3">
              <span>{{ row.label }}</span>
              <span v-if="row.detail" class="text-sm text-muted">{{ row.detail }}</span>
              <button type="button" class="ml-auto rounded-btn text-sm underline outline-none focus-visible:ring-2 focus-visible:ring-accent" @click="removeRow(row.table, row.id)">
                {{ t.rig.remove }}
              </button>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <section class="flex flex-col gap-4">
      <h2 class="text-f-2xl font-semibold">{{ t.rig.wishlist }}</h2>
      <CatalogPicker :create-handler="createCatalogItem" @select="addWish" />
      <p v-if="wishlistError" class="text-sm text-danger">{{ wishlistError }}</p>
      <p v-if="wishlistLoadError" class="text-sm text-danger">{{ t.rig.loadError }}</p>
      <p v-else-if="(wishlist ?? []).length === 0" class="text-muted">{{ t.rig.emptyWishlist }}</p>
      <ul v-else class="flex flex-col gap-2">
        <li v-for="row in wishlist" :key="row.id" class="flex items-center rounded-card bg-surface px-4 py-3">
          <span>{{ label(row) }}</span>
          <button type="button" class="ml-auto rounded-btn text-sm underline outline-none focus-visible:ring-2 focus-visible:ring-accent" @click="removeRow('wishlist_items', row.id)">
            {{ t.rig.remove }}
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>
