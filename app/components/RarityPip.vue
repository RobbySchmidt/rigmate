<script setup lang="ts">
// "computed" wird hier explizit importiert statt auf Nuxts Auto-Import zu
// vertrauen: Komponententests (siehe tests/component/rarityPip.test.ts)
// mounten diese Datei ueber @vue/test-utils direkt, also ausserhalb der
// Nuxt-Build-Pipeline - dort gibt es keine Auto-Imports. Im echten Betrieb
// unter Nuxt ist der explizite Import unschaedlich, Nuxt entschaerft
// doppelte Imports selbst.
import { computed } from 'vue'
import type { RarityBase } from '#shared/utils/rarityBase'

// Nur zwei der vier Stufen bekommen eine Auszeichnung. Leuchten alle vier,
// sagt die Auszeichnung nichts mehr - "mass" und "common" bleiben still.
const props = defineProps<{ rarity: RarityBase | null }>()

const pipClass = computed(() => {
  if (props.rarity === 'rare') return 'bg-rare border-rare'
  if (props.rarity === 'special') return 'border-special'
  return 'bg-line opacity-55'
})
</script>

<template>
  <span
    class="mt-[.45rem] block size-2 shrink-0 rounded-full border-[1.5px] border-transparent"
    :class="pipClass"
    aria-hidden="true"
  />
</template>
