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

// Kein vertikaler Versatz im Template, und das mit Absicht: die Komponente
// beschreibt nur, WAS sie ist (ein Punkt in einer bestimmten Farbe), nicht
// WO sie sitzt. Der noetige Versatz haengt am Kontext - in einer Liste an
// "items-baseline" braucht der Punkt einen anderen als in einer Legende an
// "items-center", wo die Ausrichtung schon der Flex-Container erledigt.
// Stand hier ein festes "mt-[.45rem]", sass der Punkt in der Legende zu
// tief und trieb ueber seine Margin-Box zusaetzlich die Zeilenhoehe hoch.
// Wer ausrichten will, gibt den Versatz an der Aufrufstelle mit -
// ein dort gesetztes class-Attribut reicht Vue ans Wurzelelement durch und
// ERGAENZT die eigenen Klassen, statt sie zu ersetzen (abgesichert in
// tests/component/rarityPip.test.ts). Achtung: das gilt nur, solange das
// Template genau EINEN Wurzelknoten hat - schon ein Kommentar daneben macht
// daraus ein Fragment und kippt den Durchreichmechanismus.
</script>

<template>
  <span
    class="block size-2 shrink-0 rounded-full border-[1.5px] border-transparent"
    :class="pipClass"
    aria-hidden="true"
  />
</template>
