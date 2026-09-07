<script setup lang="ts">
// "computed" wird hier explizit importiert statt auf Nuxts Auto-Import zu
// vertrauen: der Komponententest mountet diese Datei ueber @vue/test-utils
// direkt, also ausserhalb der Nuxt-Build-Pipeline. RarityPip dagegen kommt
// aus app/components/ und wird von Nuxt automatisch aufgeloest - genauso wie
// PersonSuggestion in app/pages/index.vue.
import { computed } from 'vue'
import type { RarityBase } from '#shared/utils/rarityBase'

export interface GearListEntry {
  id: string
  slug: string
  label: string
  detail: string | null
  rarity: RarityBase | null
}

export interface GearListGroup {
  key: string
  label: string
  entries: GearListEntry[]
}

// Die Gruppen kommen fertig von aussen: diese Komponente holt keine Daten
// und uebersetzt keine Kategorienamen.
const props = defineProps<{ groups: GearListGroup[] }>()

const t = useText()

// Kategorien sind Trennlinien, keine Kaesten. Bei vier Geraeten ist das
// gleichgueltig, bei vierzig entscheidet es darueber, ob das Panel noch
// lesbar ist. Eine Gruppe ohne Eintraege waere eine leere Ueberschrift -
// die faellt hier raus statt im Template versteckt zu werden.
const filled = computed(() => props.groups.filter((group) => group.entries.length > 0))

// Eine Legende, die nichts erklaert, ist Rauschen: sie erscheint nur, wenn
// in der Liste ueberhaupt etwas Ausgezeichnetes steht.
const hasMarked = computed(() =>
  filled.value.some((group) =>
    group.entries.some((entry) => entry.rarity === 'rare' || entry.rarity === 'special'),
  ),
)

function nameClass(rarity: RarityBase | null): string {
  if (rarity === 'rare') return 'text-rare font-medium'
  if (rarity === 'special') return 'text-special'
  return 'text-ink'
}
</script>

<template>
  <div class="flex flex-col gap-[1.15rem]">
    <div v-for="group in filled" :key="group.key" class="flex flex-col gap-1">
      <div
        class="flex items-baseline justify-between border-b border-line-soft pb-1 font-mono text-[.6875rem] uppercase tracking-[.1em] text-muted"
      >
        <span>{{ group.label }}</span>
        <span class="tabular-nums opacity-70">{{ group.entries.length }}</span>
      </div>
      <ul class="flex list-none flex-col p-0">
        <li v-for="entry in group.entries" :key="entry.id" class="flex items-baseline gap-[.45rem] py-[.28rem]">
          <!--
            Bewusst ohne "mt-*": das "items-baseline" der Zeile richtet einen
            textlosen Kasten an seiner unteren Margin-Kante aus, ein
            margin-top verschiebt den Punkt daran um exakt 0,00px und treibt
            nur die Zeilenhoehe um 2,19px hoch (im Browser nachgemessen) -
            bei 40 Geraeten knapp 90px umsonst.
          -->
          <RarityPip :rarity="entry.rarity" />
          <NuxtLink
            :to="`/gear/${entry.slug}`"
            class="border-b border-transparent text-[.9rem] leading-snug no-underline hover:border-current hover:text-accent"
            :class="nameClass(entry.rarity)"
          >
            {{ entry.label }}
          </NuxtLink>
          <span v-if="entry.detail" class="font-mono text-xs tabular-nums text-muted">{{ entry.detail }}</span>
        </li>
      </ul>
    </div>

    <div
      v-if="hasMarked"
      class="flex flex-wrap gap-3 border-t border-line-soft pt-[.9rem] font-mono text-[.6875rem] text-muted"
    >
      <span class="inline-flex items-center gap-[.3rem]">
        <RarityPip rarity="rare" /> {{ t.rarity.rare }}
      </span>
      <span class="inline-flex items-center gap-[.3rem]">
        <RarityPip rarity="special" /> {{ t.rarity.special }}
      </span>
    </div>
  </div>
</template>
