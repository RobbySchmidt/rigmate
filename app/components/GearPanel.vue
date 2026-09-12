<script setup lang="ts">
// Die linke Spalte der Profilseite: zwei Reiter, dahinter die schon
// gebauten Teile. Diese Komponente holt keine Daten und haelt keinen
// eigenen Zustand ausser dem aktiven Reiter - alles andere kommt als Prop
// und geht als Ereignis zurueck.
//
// "computed", "ref", "watch" und "nextTick" werden explizit importiert
// statt auf Nuxts Auto-Import zu vertrauen: der Komponententest mountet
// diese Datei ueber @vue/test-utils direkt, also ausserhalb der
// Nuxt-Build-Pipeline. GearList, SignalChain und SignalChainEditor kommen
// dagegen aus app/components/ und loest Nuxt selbst auf - genau wie
// RarityPip in GearList.vue.
import { computed, nextTick, ref, watch } from 'vue'
import draggable from 'vuedraggable'
import { rarityNameClass } from '#shared/utils/rarityStyle'
import type { ChainStation } from './SignalChain.vue'
import type { GearListGroup } from './GearList.vue'
import type { ChainSaveError, ChainSaveStatus } from '../composables/useChainOrder'

const props = withDefaults(
  defineProps<{
    /** Kategorisiertes Equipment fuer den ersten Reiter. */
    groups: GearListGroup[]
    /** Der Signalweg, in Reihenfolge. Leer ist ein gueltiger Stand. */
    stations: ChainStation[]
    /**
     * Geraete im Rig, die keine Station sind. Dieselbe Liste, die die Seite
     * im Bearbeitungsmodus an GearPool gibt - hier nur gezaehlt, damit die
     * Zahl unter der Kette nicht aus einer zweiten Quelle stammt und
     * auseinanderlaufen kann.
     */
    poolItems?: ChainStation[]
    isOwn: boolean
    /** Den Bearbeitungsmodus steuert die Seite, nicht das Panel. */
    editing?: boolean
    saveStatus?: ChainSaveStatus
    lastError?: ChainSaveError | null
    /**
     * Das Rig konnte nicht geladen werden. Ohne diese Unterscheidung sieht
     * ein kaputter Request aus wie ein leeres Rig - der wiederkehrende
     * Fehler dieses Projekts.
     */
    loadFailed?: boolean
  }>(),
  {
    poolItems: () => [],
    editing: false,
    saveStatus: 'idle',
    lastError: null,
    loadFailed: false,
  },
)

const emit = defineEmits<{
  /** "Kette bearbeiten" - die Seite tauscht daraufhin die rechte Spalte. */
  edit: []
  /** "Fertig" - zurueck zur Ansichtsfassung und zum Feed. */
  done: []
  /** Neue Reihenfolge, aus dem Editor oder aus der Ablageflaeche. */
  'update:stations': [stations: ChainStation[]]
  /** Station aus der Kette genommen; das Geraet bleibt im Rig. */
  remove: [id: string]
  /** Nach einem Fehlschlag denselben Stand noch einmal schicken. */
  retry: []
}>()

const t = useText()

type Tab = 'equipment' | 'chain'

const active = ref<Tab>('equipment')
const equipmentTab = ref<HTMLButtonElement | null>(null)
const chainTab = ref<HTMLButtonElement | null>(null)

// Auf dem eigenen Profil ist der Ketten-Reiter eine Einladung und immer da.
// Auf einem fremden waere ein leerer Reiter eine Sackgasse.
const showChainTab = computed(() => props.isOwn || props.stations.length > 0)

// Der Reiter allein tauscht die rechte Spalte nicht - ansehen darf man die
// Kette, ohne den Feed zu verlieren. Umgekehrt gilt: schaltet die Seite in
// den Bearbeitungsmodus (leere Kette auf dem eigenen Profil), muss der
// Ketten-Reiter offen sein, sonst bearbeitet jemand etwas Unsichtbares.
watch(
  () => props.editing,
  (on) => {
    if (on) active.value = 'chain'
  },
  { immediate: true },
)

// Verschwindet der Reiter unter der Hand (letzte Station entfernt, fremdes
// Profil), darf kein Panel ohne zugehoerigen Reiter stehen bleiben.
watch(showChainTab, (on) => {
  if (!on && active.value === 'chain') active.value = 'equipment'
})

// Eine Gruppe ohne Eintraege ist fuer GearList dasselbe wie keine Gruppe -
// die Komponente filtert sie heraus und rendert dann buchstaeblich nichts.
// Deshalb zaehlt hier nicht die Anzahl der Gruppen, sondern die der
// Eintraege darin.
const hasGear = computed(() => props.groups.some((group) => group.entries.length > 0))

const outsideCount = computed(() => props.poolItems.length)

// Zwei der fuenf SQLSTATEs aus set_chain_order() verlangen etwas anderes
// vom Nutzer als "nochmal probieren": bei RG001 ist die Sitzung abgelaufen,
// bei RG005 zeigt der Bildschirm ein Rig, das so nicht mehr existiert. Der
// Rest (RG002/RG003/RG004) laesst sich ueber die Oberflaeche gar nicht
// ausloesen und bleibt beim Sammeltext. Die rohe Meldung aus Postgres wird
// hier bewusst nirgends durchgereicht.
const saveErrorText = computed(() => {
  const code = props.lastError?.code
  if (code === 'RG001') return t.profile.chainSaveErrorSession
  if (code === 'RG005') return t.profile.chainSaveErrorStale
  return t.profile.chainSaveError
})

// Der Speicherzustand haengt unter beiden Reitern, nicht im Ketten-Panel:
// ein Wechsel auf Equipment waehrend eines laufenden Schreibvorgangs wuerde
// sonst einen Fehlschlag wegblenden - genau die Sorte stiller Fehler, die
// dieses Projekt sechsmal getroffen hat.
//
// "Gespeichert" ist die Quittung fuer eine Handlung im Bearbeitungsmodus.
// Nach "Fertig" blieb sie bis zum Neuladen stehen und behauptete auf einer
// reinen Ansichtsseite etwas ueber einen Vorgang, den dort niemand
// ausgeloest hat. Sie geht deshalb mit dem Modus.
//
// Fuer 'pending' und 'error' gilt das ausdruecklich NICHT. Wer waehrend
// eines laufenden oder fehlgeschlagenen Schreibvorgangs auf "Fertig"
// drueckt, muss das weiter sehen - sonst waere dieser Fix genau der stille
// Fehlschlag, den der Absatz darueber verhindern soll.
const showSaveState = computed(() => {
  if (!props.isOwn || props.saveStatus === 'idle') return false
  return props.editing || props.saveStatus !== 'saved'
})

// Nur zwei Reiter: jeder Pfeil wechselt zum jeweils anderen. Der Fokus muss
// mitwandern, sonst haengt er an einem Knopf, der nicht mehr gewaehlt ist.
function stepTab(): void {
  if (!showChainTab.value) return
  const next: Tab = active.value === 'equipment' ? 'chain' : 'equipment'
  active.value = next
  void nextTick(() => {
    const target = next === 'equipment' ? equipmentTab.value : chainTab.value
    target?.focus()
  })
}

// Die Ablageflaeche schreibt genauso nach oben wie der Editor: eine neue
// Reihenfolge, mehr passiert hier nicht. Das Entfernen aus dem Pool erledigt
// SortableJS auf der anderen Seite (GearPool meldet update:items).
function dropped(next: ChainStation[]): void {
  emit('update:stations', next)
}

function tabClass(selected: boolean): string {
  return [
    'rounded-full px-3 py-1 font-mono text-[.6875rem] uppercase tracking-[.1em] outline-none transition-colors',
    'focus-visible:ring-2 focus-visible:ring-accent',
    selected ? 'bg-accent-wash text-accent' : 'bg-surface-2 text-muted hover:text-ink',
  ].join(' ')
}

// Bernstein (text-rare) ist der Seltenheit vorbehalten und kommt hier nicht
// in Frage - fuer Fehler gibt es text-danger. Die Klasse steht an
// dieser einen Stelle statt dreimal im Template.
const dangerClass = 'text-danger'
</script>

<template>
  <div class="flex flex-col gap-4">
    <div role="tablist" :aria-label="t.profile.tabsLabel" class="flex gap-2">
      <button
        id="gear-panel-tab-equipment"
        ref="equipmentTab"
        type="button"
        role="tab"
        aria-controls="gear-panel-view-equipment"
        :aria-selected="active === 'equipment'"
        :tabindex="active === 'equipment' ? 0 : -1"
        :class="tabClass(active === 'equipment')"
        @click="active = 'equipment'"
        @keydown.left.prevent="stepTab"
        @keydown.right.prevent="stepTab"
      >
        {{ t.profile.tabEquipment }}
      </button>

      <button
        v-if="showChainTab"
        id="gear-panel-tab-chain"
        ref="chainTab"
        type="button"
        role="tab"
        aria-controls="gear-panel-view-chain"
        :aria-selected="active === 'chain'"
        :tabindex="active === 'chain' ? 0 : -1"
        :class="tabClass(active === 'chain')"
        @click="active = 'chain'"
        @keydown.left.prevent="stepTab"
        @keydown.right.prevent="stepTab"
      >
        {{ t.profile.tabChain }}
      </button>
    </div>

    <div
      v-if="active === 'equipment'"
      id="gear-panel-view-equipment"
      role="tabpanel"
      aria-labelledby="gear-panel-tab-equipment"
      tabindex="0"
    >
      <p v-if="loadFailed" class="text-sm" :class="dangerClass">{{ t.profile.loadError }}</p>
      <GearList v-else-if="hasGear" :groups="groups" />
      <p v-else class="text-sm text-muted">{{ t.profile.emptyRig }}</p>
    </div>

    <div
      v-else-if="showChainTab"
      id="gear-panel-view-chain"
      role="tabpanel"
      aria-labelledby="gear-panel-tab-chain"
      tabindex="0"
      class="flex flex-col gap-4"
    >
      <p v-if="loadFailed" class="text-sm" :class="dangerClass">{{ t.profile.loadError }}</p>

      <template v-else>
        <ClientOnly v-if="editing">
          <SignalChainEditor
            v-if="stations.length > 0"
            :stations="stations"
            @update:stations="emit('update:stations', $event)"
            @remove="emit('remove', $event)"
          />

          <!-- Ohne diese Flaeche gibt es bei leerer Kette nichts, worauf man
               etwas fallen lassen koennte: der Editor rendert dann eine
               Liste ohne Hoehe, und die erste Station liesse sich nur ueber
               "Anhaengen" setzen. Dieselbe Zug-Gruppe wie GearPool - sonst
               nimmt die Flaeche nichts an, und zwar stumm. -->
          <draggable
            v-else
            data-chain-drop
            :model-value="stations"
            item-key="id"
            :group="{ name: 'chain', pull: true, put: true }"
            ghost-class="opacity-40"
            class="grid min-h-[6.5rem] place-items-center rounded-card border border-dashed border-line px-4 py-6 text-center text-sm text-muted"
            @update:model-value="dropped"
          >
            <template #item="{ element }">
              <span class="display text-[.9375rem] font-semibold" :class="rarityNameClass(element.rarity)">
                {{ element.label }}
              </span>
            </template>
            <template #footer>
              <span>{{ t.profile.chainEmptyDrop }}</span>
            </template>
          </draggable>
        </ClientOnly>

        <SignalChain
          v-else
          :stations="stations"
          :is-own="isOwn"
          :outside-count="outsideCount"
        />

        <!-- Nur der Besitzer bearbeitet, und nur, wenn das Rig ueberhaupt
             ankam: aus einer Kette, die nicht geladen werden konnte, wuerde
             ein Speichern die echte Reihenfolge ueberschreiben. -->
        <div v-if="isOwn" class="flex justify-end">
          <button
            v-if="editing"
            type="button"
            class="rounded-btn bg-surface-2 px-3 py-[.35rem] font-mono text-[.6875rem] uppercase tracking-[.1em] text-ink outline-none transition-colors hover:text-accent focus-visible:ring-2 focus-visible:ring-accent"
            @click="emit('done')"
          >
            {{ t.profile.chainDone }}
          </button>
          <button
            v-else
            type="button"
            class="rounded-btn bg-surface-2 px-3 py-[.35rem] font-mono text-[.6875rem] uppercase tracking-[.1em] text-muted outline-none transition-colors hover:text-accent focus-visible:ring-2 focus-visible:ring-accent"
            @click="emit('edit')"
          >
            {{ t.profile.chainEdit }}
          </button>
        </div>
      </template>
    </div>

    <p
      v-if="showSaveState"
      role="status"
      aria-live="polite"
      class="flex flex-wrap items-center gap-2 border-t border-line pt-3 text-[.8125rem]"
      :class="saveStatus === 'error' ? dangerClass : 'text-muted'"
    >
      <span v-if="saveStatus === 'pending'">{{ t.profile.chainSaving }}</span>
      <span v-else-if="saveStatus === 'saved'">{{ t.profile.chainSaved }}</span>
      <template v-else>
        <span>{{ saveErrorText }}</span>
        <button
          type="button"
          class="rounded-btn border border-current px-2 py-[.15rem] font-mono text-[.6875rem] uppercase tracking-[.1em] outline-none transition-opacity hover:opacity-70 focus-visible:ring-2 focus-visible:ring-accent"
          @click="emit('retry')"
        >
          {{ t.profile.chainRetry }}
        </button>
      </template>
    </p>
  </div>
</template>
