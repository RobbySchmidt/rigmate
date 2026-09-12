<script setup lang="ts">
// Der gemeinsame Kopf ueber beiden Spalten der Profilseite. Diese
// Komponente holt keine Daten und haelt keinen Zustand - alles kommt als
// Prop, genau wie bei GearPanel.vue.
//
// "computed" wird explizit importiert statt auf Nuxts Auto-Import zu
// vertrauen: der Komponententest mountet diese Datei ueber
// @vue/test-utils direkt, also ausserhalb der Nuxt-Build-Pipeline.
import { computed } from 'vue'

/**
 * Ein Eintrag aus `profiles.links` - Bandcamp, YouTube und dergleichen.
 * Die Spalte ist jsonb, die Seite typisiert sie einmal und gibt sie hier
 * herein, statt im Template zu casten.
 */
export interface ProfileLink {
  label: string
  url: string
}

const props = withDefaults(
  defineProps<{
    /** Das Einzige, was Pflicht ist - siehe settings.displayNameHint. */
    displayName: string
    realName?: string | null
    bio?: string | null
    bands?: string[]
    /**
     * Die Links aus dem Profil. Sie standen schon vor dem Umbau im Kopf und
     * bleiben dort: der Plan zu diesem Task hatte keine Prop dafuer
     * vorgesehen, und sie waeren beim Zusammenbauen stillschweigend
     * verschwunden - ein Rueckschritt gegenueber der alten Seite.
     */
    links?: ProfileLink[]
    /** Fertige oeffentliche URL. Den Storage-Pfad loest die Seite auf. */
    avatarUrl?: string | null
    deviceCount: number
    rarityCount: number
    specialCount: number
    /**
     * Zahl der Rig-Kollegen. `null` heisst "noch nicht bekannt", NICHT
     * "keine" - eine Null waere eine Behauptung ueber Daten, die nie
     * angekommen sind.
     */
    mateCount: number | null
    /**
     * Die Abfrage ist gescheitert. Bewusst getrennt von mateCount, denn
     * null Rig-Kollegen ist ein echtes Ergebnis: wer lauter Raritaeten
     * spielt, steht auch mal allein da (Roehrenglut Ruediger in den
     * Demo-Daten). Ohne diese Trennung saehe ein kaputter Request aus wie
     * ein ehrliches Ergebnis - der wiederkehrende Fehler dieses Projekts.
     */
    mateCountFailed?: boolean
    isOwn?: boolean
  }>(),
  {
    realName: null,
    bio: null,
    bands: () => [],
    links: () => [],
    avatarUrl: null,
    mateCountFailed: false,
    isOwn: false,
  },
)

const t = useText()

// Bernstein (text-rare) gehoert der Seltenheit und kommt hier nicht in
// Frage - fuer Fehler gibt es text-danger. Die Klasse steht an dieser
// einen Stelle statt mehrfach im Template - dasselbe Vorgehen wie in
// GearPanel.vue.
const dangerClass = 'text-danger'

// Drei Zustaende statt zwei, und der Fehler gewinnt: liegt das Flag an,
// zaehlt eine mitgelieferte Zahl nicht mehr. Sonst koennte ein Aufrufer
// mit einem Vorgabewert (0) den Fehlschlag versehentlich zudecken.
type MateState = 'error' | 'pending' | 'ready'

const mateState = computed<MateState>(() => {
  if (props.mateCountFailed) return 'error'
  if (props.mateCount === null) return 'pending'
  return 'ready'
})

// Das Fragezeichen steht fuer den Fehlschlag, der Halbgeviertstrich fuer
// "noch nichts da". Beide sind von einer Ziffer auf einen Blick
// unterscheidbar; den Satz dazu tragen title und die Vorlesehilfe.
const mateValue = computed(() => {
  if (mateState.value === 'error') return '?'
  if (mateState.value === 'pending') return '–'
  return String(props.mateCount)
})

// Initialen als Rueckfallebene, wenn niemand ein Foto hochgeladen hat.
// Array.from statt [0], damit ein Name, der mit einem Emoji oder einem
// Zeichen ausserhalb der Basic Multilingual Plane anfaengt, nicht als
// halbes Surrogatpaar herauskommt.
const initials = computed(() => {
  const words = props.displayName.trim().split(/\s+/).filter(Boolean)
  return words
    .slice(0, 2)
    .map((word) => Array.from(word)[0] ?? '')
    .join('')
    .toUpperCase()
})

const bandList = computed(() => props.bands.join(' · '))

// flex-col-reverse statt dd-vor-dt im Markup: in einer Definitionsliste muss
// der Begriff vor der Beschreibung stehen, gelesen werden soll aber die Zahl
// zuerst. Das ist genau der Fall, fuer den die Reihenfolge ins CSS gehoert.
const statClass =
  'flex flex-col-reverse gap-[.15rem] font-mono text-[.6875rem] uppercase tracking-[.1em] text-muted'

const actionClass =
  'rounded-btn bg-surface-2 px-3 py-[.35rem] font-mono text-[.6875rem] uppercase tracking-[.1em] transition-colors'
</script>

<template>
  <header class="flex flex-col gap-f-6 rounded-card bg-surface p-f-6">
    <div class="flex flex-wrap items-start gap-5">
      <img
        v-if="avatarUrl"
        :src="avatarUrl"
        :alt="displayName"
        class="size-20 shrink-0 rounded-full object-cover"
      />
      <span
        v-else
        data-initials
        aria-hidden="true"
        class="grid size-20 shrink-0 place-items-center rounded-full bg-accent-wash display text-f-2xl font-semibold text-accent"
      >
        {{ initials }}
      </span>

      <!-- basis statt flex-1: mit flex-basis 0 blieben Name, Bio und Links
           auf einem schmalen Schirm neben Avatar UND Aktionen stehen und
           quetschten sich in gut hundert Pixel - die Bio brach dann auf
           sieben Zeilen um (im Browser bei 420px nachgesehen). Mit einer
           echten Wunschbreite rutschen die Aktionen stattdessen in die
           naechste Zeile. -->
      <div class="flex min-w-0 shrink grow basis-[16rem] flex-col gap-[.35rem]">
        <h1 class="display text-f-4xl font-semibold leading-tight text-ink">{{ displayName }}</h1>
        <p v-if="realName" class="text-sm text-muted">{{ realName }}</p>
        <p v-if="bio" class="max-w-[60ch] text-[.9375rem] leading-relaxed text-ink">{{ bio }}</p>
        <p v-if="bands.length > 0" class="flex flex-wrap items-baseline gap-2 text-[.875rem] text-ink">
          <span class="font-mono text-[.6875rem] uppercase tracking-[.1em] text-muted">{{ t.profile.bands }}</span>
          <span>{{ bandList }}</span>
        </p>

        <!-- Dieselbe Zeilenform wie die Bands darueber: Versal-Label, dann
             der Inhalt. Die Links fuehren nach draussen und tragen deshalb
             rel="noopener noreferrer" - wie in der alten Fassung. -->
        <p v-if="links.length > 0" data-links class="flex flex-wrap items-baseline gap-2 text-[.875rem]">
          <span class="font-mono text-[.6875rem] uppercase tracking-[.1em] text-muted">{{ t.profile.links }}</span>
          <a
            v-for="link in links"
            :key="link.url"
            :href="link.url"
            target="_blank"
            rel="noopener noreferrer"
            class="border-b border-line text-ink no-underline transition-colors hover:border-accent hover:text-accent"
          >{{ link.label }}</a>
        </p>
      </div>

      <!-- Folgen und Nachricht gehoeren Stufe 2, stehen aber jetzt schon da
           und deaktiviert: sie spaeter einzublenden hiesse, den Kopf zweimal
           zu entwerfen. Auf dem eigenen Profil ergeben sie keinen Sinn -
           dort fuehrt stattdessen ein Link in die Einstellungen. -->
      <div class="flex shrink-0 flex-wrap items-center gap-2">
        <NuxtLink
          v-if="isOwn"
          data-action="edit"
          to="/settings"
          class="text-ink no-underline outline-none hover:text-accent focus-visible:ring-2 focus-visible:ring-accent"
          :class="actionClass"
        >
          {{ t.profile.editCta }}
        </NuxtLink>
        <template v-else>
          <button
            data-action="follow"
            type="button"
            disabled
            :title="t.profile.stageTwoHint"
            class="cursor-not-allowed text-muted opacity-60"
            :class="actionClass"
          >
            {{ t.profile.follow }}
          </button>
          <button
            data-action="message"
            type="button"
            disabled
            :title="t.profile.stageTwoHint"
            class="cursor-not-allowed text-muted opacity-60"
            :class="actionClass"
          >
            {{ t.profile.message }}
          </button>
        </template>
      </div>
    </div>

    <dl class="flex flex-wrap gap-x-8 gap-y-3">
      <div data-stat="devices" :class="statClass">
        <dt data-label>{{ t.profile.statDevices }}</dt>
        <dd data-value class="display text-f-2xl font-semibold text-ink">{{ deviceCount }}</dd>
      </div>
      <div data-stat="rarities" :class="statClass">
        <dt data-label>{{ t.profile.statRarities }}</dt>
        <dd data-value class="display text-f-2xl font-semibold text-rare">{{ rarityCount }}</dd>
      </div>
      <div data-stat="specials" :class="statClass">
        <dt data-label>{{ t.profile.statSpecials }}</dt>
        <dd data-value class="display text-f-2xl font-semibold text-special">{{ specialCount }}</dd>
      </div>
      <div
        data-stat="mates"
        :data-state="mateState"
        :title="mateState === 'error' ? t.profile.statMatesError : undefined"
        :class="statClass"
      >
        <dt data-label>{{ t.profile.statMates }}</dt>
        <dd
          data-value
          class="display text-f-2xl font-semibold"
          :class="mateState === 'error' ? dangerClass : 'text-ink'"
        >
          {{ mateValue }}
        </dd>
        <!-- title erreicht nur die Maus. Der Satz muss auch angesagt
             werden, sonst bleibt vom Fehlschlag ein blosses Fragezeichen. -->
        <dd v-if="mateState === 'error'" class="sr-only">{{ t.profile.statMatesError }}</dd>
      </div>
    </dl>
  </header>
</template>
