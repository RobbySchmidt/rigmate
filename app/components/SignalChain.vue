<script setup lang="ts">
import type { RarityBase } from '#shared/utils/rarityBase'

export interface ChainStation {
  id: string
  slug: string
  category: string
  label: string
  detail: string | null
  rarity: RarityBase | null
}

defineProps<{ stations: ChainStation[]; isOwn: boolean }>()

const t = useText()

// Dieselbe Sprache wie die Punkte im Equipment-Reiter: gefuellt bei rare,
// hohl bei special. Zwischen den Ansichten muss niemand umlernen.
function nodeClass(rarity: RarityBase | null): string {
  if (rarity === 'rare') return 'bg-rare border-rare'
  if (rarity === 'special') return 'border-special'
  return 'bg-surface border-line'
}

function nameClass(rarity: RarityBase | null): string {
  if (rarity === 'rare') return 'text-rare'
  if (rarity === 'special') return 'text-special'
  return 'text-ink'
}
</script>

<template>
  <div v-if="stations.length > 0" class="flex flex-col">
    <template v-for="(station, index) in stations" :key="station.id">
      <div class="grid grid-cols-[1.1rem_1fr] gap-x-[.6rem]">
        <!-- Der Strang links laeuft durch: Stueck ueber dem Knoten, Knoten,
             Stueck darunter bis zum Patchkabel. Ohne diese beiden Stuecke
             haengen die Knoten in der Luft, weil das Kabel nur den schmalen
             Abstand zwischen zwei Zeilen ueberbrueckt, der Textblock einer
             Station aber deutlich hoeher ist. Erstes und letztes Stueck
             fehlen mit Absicht - ein Strang, der oben oder unten ins Nichts
             laeuft, liest sich wie ein abgerissenes Kabel. -->
        <div class="flex flex-col items-center">
          <span class="h-[.42rem] w-px" :class="index > 0 ? 'bg-line' : 'bg-transparent'" />
          <span class="size-[.6rem] shrink-0 rounded-full border-[1.5px]" :class="nodeClass(station.rarity)" />
          <span v-if="index < stations.length - 1" class="w-px flex-1 bg-line" />
        </div>
        <div class="min-w-0">
          <span class="block font-mono text-[.625rem] uppercase leading-relaxed tracking-[.11em] text-muted">
            {{ station.category }}
          </span>
          <NuxtLink
            :to="`/gear/${station.slug}`"
            class="inline-block border-b border-transparent font-display text-[.9375rem] font-semibold leading-tight no-underline hover:border-current hover:text-accent"
            :class="nameClass(station.rarity)"
          >
            {{ station.label }}
          </NuxtLink>
          <span v-if="station.detail" class="block font-mono text-xs tabular-nums text-muted">
            {{ station.detail }}
          </span>
        </div>
      </div>

      <!-- Patchkabel, mittig zwischen zwei Stationen und buendig ueber dem
           Strang - deshalb dasselbe Spaltenraster wie die Station darueber,
           statt einer eigenen Zentrierung, die sich beim naechsten
           Layoutwechsel vom Knoten wegschiebt. Nie hinter der letzten
           Station: ein Kabel ins Nichts liest sich als fehlendes Glied. -->
      <div
        v-if="index < stations.length - 1"
        data-cable
        class="grid grid-cols-[1.1rem_1fr] gap-x-[.6rem]"
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
    </template>

    <!-- Ohne diesen Hinweis wirkt der Reiter, als haette er Geraete
         verschluckt: Saiten und Zubehoer haben im Signalweg keinen Platz. -->
    <div class="mt-4 border-t border-line-soft pt-[.9rem] text-[.8125rem] text-muted">
      <span class="mb-1 block font-mono text-[.6875rem] uppercase tracking-[.1em]">
        {{ t.profile.chainOutsideTitle }}
      </span>
      {{ t.profile.chainOutsideHint }}
    </div>
  </div>

  <!-- Auf dem eigenen Profil ist die leere Kette eine Einladung. Auf einem
       fremden waere sie eine Sackgasse, deshalb dort gar nichts. -->
  <div
    v-else-if="isOwn"
    class="rounded-sm border border-dashed border-line px-4 py-[1.1rem] text-center text-sm text-muted"
  >
    <b class="mb-1 block font-display text-[.9375rem] text-ink">{{ t.profile.chainEmptyOwn }}</b>
    {{ t.profile.chainEmptyOwnHint }}
  </div>
</template>
