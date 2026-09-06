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

const props = defineProps<{ categoryId?: string; placeholder?: string }>()
const emit = defineEmits<{
  select: [CatalogSearchResult]
  create: [{ brand: string; name: string; categoryId: string }]
}>()

const t = useText()
const term = ref('')
const results = ref<CatalogSearchResult[]>([])
const showCreate = ref(false)
const newBrand = ref('')
const newName = ref('')
const newCategory = ref(props.categoryId ?? 'guitar')
const createError = ref('')

let debounce: ReturnType<typeof setTimeout> | undefined

// Resolution happens while typing, not as a follow-up question afterwards.
watch(term, (value) => {
  clearTimeout(debounce)
  if (value.trim() === '') {
    results.value = []
    return
  }
  debounce = setTimeout(async () => {
    const query = new URLSearchParams({ q: value })
    if (props.categoryId) query.set('category', props.categoryId)
    const body = await $fetch<{ results: CatalogSearchResult[] }>(`/api/catalog/search?${query}`)
    results.value = body.results
  }, 120)
})

function choose(result: CatalogSearchResult) {
  emit('select', result)
  term.value = ''
  results.value = []
  showCreate.value = false
}

function submitCreate() {
  createError.value = ''
  if (nameContainsYear(newName.value)) {
    createError.value = t.picker.createYearError
    return
  }
  emit('create', {
    brand: newBrand.value.trim(),
    name: newName.value.trim(),
    categoryId: newCategory.value,
  })
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
      class="w-full rounded border px-3 py-2"
    />

    <ul v-if="results.length > 0" class="mt-1 divide-y rounded border bg-white">
      <li v-for="result in results" :key="result.id">
        <button type="button" class="flex w-full items-baseline gap-2 px-3 py-2 text-left" @click="choose(result)">
          <span class="font-medium">{{ result.brandName }} {{ result.name }}</span>
          <!-- Both catalogue levels side by side: the casual user clicks
               the top line, the enthusiast sees their exact variant next
               to it. -->
          <span class="text-xs text-neutral-500">
            {{ result.level === 'line' ? t.picker.levelLine : t.picker.levelVariant }}
          </span>
          <span v-if="!result.isVerified" class="text-xs text-amber-600">{{ t.picker.unverified }}</span>
        </button>
      </li>
    </ul>

    <p v-else-if="term.trim() !== ''" class="mt-1 text-sm text-neutral-500">
      {{ t.picker.noResults }}
    </p>

    <!-- Deliberately quiet exit: the exception, not the normal path. -->
    <button
      v-if="term.trim() !== '' && !showCreate"
      type="button"
      class="mt-2 text-sm underline"
      @click="showCreate = true"
    >
      {{ t.picker.createHint }}
    </button>

    <form v-if="showCreate" class="mt-2 flex flex-col gap-2 rounded border p-3" @submit.prevent="submitCreate">
      <label class="flex flex-col gap-1">
        <span class="text-xs">{{ t.picker.createBrand }}</span>
        <input v-model="newBrand" type="text" required class="rounded border px-2 py-1" />
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-xs">{{ t.picker.createName }}</span>
        <input v-model="newName" type="text" required class="rounded border px-2 py-1" />
      </label>
      <label v-if="!categoryId" class="flex flex-col gap-1">
        <span class="text-xs">{{ t.picker.createCategory }}</span>
        <select v-model="newCategory" class="rounded border px-2 py-1">
          <option v-for="entry in categoryEntries" :key="entry.id" :value="entry.id">{{ entry.label }}</option>
        </select>
      </label>
      <p v-if="createError" class="text-sm text-red-600">{{ createError }}</p>
      <button type="submit" class="rounded bg-neutral-900 px-3 py-1 text-white">{{ t.picker.createSubmit }}</button>
    </form>
  </div>
</template>
