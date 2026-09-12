<script setup lang="ts">
// ACHTUNG BEIM EINBINDEN: vuedraggable (SortableJS) greift beim Initialisieren
// auf `document` zu und ueberlebt kein SSR. Diese Komponente gehoert auf der
// Seite in ein <ClientOnly> - genau wie SignalChainEditor.vue, mit dem sie
// zusammen im Bearbeitungsmodus steht.
//
// "computed" wird hier explizit importiert statt auf Nuxts Auto-Import zu
// vertrauen: der Komponententest mountet diese Datei ueber @vue/test-utils
// direkt, also ausserhalb der Nuxt-Build-Pipeline.
import { computed } from 'vue'
import draggable from 'vuedraggable'
// Dieselbe Namensfarbe wie in SignalChain.vue und SignalChainEditor.vue:
// zwischen Ansehen, Bearbeiten und diesem Pool muss niemand umlernen.
import { rarityNameClass } from '#shared/utils/rarityStyle'
import type { ChainStation } from './SignalChain.vue'

// Diese Komponente haelt keine eigene Wahrheit: die Geraete kommen von aussen,
// jede Aenderung geht nach oben. Zwei Wege verlassen die Liste: Ziehen nach
// links (update:items, vom Elternteil ueber v-model:items zu uebernehmen) und
// der Anhaengen-Knopf (append, mit der Id - das Elternteil haengt sie hinten
// an die Kette und entfernt sie hier).
const props = defineProps<{ items: ChainStation[] }>()
const emit = defineEmits<{ append: [id: string]; 'update:items': [items: ChainStation[]] }>()

const t = useText()

const list = computed({
  get: () => props.items,
  set: (next: ChainStation[]) => emit('update:items', next),
})

function append(id: string): void {
  emit('append', id)
}

// Der Anhaengen-Knopf sitzt mit im ziehbaren Element. Zwei Massnahmen halten
// den Klick trotzdem zuverlaessig:
//
// 1. handle="[data-grip]" (wie in SignalChainEditor.vue): SortableJS startet
//    einen Zug ausschliesslich von einem Element, das zum Handle passt.
//    Alles ausserhalb - auch dieser Knopf - bekommt gar keinen Zug-Listener
//    und verhaelt sich wie gewoehnliches DOM. Das ist bereits im Editor
//    bewiesen: dessen Pfeil- und Entfernen-Knoepfe sitzen ebenfalls ausserhalb
//    des Griffs und funktionieren dort ohne Zusatzaufwand.
// 2. filter="[data-no-drag]" mit prevent-on-filter="false" zusaetzlich auf
//    dem Knopf, als zweite Absicherung: SortableJS schliesst den Knopf damit
//    auch dann von jeder Zug-Heuristik aus, wenn handle spaeter einmal
//    gelockert wird, und prevent-on-filter="false" stellt sicher, dass der
//    Klick selbst nicht durch ein internes preventDefault() verschluckt wird.
const appendButtonClass =
  'grid size-[1.5rem] shrink-0 place-items-center rounded-btn text-muted outline-none transition-colors ' +
  'hover:bg-surface hover:text-accent focus-visible:ring-2 focus-visible:ring-accent'
</script>

<template>
  <div class="flex flex-col gap-3">
    <div>
      <h2 class="display text-[.9375rem] font-semibold text-ink">{{ t.profile.chainPoolTitle }}</h2>
      <p class="mt-1 text-[.8125rem] text-muted">{{ t.profile.chainPoolHint }}</p>
    </div>

    <draggable
      v-if="list.length > 0"
      v-model="list"
      item-key="id"
      handle="[data-grip]"
      draggable="[data-gear]"
      filter="[data-no-drag]"
      :prevent-on-filter="false"
      :group="{ name: 'chain', pull: true, put: true }"
      ghost-class="opacity-40"
      class="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-2"
    >
      <template #item="{ element }">
        <div data-gear class="flex select-none items-start gap-[.45rem] rounded-btn bg-surface-2 p-2">
          <span
            data-grip
            aria-hidden="true"
            :title="t.profile.chainDragHandle"
            class="mt-[.15rem] shrink-0 cursor-grab text-muted opacity-60 transition-opacity hover:opacity-100 active:cursor-grabbing"
          >
            <svg viewBox="0 0 10 16" class="h-4 w-2.5" fill="currentColor">
              <circle cx="3" cy="4" r="1" />
              <circle cx="7" cy="4" r="1" />
              <circle cx="3" cy="8" r="1" />
              <circle cx="7" cy="8" r="1" />
              <circle cx="3" cy="12" r="1" />
              <circle cx="7" cy="12" r="1" />
            </svg>
          </span>

          <div class="min-w-0 flex-1">
            <span class="block font-mono text-[.625rem] uppercase leading-relaxed tracking-[.11em] text-muted">
              {{ element.category }}
            </span>
            <span
              class="block truncate display text-[.9375rem] font-semibold leading-tight"
              :class="rarityNameClass(element.rarity)"
            >
              {{ element.label }}
            </span>
            <span v-if="element.detail" class="block font-mono text-xs tabular-nums text-muted">
              {{ element.detail }}
            </span>
          </div>

          <button
            type="button"
            data-no-drag
            :class="appendButtonClass"
            :aria-label="t.profile.chainAppend"
            :title="t.profile.chainAppend"
            @click="append(element.id)"
          >
            <svg
              viewBox="0 0 16 16"
              class="size-4"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              aria-hidden="true"
            >
              <path d="M8 3 V13 M3 8 H13" />
            </svg>
          </button>
        </div>
      </template>
    </draggable>

    <!-- Steht alles schon in der Kette, gibt es nichts zu ziehen oder
         anzuhaengen - eine leere Zug-Flaeche daneben waere nur eine Flaeche,
         die nichts tut. -->
    <div
      v-else
      class="rounded-card border border-dashed border-line px-4 py-[1.1rem] text-center text-sm text-muted"
    >
      {{ t.profile.chainPoolEmpty }}
    </div>
  </div>
</template>
