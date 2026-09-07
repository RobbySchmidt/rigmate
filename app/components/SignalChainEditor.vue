<script setup lang="ts">
// ACHTUNG BEIM EINBINDEN: vuedraggable (SortableJS) greift beim Initialisieren
// auf `document` zu und ueberlebt kein SSR. Diese Komponente gehoert auf der
// Seite in ein <ClientOnly> - sonst faellt der Server-Render aus.
//
// "computed" und "nextTick" werden hier explizit importiert statt auf Nuxts
// Auto-Import zu vertrauen: der Komponententest mountet diese Datei ueber
// @vue/test-utils direkt, also ausserhalb der Nuxt-Build-Pipeline.
import { computed, nextTick } from 'vue'
import draggable from 'vuedraggable'
// Knoten und Namensfarbe aus derselben Quelle wie SignalChain.vue: zwischen
// Ansehen und Bearbeiten muss niemand umlernen.
import { rarityNameClass, rarityNodeClass } from '#shared/utils/rarityStyle'
import type { ChainStation } from './SignalChain.vue'

// Die Zug-Gruppe "chain" ist dieselbe wie in GearPool.vue und in der
// Ablageflaeche von GearPanel.vue. SortableJS nimmt ein gezogenes Element nur
// an, wenn beide Seiten in derselben Gruppe liegen - fehlt sie hier, laeuft
// jeder Zug aus dem Pool ins Leere, und zwar ohne Fehlermeldung.
//
// Diese Komponente haelt keine eigene Wahrheit: die Stationen kommen von
// aussen, jede Aenderung geht nach oben. Wer sie einsetzt, muss
// update:stations auch wirklich uebernehmen (v-model:stations), sonst
// springt die Liste nach jedem Zug zurueck.
const props = defineProps<{ stations: ChainStation[] }>()
const emit = defineEmits<{
  'update:stations': [stations: ChainStation[]]
  remove: [id: string]
}>()

const t = useText()

// Zwei Klicks im selben Tick sind ein echter Fall: props.stations kommt erst
// zurueck, wenn das Elternteil neu gerendert hat. Bis dahin wuerde die zweite
// Verschiebung auf dem alten Stand rechnen und die erste ueberschreiben.
// Deshalb merken wir uns genau eine Fassung lang, was wir gemeldet haben.
// Das ist keine zweite Wahrheit, sondern ein Fenster von einem Tick: danach
// gilt wieder ausschliesslich der Prop - auch dann, wenn das Elternteil die
// Aenderung gar nicht uebernommen hat.
let pending: ChainStation[] | null = null

function current(): ChainStation[] {
  return pending ?? props.stations
}

function publish(next: ChainStation[]): void {
  pending = next
  emit('update:stations', next)
  nextTick(() => {
    pending = null
  })
}

// vuedraggable schreibt direkt in sein Modell. Wir reichen jede Aenderung
// nach oben durch, statt hier eine zweite Wahrheit zu halten.
const list = computed({
  get: () => props.stations,
  set: (next: ChainStation[]) => publish(next),
})

// Ziehen ist nie der einzige Weg: SortableJS kennt Maus und Touch, aber keine
// Tastatur. Die Pfeile sind deshalb keine Zugabe, sondern die Grundbedienung -
// und auf schmalen Schirmen tragen sie ohnehin die ganze Arbeit.
function move(index: number, delta: number): void {
  const rows = [...current()]
  const target = index + delta
  if (target < 0 || target >= rows.length) return
  const [row] = rows.splice(index, 1)
  rows.splice(target, 0, row!)
  publish(rows)
}

function remove(index: number): void {
  const rows = current()
  const row = rows[index]
  if (!row) return
  publish(rows.filter((_, i) => i !== index))
  // Eigenes Ereignis, damit die Seite darueber das Geraet zurueck in die
  // Liste schiebt. Es wird aus der Kette genommen, nicht geloescht - ein "X"
  // sieht sonst nach Loeschen aus, und Loeschen waere hier ein teurer Irrtum.
  emit('remove', row.id)
}

// Ein Knopf, drei Mal: gleiche Groesse, gleiche Zurueckhaltung. Der
// deaktivierte Zustand nimmt die Zeigerereignisse mit weg, damit ein Klick am
// Rand der Kette nicht doch noch irgendwo landet.
const buttonClass =
  'grid size-[1.5rem] shrink-0 place-items-center rounded-sm text-muted transition-colors ' +
  'hover:bg-surface hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-1 ' +
  'focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-30'

// ZUM #item-SLOT UNTEN - und warum der Hinweis hier steht statt dort:
//
// Der Slot darf GENAU EIN Wurzelelement je Station liefern. vuedraggable
// ordnet die DOM-Kinder den Array-Positionen zu und zaehlt sie dafuer nach
// (computeComponentStructure: "Item slot must have only one child"); ein
// zweiter Knoten je Eintrag verschiebt diese Zuordnung. Das Patchkabel
// steckt deshalb mit im Wrapper.
//
// ZUR RASTERSPALTE minmax(0,1fr) UNTEN: ein blankes 1fr heisst
// minmax(auto, 1fr), und dieses auto ist die MIN-CONTENT-Breite der Station.
// Die enthaelt den Geraetenamen ungebrochen, weil "truncate" ihn auf
// white-space: nowrap setzt - das Raster wuchs damit ueber die 15,5rem
// schmale Profilspalte hinaus und die Kette schob sich im Bearbeitungsmodus
// quer in den Pool daneben (im Browser gesehen, erstes Rendern dieser
// Seite). Mit minmax(0,1fr) darf die Spalte schrumpfen, und dann greift das
// truncate, fuer das es gedacht war.
//
// Und ein HTML-Kommentar IM Slot zaehlt mit. Vue laesst Kommentare im
// Entwicklungsmodus stehen, sie werden zu Comment-Knoten - der Erklaertext,
// der frueher hier ueber dem <div data-station> stand, hat die Kette beim
// ersten Rendern im Browser mit genau dieser Ausnahme abstuerzen lassen,
// sobald sie die erste Station bekam. Der Komponententest hat das nicht
// gesehen, weil er draggable durch eine Attrappe ersetzt.
</script>

<template>
  <draggable
    v-model="list"
    item-key="id"
    handle="[data-grip]"
    draggable="[data-station]"
    :group="{ name: 'chain', pull: true, put: true }"
    ghost-class="opacity-40"
    class="flex flex-col"
  >
    <!-- Kein Kommentar innerhalb von #item - siehe Begruendung im Skript. -->
    <template #item="{ element, index }">
      <div data-station>
        <div class="grid grid-cols-[1.1rem_minmax(0,1fr)] gap-x-[.6rem]">
          <!-- Der durchgehende Strang bleibt wie in der Ansichtsfassung:
               Stueck ueber dem Knoten, Knoten, Stueck darunter bis zum Kabel.
               Damit er die einzige senkrechte Linie bleibt, haben die
               Stationen hier eine Flaeche statt eines Rahmens - zwei
               parallele Linien im Abstand von einem halben Zentimeter waeren
               ueber zwoelf Geraete hinweg nur Unruhe. -->
          <div class="flex flex-col items-center">
            <span class="h-[.6rem] w-px" :class="index > 0 ? 'bg-line' : 'bg-transparent'" />
            <span class="size-[.6rem] shrink-0 rounded-full border-[1.5px]" :class="rarityNodeClass(element.rarity)" />
            <span v-if="index < stations.length - 1" class="w-px flex-1 bg-line" />
          </div>

          <div class="flex select-none items-start gap-[.45rem] rounded-sm bg-surface-2 px-2 py-[.4rem]">
            <!-- Der Griff ist reine Maus- und Touch-Bedienung und bleibt
                 deshalb aus dem Tab-Lauf heraus: ein fokussierbares Element,
                 das mit der Tastatur nichts kann, waere eine Sackgasse. Die
                 Pfeile daneben tragen dieselbe Aufgabe. -->
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
              <span
                class="flex items-baseline gap-[.4rem] font-mono text-[.625rem] uppercase leading-relaxed tracking-[.11em] text-muted"
              >
                <span class="tabular-nums">{{ index + 1 }}</span>
                <span class="truncate">{{ element.category }}</span>
              </span>
              <span
                class="block truncate font-display text-[.9375rem] font-semibold leading-tight"
                :class="rarityNameClass(element.rarity)"
              >
                {{ element.label }}
              </span>
              <span v-if="element.detail" class="block font-mono text-xs tabular-nums text-muted">
                {{ element.detail }}
              </span>
            </div>

            <div class="flex shrink-0 items-center gap-[.05rem]">
              <button
                type="button"
                :class="buttonClass"
                :aria-label="t.profile.chainMoveUp"
                :title="t.profile.chainMoveUp"
                :disabled="index === 0"
                @click="move(index, -1)"
              >
                <svg
                  viewBox="0 0 16 16"
                  class="size-4"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 10 L8 6 L12 10" />
                </svg>
              </button>

              <button
                type="button"
                :class="buttonClass"
                :aria-label="t.profile.chainMoveDown"
                :title="t.profile.chainMoveDown"
                :disabled="index === stations.length - 1"
                @click="move(index, 1)"
              >
                <svg
                  viewBox="0 0 16 16"
                  class="size-4"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 6 L8 10 L12 6" />
                </svg>
              </button>

              <!-- Abgesetzt, weil dieser Knopf etwas anderes tut als die
                   beiden davor. Bewusst in derselben zurueckhaltenden Farbe:
                   er nimmt nur aus der Kette, das Geraet bleibt im Rig. -->
              <button
                type="button"
                :class="`${buttonClass} ml-[.15rem] border-l border-line-soft`"
                :aria-label="t.profile.chainRemove"
                :title="t.profile.chainRemove"
                @click="remove(index)"
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
                  <path d="M4.5 4.5 L11.5 11.5 M11.5 4.5 L4.5 11.5" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Patchkabel im selben Spaltenraster wie die Station darueber, damit
             es buendig ueber dem Strang sitzt. Nie hinter der letzten Station:
             ein Kabel ins Nichts liest sich als fehlendes Glied. -->
        <div
          v-if="index < stations.length - 1"
          data-cable
          class="grid grid-cols-[1.1rem_minmax(0,1fr)] gap-x-[.6rem]"
          aria-hidden="true"
        >
          <div class="flex h-[1.35rem] justify-center text-line">
            <svg viewBox="0 0 20 24" class="h-full w-5 shrink-0 overflow-visible">
              <path
                d="M10 0 C10 7 17 9 17 12 C17 15 10 17 10 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.4"
                stroke-linecap="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </template>
  </draggable>
</template>
