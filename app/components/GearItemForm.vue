<script setup lang="ts">
interface GearRow {
  id: string
  label: string
}

const props = defineProps<{
  catalogItemLabel: string
  ownedGear: GearRow[]
  showPrecisionHint?: boolean
}>()

const emit = defineEmits<{
  save: [{ year: number | null; finish: string | null; modifications: string | null; notes: string | null; installedInId: string | null }]
  cancel: []
}>()

const t = useText()
const year = ref<string>('')
const finish = ref('')
const modifications = ref('')
const notes = ref('')
const installedInId = ref('')
const hintDismissed = ref(false)

function submit() {
  emit('save', {
    year: year.value === '' ? null : Number(year.value),
    finish: finish.value.trim() || null,
    modifications: modifications.value.trim() || null,
    notes: notes.value.trim() || null,
    installedInId: installedInId.value || null,
  })
}
</script>

<template>
  <form class="flex flex-col gap-3 rounded-card bg-surface p-4" @submit.prevent="submit">
    <p class="font-medium">{{ catalogItemLabel }}</p>

    <!-- Der Hinweis erscheint erst nach der Auswahl und ist nie ein Pflichtfeld. -->
    <p v-if="showPrecisionHint && !hintDismissed" class="rounded-card bg-surface-2 p-2 text-sm">
      {{ t.precisionHint.text }}
      <button type="button" class="ml-2 underline" @click="hintDismissed = true">
        {{ t.precisionHint.dismiss }}
      </button>
    </p>

    <p class="text-xs text-muted">{{ t.gearForm.optionalHint }}</p>

    <label class="flex flex-col gap-1">
      <span class="text-sm">{{ t.gearForm.year }}</span>
      <input v-model="year" type="number" min="1900" max="2100" class="rounded-field bg-surface-2 px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-accent" />
    </label>
    <label class="flex flex-col gap-1">
      <span class="text-sm">{{ t.gearForm.finish }}</span>
      <input v-model="finish" type="text" maxlength="80" class="rounded-field bg-surface-2 px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-accent" />
    </label>
    <label class="flex flex-col gap-1">
      <span class="text-sm">{{ t.gearForm.modifications }}</span>
      <input v-model="modifications" type="text" maxlength="500" class="rounded-field bg-surface-2 px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-accent" />
    </label>
    <label class="flex flex-col gap-1">
      <span class="text-sm">{{ t.gearForm.notes }}</span>
      <textarea v-model="notes" maxlength="1000" rows="3" class="rounded-field bg-surface-2 px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-accent" />
    </label>
    <label v-if="ownedGear.length > 0" class="flex flex-col gap-1">
      <span class="text-sm">{{ t.gearForm.installedIn }}</span>
      <select v-model="installedInId" class="rounded-field bg-surface-2 px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-accent">
        <option value="">{{ t.gearForm.installedInNone }}</option>
        <option v-for="item in ownedGear" :key="item.id" :value="item.id">{{ item.label }}</option>
      </select>
    </label>

    <div class="flex gap-2">
      <button type="submit" class="rounded-btn bg-accent px-4 py-2 text-accent-ink">{{ t.rig.save }}</button>
      <button
        type="button"
        class="rounded-btn bg-surface-2 px-4 py-2 outline-none focus-visible:ring-2 focus-visible:ring-accent"
        @click="emit('cancel')"
      >
        {{ t.rig.cancel }}
      </button>
    </div>
  </form>
</template>
