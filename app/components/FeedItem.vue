<script setup lang="ts">
// Ein Rig-Ereignis im Feed: wer, wann, welche Geraete. Die Ereignisse
// selbst baut buildRigEvents() aus den vorhandenen gear_items - diese
// Komponente rechnet nichts nach und holt nichts.
//
// "computed" wird explizit importiert statt auf Nuxts Auto-Import zu
// vertrauen: der Komponententest mountet diese Datei ueber @vue/test-utils
// direkt, also ausserhalb der Nuxt-Build-Pipeline.
import { computed } from 'vue'
import { rarityNameClass } from '#shared/utils/rarityStyle'
import type { RigEvent } from '#shared/utils/rigEvents'

const props = defineProps<{
  event: RigEvent
  /** Wer das Ereignis ausgeloest hat. Auf dem Profil der Seiteneigner. */
  displayName: string
}>()

const t = useText()

/**
 * Der Tag wird rein als Zeichenkette umgestellt: "2026-09-07" -> "07.09.2026".
 *
 * KEIN Date, kein toLocaleDateString(), kein Intl. Die Profilseite rendert
 * serverseitig und wird im Browser hydriert. toLocaleDateString() haengt an
 * zwei Dingen, die auf beiden Seiten verschieden sein koennen: der
 * Standardsprache (Node laeuft haeufig unter en-US, der Browser unter de-DE)
 * und der Zeitzone (Server in UTC, Betrachter in Europe/Berlin). Schon eine
 * der beiden Abweichungen erzeugt zwei verschiedene Zeichenketten fuer
 * dasselbe Datum - Vue meldet einen Hydration-Mismatch, und die Anzeige
 * springt beim Nachladen.
 *
 * Ein festes Locale plus feste Zeitzone waere ein Weg, haengt aber weiter an
 * den ICU-Daten der jeweiligen Laufzeit. Diese Fassung haengt an gar nichts:
 * `event.day` ist laut buildRigEvents() bereits das UTC-Tagespraefix eines
 * ISO-Zeitstempels, und aus denselben zehn Zeichen kann auf Server und
 * Client nur dasselbe Ergebnis fallen.
 *
 * Was nicht wie ein ISO-Tag aussieht, wird unveraendert durchgereicht -
 * lieber ein rohes Datum als eine erfundene Umstellung.
 */
function formatDay(day: string): string {
  const parts = day.split('-')
  if (parts.length !== 3) return day
  const [year, month, dayOfMonth] = parts
  return `${dayOfMonth}.${month}.${year}`
}

const dayLabel = computed(() => formatDay(props.event.day))

// Deutsch beugt den Plural, also braucht es zwei Saetze statt eines mit
// eingesetzter Zahl - dieselbe Entscheidung wie bei addedOne/addedMany im
// Katalog.
const actionText = computed(() =>
  props.event.items.length === 1 ? t.profile.feedAddedOne : t.profile.feedAddedMany,
)
</script>

<template>
  <article
    data-event
    :aria-label="t.profile.feedEventLabel"
    class="flex flex-col gap-[.6rem] rounded-card bg-surface p-4"
  >
    <p class="flex flex-wrap items-baseline gap-x-[.35rem] text-[.875rem] text-muted">
      <span class="display text-[.9375rem] font-semibold text-ink">{{ displayName }}</span>
      <span>{{ actionText }}</span>
      <!-- datetime traegt den unveraenderten ISO-Tag: die sichtbare
           Schreibweise ist fuer Menschen, das Attribut fuer Maschinen. -->
      <time :datetime="event.day" class="font-mono text-xs tabular-nums">{{ dayLabel }}</time>
    </p>

    <ul class="flex list-none flex-col p-0">
      <li v-for="item in event.items" :key="item.id" class="flex items-baseline gap-[.45rem] py-[.15rem]">
        <NuxtLink
          data-device
          :to="`/gear/${item.slug}`"
          class="border-b border-transparent text-[.9rem] leading-snug no-underline hover:border-current hover:text-accent"
          :class="rarityNameClass(item.rarity)"
        >
          {{ item.label }}
        </NuxtLink>
        <span v-if="item.detail" class="font-mono text-xs tabular-nums text-muted">{{ item.detail }}</span>
      </li>
    </ul>

    <!-- Der Hinweis erscheint nur, wenn wirklich etwas Ausgezeichnetes dabei
         ist. Stuende er immer da, saehe ein Allerweltspedal aus wie ein
         Fund - und dann sagt die Auszeichnung nichts mehr. -->
    <p
      v-if="event.hasRarity"
      data-rarity-hint
      class="flex flex-wrap items-baseline gap-x-2 rounded-card border-l-2 border-rare bg-rare-wash px-3 py-[.4rem] text-[.8125rem] text-ink"
    >
      <span class="font-mono text-[.6875rem] uppercase tracking-[.1em] text-rare">{{ t.profile.feedRareTitle }}</span>
      <span>{{ t.profile.feedRareHint }}</span>
    </p>
  </article>
</template>
