<script setup lang="ts">
import { nameContainsYear } from '#shared/utils/modelYearRule'

interface CatalogSearchResult {
  id: string
  name: string
  slug: string
  brandName: string
  categoryId: string
  level: 'line' | 'variant'
  lineId: string
  lineName: string
  rarityBase: string
  isVerified: boolean
  needsPrecisionHint: boolean
}

type CreateOutcome =
  | { success: true; item: CatalogSearchResult }
  | { success: false; message: string }

const props = defineProps<{
  categoryId?: string
  placeholder?: string
  // Fuehrt POST /api/catalog/items aus und liefert Erfolg oder Fehler
  // zurueck, statt dass die Elternkomponente per Fire-and-forget-Event raet,
  // ob es geklappt hat. Liegt bei der Elternkomponente (rig.vue), weil nur
  // sie weiss, wie sie aus der ID wieder ein CatalogSearchResult macht.
  createHandler: (input: { brand: string; name: string; categoryId: string }) => Promise<CreateOutcome>
}>()
const emit = defineEmits<{
  select: [CatalogSearchResult]
}>()

const t = useText()
const term = ref('')
const results = ref<CatalogSearchResult[]>([])
const searchError = ref(false)
const showCreate = ref(false)
const newBrand = ref('')
const newName = ref('')
const newCategory = ref(props.categoryId ?? 'guitar')
const createError = ref('')
const creating = ref(false)

let debounce: ReturnType<typeof setTimeout> | undefined
// clearTimeout() stoppt nur einen Timer, der noch nicht gefeuert hat - eine
// bereits laufende Anfrage laesst sich damit nicht abbrechen. Die Wache
// sorgt dafuer, dass nur die zuletzt ausgeloeste Anfrage ihr Ergebnis noch
// anwenden darf; alles Aeltere wird stillschweigend verworfen.
const guard = createRequestGuard()

// Die Aufloesung passiert waehrend des Tippens, nicht als Rueckfrage danach.
watch(term, (value) => {
  clearTimeout(debounce)
  const ticket = guard.next()
  searchError.value = false
  if (value.trim() === '') {
    results.value = []
    return
  }
  debounce = setTimeout(async () => {
    const query = new URLSearchParams({ q: value })
    if (props.categoryId) query.set('category', props.categoryId)
    try {
      const body = await $fetch<{ results: CatalogSearchResult[] }>(`/api/catalog/search?${query}`)
      // Inzwischen kam ein neuerer Tastendruck oder das Feld wurde geleert -
      // diese Antwort ist Vergangenheit und darf nichts mehr ueberschreiben.
      if (!guard.isCurrent(ticket)) return
      results.value = body.results
    } catch {
      if (!guard.isCurrent(ticket)) return
      results.value = []
      searchError.value = true
    }
  }, 120)
})

function choose(result: CatalogSearchResult) {
  emit('select', result)
  term.value = ''
  results.value = []
  showCreate.value = false
}

async function submitCreate() {
  createError.value = ''
  if (nameContainsYear(newName.value)) {
    createError.value = t.picker.createYearError
    return
  }
  creating.value = true
  const outcome = await props.createHandler({
    brand: newBrand.value.trim(),
    name: newName.value.trim(),
    categoryId: newCategory.value,
  })
  creating.value = false
  if (!outcome.success) {
    // Das Formular bleibt stehen, mit allem, was schon eingetippt war -
    // sonst verschwindet der Fehler spurlos und die Eingabe gleich mit.
    createError.value = outcome.message
    return
  }
  // Ausgewaehlt oder neu angelegt fuehrt zum selben Ergebnis: die
  // Elternkomponente bekommt ein fertiges CatalogSearchResult.
  emit('select', outcome.item)
  newBrand.value = ''
  newName.value = ''
  showCreate.value = false
  term.value = ''
}

const categoryEntries = computed(() =>
  Object.entries(t.categories).map(([id, label]) => ({ id, label })),
)
</script>

<template>
  <div class="relative">
    <input
      v-model="term"
      type="text"
      :placeholder="placeholder ?? t.picker.placeholder"
      class="w-full rounded-field bg-surface-2 px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-accent"
    />

    <ul v-if="results.length > 0" class="mt-1 rounded-field bg-surface">
      <li v-for="result in results" :key="result.id">
        <button type="button" class="flex w-full items-baseline gap-2 px-3 py-2 text-left hover:bg-surface-2 focus-visible:bg-surface-2" @click="choose(result)">
          <span class="font-medium">{{ result.brandName }} {{ result.name }}</span>
          <!-- Beide Katalogebenen nebeneinander: der Gelegenheitsnutzer
               klickt oben, der Kenner sieht daneben seine genaue
               Ausfuehrung. -->
          <span class="text-xs text-muted">
            {{ result.level === 'line' ? t.picker.levelLine : t.picker.levelVariant }}
          </span>
          <span v-if="!result.isVerified" class="rounded-btn bg-surface-2 px-1 text-xs text-muted">{{ t.picker.unverified }}</span>
        </button>
      </li>
    </ul>

    <p v-else-if="searchError" class="mt-1 text-sm text-danger">{{ t.picker.searchError }}</p>
    <p v-else-if="term.trim() !== ''" class="mt-1 text-sm text-muted">
      {{ t.picker.noResults }}
    </p>

    <!-- Bewusst unauffaelliger Ausgang: die Ausnahme, nicht der Normalweg. -->
    <button
      v-if="term.trim() !== '' && !showCreate"
      type="button"
      class="mt-2 text-sm underline"
      @click="showCreate = true"
    >
      {{ t.picker.createHint }}
    </button>

    <form v-if="showCreate" class="mt-2 flex flex-col gap-2 rounded-card bg-surface p-3" @submit.prevent="submitCreate">
      <label class="flex flex-col gap-1">
        <span class="text-xs">{{ t.picker.createBrand }}</span>
        <input v-model="newBrand" type="text" required class="rounded-field bg-surface-2 px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-accent" />
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-xs">{{ t.picker.createName }}</span>
        <input v-model="newName" type="text" required class="rounded-field bg-surface-2 px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-accent" />
      </label>
      <label v-if="!categoryId" class="flex flex-col gap-1">
        <span class="text-xs">{{ t.picker.createCategory }}</span>
        <select v-model="newCategory" class="rounded-field bg-surface-2 px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-accent">
          <option v-for="entry in categoryEntries" :key="entry.id" :value="entry.id">{{ entry.label }}</option>
        </select>
      </label>
      <p v-if="createError" class="text-sm text-danger">{{ createError }}</p>
      <button
        type="submit"
        :disabled="creating"
        class="rounded-btn bg-accent px-3 py-1 text-accent-ink outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {{ t.picker.createSubmit }}
      </button>
    </form>
  </div>
</template>
