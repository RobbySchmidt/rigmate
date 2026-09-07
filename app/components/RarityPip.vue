<script setup lang="ts">
// "computed" wird hier explizit importiert statt auf Nuxts Auto-Import zu
// vertrauen: Komponententests (siehe tests/component/rarityPip.test.ts)
// mounten diese Datei ueber @vue/test-utils direkt, also ausserhalb der
// Nuxt-Build-Pipeline - dort gibt es keine Auto-Imports. Im echten Betrieb
// unter Nuxt ist der explizite Import unschaedlich, Nuxt entschaerft
// doppelte Imports selbst.
import { computed } from 'vue'
import type { RarityBase } from '#shared/utils/rarityBase'
import { rarityPipClass } from '#shared/utils/rarityStyle'

const props = defineProps<{ rarity: RarityBase | null }>()

const pipClass = computed(() => rarityPipClass(props.rarity))

// Kein vertikaler Versatz im Template, und das mit Absicht: die Komponente
// beschreibt nur, WAS sie ist (ein Punkt in einer bestimmten Farbe), nicht
// WO sie sitzt. Ausgerichtet wird er vom Flex-Container, in dem er steht -
// "items-baseline" in einer Liste, "items-center" in einer Legende. Hier
// stand einmal ein festes "mt-[.45rem]": in der Legende sass der Punkt
// dadurch 3,59px zu tief und blies die Zeile von 13,00px auf 17,19px auf,
// in der Liste verschob es ihn um 0,00px und kostete nur Zeilenhoehe (im
// Browser nachgemessen). Es half also nirgends.
// Wer trotzdem ausrichten muss, gibt den Versatz an der Aufrufstelle mit:
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
