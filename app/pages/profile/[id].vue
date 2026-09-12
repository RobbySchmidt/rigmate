<script setup lang="ts">
// Die Profilseite: gemeinsamer Kopf, darunter zwei Spalten. Links das
// Equipment-Panel (Liste und Signalkette), rechts der Feed - und im
// Bearbeitungsmodus statt des Feeds die Geraeteliste, aus der man Stationen
// in die Kette zieht (Abschnitt 4 und 5.4 der Profil-Spec).
//
// Diese Seite haelt die Daten und den Zustand; die Komponenten darunter
// halten beides nicht. Jede Aenderung an der Kette kommt als Ereignis hier
// an, wird hier uebernommen und von hier geschrieben.
import { buildRigEvents, type RigEventSource } from '#shared/utils/rigEvents'
import type { GearListGroup } from '../../components/GearList.vue'
import type { ChainStation } from '../../components/SignalChain.vue'
import type { ProfileLink } from '../../components/ProfileHeader.vue'

// Abschnitt 10 der Hauptspec: Profile nur mit Login (siehe RLS-Policy in
// supabase/migrations/20260906115314_profiles.sql). Kein Schaufenster wie
// bei gear/[slug].vue - anders als der Katalog ist eine Person hier kein
// oeffentliches Aushaengeschild.
definePageMeta({ middleware: 'auth' })

const t = useText()
const route = useRoute()
const supabase = useSupabaseClient()
// useSupabaseUser() liefert die JWT-Claims, nicht ein User-Objekt - die Id
// steckt unter "sub". useUserId() normalisiert das (siehe dortiger
// Kommentar). Ein direkter Vergleich gegen user.value.id waere hier immer
// falsch und wuerde den Bearbeiten-Modus nie im eigenen Profil zeigen.
const userId = useUserId()

const id = computed(() => String(route.params.id))
const isOwn = computed(() => userId.value !== null && userId.value === id.value)

// Jeder Lesezugriff bekommt sein eigenes Fehler-Flag. Eine leere Liste
// (kein Equipment, keine Wunschliste, keine Kette) ist ein legitimer
// Zustand - ein fehlgeschlagener Request ist keiner, und beides sah in
// einer frueheren Fassung dieser Seite identisch aus (verworfenes
// `{ error }`). Abschnitt 7 der Profil-Spec zaehlt die Paare auf, die sich
// aehneln und verschieden sind.
const profileError = ref(false)
const rigError = ref(false)
const wishlistError = ref(false)
const preferencesError = ref(false)
const mateCountFailed = ref(false)

const { data: profile } = await useAsyncData(`profile-${id.value}`, async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, real_name, bio, avatar_path, bands, links')
    .eq('id', id.value)
    .maybeSingle()
  if (error) profileError.value = true
  return data
})

// chain_position traegt die Signalkette, created_at den Feed und
// rarity_base die Seltenheitsfarben - ohne diese drei Spalten funktioniert
// von der neuen Seite drei Viertel nicht.
const { data: rig } = await useAsyncData(`profile-rig-${id.value}`, async () => {
  const { data, error } = await supabase
    .from('gear_items')
    .select(
      'id, year, finish, modifications, chain_position, created_at, catalog_items ( slug, name, category_id, rarity_base, brands ( name ) )',
    )
    .eq('owner_id', id.value)
    .order('created_at')
  if (error) {
    rigError.value = true
    return []
  }
  return data ?? []
})

const { data: wishlist } = await useAsyncData(`profile-wishlist-${id.value}`, async () => {
  const { data, error } = await supabase
    .from('wishlist_items')
    .select('id, note, catalog_items ( slug, name, brands ( name ) )')
    .eq('user_id', id.value)
  if (error) {
    wishlistError.value = true
    return []
  }
  return data ?? []
})

const { data: preferences } = await useAsyncData(`profile-preferences-${id.value}`, async () => {
  const { data, error } = await supabase
    .from('preferences')
    .select('id, catalog_items ( slug, name, brands ( name ) )')
    .eq('user_id', id.value)
  if (error) {
    preferencesError.value = true
    return []
  }
  return data ?? []
})

// useRequestFetch() statt eines blanken $fetch: waehrend des SSR haengt
// /api/profile/<id>/mates an requireUserId(), und ein blankes $fetch nimmt
// die Cookies des eingehenden Requests NICHT mit - der Aufruf liefe
// serverseitig in eine 401, der Kopf zeigte dauerhaft "?" und nichts waere
// tatsaechlich kaputt. Im Browser ist useRequestFetch() das gewoehnliche
// $fetch.
const requestFetch = useRequestFetch()

// Eigenes Flag, weil eine fehlgeschlagene Abfrage anders aussehen muss als
// die ehrliche Null. Bei Roehrenglut Ruediger ist 0 das echte Ergebnis -
// wer lauter Raritaeten spielt, steht auch mal allein da.
const { data: mates } = await useAsyncData(`profile-mates-${id.value}`, async () => {
  try {
    return await requestFetch<{ mateCount: number }>(`/api/profile/${id.value}/mates`)
  } catch {
    mateCountFailed.value = true
    return null
  }
})

// jsonb kommt als plain array/object zurueck - hier einmal typisiert statt
// an jeder Stelle im Template neu zu casten.
const links = computed<ProfileLink[]>(() => ((profile.value?.links as ProfileLink[] | null) ?? []))

const avatarUrl = computed(() => {
  const path = profile.value?.avatar_path
  if (!path) return null
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
})

function labelOf(row: any): string {
  return `${row.catalog_items.brands.name} ${row.catalog_items.name}`
}

// Baujahr und Finish - so verlangt es Abschnitt 4.2/4.3 der Profil-Spec fuer
// die Equipment-Liste und die Kette, und so passt es auch in die 15,5rem
// schmale linke Spalte. Mit den Modifikationen dahinter (erste Fassung
// dieses Umbaus, im Browser nachgesehen) brach der Geraetename dort auf drei
// Zeilen um.
function detailOf(row: any): string | null {
  return [row.year, row.finish].filter(Boolean).join(' · ') || null
}

// Im Verlauf ist Platz, deshalb stehen die Modifikationen dort - die alte
// Seite zeigte sie, und sie ganz wegzulassen waere ein stiller Verlust.
function feedDetailOf(row: any): string | null {
  return [row.year, row.finish, row.modifications].filter(Boolean).join(' · ') || null
}

function categoryLabel(categoryId: string): string {
  return (t.categories as Record<string, string>)[categoryId] ?? categoryId
}

function toStation(row: any): ChainStation {
  return {
    id: row.id,
    slug: row.catalog_items.slug,
    category: categoryLabel(row.catalog_items.category_id),
    label: labelOf(row),
    detail: detailOf(row),
    rarity: row.catalog_items.rarity_base ?? null,
  }
}

// Kategorien werden zu Gruppen. Danach haengen Saiten/Plektren und die
// Wunschliste als eigene Gruppen an.
//
// ABWEICHUNG VON ABSCHNITT 4.2 DER PROFIL-SPEC, bewusst und mit Grund: die
// Spec will Praeferenzen als Markierung am vorhandenen Eintrag statt als
// eigene Gruppe, weil sie "auf dieselben Katalogeintraege verweisen und sich
// sonst verdoppeln" wuerden. Das trifft nicht zu - der Trigger
// enforce_gear_item_rules() in supabase/migrations/20260906125245_rig.sql
// verbietet Verbrauchsmaterial in gear_items und Nicht-Verbrauchsmaterial in
// preferences. Die beiden Mengen sind disjunkt, es gibt also gar keinen
// Eintrag, an den man etwas markieren koennte. Ohne eigene Gruppe waeren die
// Saiten und Plektren beim Umbau kommentarlos von der Seite verschwunden.
// Gehoert ins Spec-Review von Robby.
const gearGroups = computed<GearListGroup[]>(() => {
  const byCategory = new Map<string, GearListGroup>()
  for (const row of (rig.value ?? []) as any[]) {
    const key = row.catalog_items.category_id
    const group = byCategory.get(key) ?? { key, label: categoryLabel(key), entries: [] }
    group.entries.push({
      id: row.id,
      slug: row.catalog_items.slug,
      label: labelOf(row),
      detail: detailOf(row),
      rarity: row.catalog_items.rarity_base ?? null,
    })
    byCategory.set(key, group)
  }

  const groups = [...byCategory.values()]

  if ((preferences.value ?? []).length > 0) {
    groups.push({
      key: 'preferences',
      label: t.profile.preferences,
      entries: ((preferences.value ?? []) as any[]).map((row) => ({
        id: row.id,
        slug: row.catalog_items.slug,
        label: labelOf(row),
        detail: null,
        rarity: null,
      })),
    })
  }

  if ((wishlist.value ?? []).length > 0) {
    groups.push({
      key: 'wishlist',
      label: t.profile.wishlist,
      entries: ((wishlist.value ?? []) as any[]).map((row) => ({
        id: row.id,
        slug: row.catalog_items.slug,
        label: labelOf(row),
        detail: row.note ?? null,
        rarity: null,
      })),
    })
  }

  return groups
})

// Die Kette ist der einzige Zustand, den diese Seite wirklich haelt: sie
// wird sofort angezeigt und im Hintergrund geschrieben. Deshalb ein ref und
// kein computed - und deshalb einmalig aus dem geladenen Rig aufgebaut, denn
// setup() hat die vier useAsyncData() oben bereits abgewartet.
const stations = ref<ChainStation[]>(
  ((rig.value ?? []) as any[])
    .filter((row) => row.chain_position !== null)
    .sort((a, b) => a.chain_position - b.chain_position)
    .map(toStation),
)

// Nur die Anzeigereihenfolge im Pool, nichts weiter. Sie bedeutet nichts und
// wird nirgends gespeichert - aber ohne sie spraenge eine Verschiebung
// innerhalb des Pools sofort zurueck und saehe aus wie ein Defekt.
const poolOrder = ref<string[]>([])

// Der Pool ist ABGELEITET, nicht gehalten: alles im Rig, was keine Station
// ist. Damit koennen Kette und Pool gar nicht auseinanderlaufen, und "aus
// der Kette nehmen" braucht keinen eigenen Schritt - das Geraet taucht hier
// von selbst wieder auf, sobald es aus stations verschwindet.
const poolItems = computed<ChainStation[]>(() => {
  const inChain = new Set(stations.value.map((station) => station.id))
  const rank = new Map(poolOrder.value.map((poolId, index) => [poolId, index]))
  return ((rig.value ?? []) as any[])
    .filter((row) => !inChain.has(row.id))
    .map(toStation)
    .sort((a, b) => (rank.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.id) ?? Number.MAX_SAFE_INTEGER))
})

// Schreibt gebuendelt und macht den Ausgang sichtbar - beides erledigt das
// Composable. status und lastError werden hier destrukturiert, damit das
// Template sie ohne .value liest (nur direkt aus setup() zurueckgegebene
// Refs entpackt Vue automatisch).
const { status: chainStatus, lastError: chainError, save: saveChain, retry: retryChain } = useChainOrder(supabase)

function applyChain(next: ChainStation[]): void {
  stations.value = next
  saveChain(next.map((station) => station.id))
}

function appendToChain(gearId: string): void {
  const row = poolItems.value.find((item) => item.id === gearId)
  if (!row) return
  applyChain([...stations.value, row])
}

function reorderPool(next: ChainStation[]): void {
  poolOrder.value = next.map((item) => item.id)
}

// "Aus der Kette genommen" ist kein Loeschen: das Geraet steht danach wieder
// im Pool. Der Hinweis sagt das, weil ein "X" sonst nach Loeschen aussieht -
// und Loeschen waere hier ein teurer Irrtum. Das Zurueckschieben selbst
// passiert von allein, weil poolItems abgeleitet ist; dieses Ereignis
// traegt nur den Satz.
const removedHint = ref(false)

// Ist die Kette leer, gibt es nichts anzusehen - dann steht die
// Geraeteliste sofort rechts (Abschnitt 5.4), der Umweg ueber einen Knopf
// waere Schikane.
//
// Bewusst EINMALIG beim Aufbau der Seite und NICHT als watchEffect: der
// wuerde bei jedem Leerwerden erneut zuschlagen, "Fertig" sofort wieder
// aufheben - und man kaeme aus der Bearbeitung nicht mehr heraus.
//
// Zwei Bedingungen ueber die Spec hinaus: bei einem Ladefehler zeigt das
// Panel ohnehin den Fehler statt einer Kette, und wer noch gar kein
// Equipment eingetragen hat, bekaeme einen Pool, der "Alle Geraete stehen in
// der Kette" behauptet - eine Aussage ueber Geraete, die es nicht gibt.
const editing = ref(
  isOwn.value && !rigError.value && (rig.value ?? []).length > 0 && stations.value.length === 0,
)

function stopEditing(): void {
  editing.value = false
  removedHint.value = false
}

const rigEvents = computed(() =>
  buildRigEvents(
    ((rig.value ?? []) as any[]).map(
      (row): RigEventSource => ({
        id: row.id,
        label: labelOf(row),
        slug: row.catalog_items.slug,
        detail: feedDetailOf(row),
        rarity: row.catalog_items.rarity_base ?? null,
        createdAt: row.created_at,
      }),
    ),
  ),
)

const rarityCount = computed(
  () => ((rig.value ?? []) as any[]).filter((row) => row.catalog_items.rarity_base === 'rare').length,
)
const specialCount = computed(
  () => ((rig.value ?? []) as any[]).filter((row) => row.catalog_items.rarity_base === 'special').length,
)

// Bernstein (text-rare) gehoert der Seltenheit und kommt hier nicht in
// Frage - fuer Fehler gibt es text-danger. Die Klasse steht an dieser
// einen Stelle statt viermal im Template - dasselbe Vorgehen wie in
// GearPanel.vue und ProfileHeader.vue.
const dangerClass = 'text-danger'

// Kein Kartenrahmen um die Feed-Liste: jeder FeedItem-Eintrag ist bereits
// selbst eine Karte (bg-surface, siehe FeedItem.vue). Eine zweite Karte
// darum waere dieselbe Flaeche in derselben Flaeche - eine Ebene zu viel.
// Der Abstand zwischen den Karten steht deshalb hier, nicht die Flaeche.
const feedListClass = 'flex flex-col gap-2'

// Das <h2> ueber der Feed-Liste ("Verlauf") traegt bewusst KEIN display:
// font-mono uppercase tracking-[.1em] text-muted bei 11px ist nach Spec
// §3.5 die Daten-Rolle (Versal-Label), nicht die Display-Rolle. Das Tag
// ist <h2> aus Dokumentstruktur-Gruenden, nicht weil es gestalterisch eine
// Ueberschrift waere. display wuerde hier ausserdem toten Code erzeugen:
// .display steht im gebauten CSS vor .font-mono, bei gleicher Spezifitaet
// gewinnt also font-mono und die font-family aus display liefe ins Leere -
// uebrig bliebe nur ein letter-spacing, das gegen das absichtliche
// tracking-[.1em] arbeitet, und ein font-variation-settings auf einer
// Schrift ohne Breitenachse.
</script>

<template>
  <div v-if="profile" class="flex flex-col gap-f-8">
    <ProfileHeader
      :display-name="profile.display_name"
      :real-name="profile.real_name"
      :bio="profile.bio"
      :bands="profile.bands"
      :links="links"
      :avatar-url="avatarUrl"
      :device-count="(rig ?? []).length"
      :rarity-count="rarityCount"
      :special-count="specialCount"
      :mate-count="mates?.mateCount ?? null"
      :mate-count-failed="mateCountFailed"
      :is-own="isOwn"
    />

    <!-- 52rem statt lg (64rem): so steht es in Abschnitt 4 der Profil-Spec,
         und im Browser gibt es dafuer auch einen Grund - bei 900px zog sich
         das gestapelte Panel ueber die ganze Breite und eine dreigliedrige
         Kette stand allein in 860px Weissraum. minmax(0,1fr) statt 1fr,
         damit die rechte Spalte schrumpfen darf; ein blankes 1fr hat die
         Min-Content-Breite als Untergrenze. -->
    <div class="grid gap-7 min-[52rem]:grid-cols-[15.5rem_minmax(0,1fr)]">
      <!-- Das Panel bekommt den Ladefehler als eigene Prop: eine leere
           Kette, ein leeres Rig und ein gescheiterter Request sind drei
           Zustaende und muessen drei bleiben (Abschnitt 7). -->
      <div class="flex min-w-0 flex-col gap-3 rounded-card bg-surface p-f-6">
        <GearPanel
          :groups="gearGroups"
          :stations="stations"
          :pool-items="poolItems"
          :is-own="isOwn"
          :editing="editing"
          :save-status="chainStatus"
          :last-error="chainError"
          :load-failed="rigError"
          @edit="editing = true"
          @done="stopEditing"
          @update:stations="applyChain"
          @remove="removedHint = true"
          @retry="retryChain"
        />

        <!-- Je Lesezugriff eine eigene Zeile, und jede nennt ihren Bereich.
             Beide Gruppen stehen in derselben Liste wie das Equipment - ohne
             diese Zeilen waere ein Fehlschlag von "hat nichts eingetragen"
             nicht zu unterscheiden, und mit einer gemeinsamen Zeile nicht
             voneinander. -->
        <p v-if="preferencesError" class="text-sm" :class="dangerClass">
          {{ t.profile.preferences }}: {{ t.profile.loadError }}
        </p>
        <p v-if="wishlistError" class="text-sm" :class="dangerClass">
          {{ t.profile.wishlist }}: {{ t.profile.loadError }}
        </p>
      </div>

      <!-- Bearbeiten tauscht die rechte Spalte: kein eigener Screen, kein
           Overlay. Besucher sehen davon nichts, bei ihnen bleibt der Feed.
           <ClientOnly> ist Pflicht - GearPool bringt vuedraggable mit, und
           SortableJS greift beim Initialisieren auf `document` zu. -->
      <ClientOnly v-if="editing && isOwn">
        <div class="flex min-w-0 flex-col gap-2">
          <p v-if="removedHint" class="font-mono text-xs text-muted">{{ t.profile.chainRemovedHint }}</p>
          <GearPool :items="poolItems" @append="appendToChain" @update:items="reorderPool" />
        </div>
      </ClientOnly>

      <div v-else class="flex min-w-0 flex-col gap-3.5">
        <h2 class="font-mono text-[.6875rem] uppercase tracking-[.1em] text-muted">{{ t.profile.feedTitle }}</h2>
        <!-- Drei Zustaende, drei Texte: der Verlaufsteil haengt an derselben
             Abfrage wie das Rig, also darf ein Ladefehler hier nicht als
             "Noch nichts passiert" durchgehen. -->
        <p v-if="rigError" class="text-sm" :class="dangerClass">{{ t.profile.feedError }}</p>
        <p v-else-if="rigEvents.length === 0" class="text-sm text-muted">{{ t.profile.feedEmpty }}</p>
        <div :class="feedListClass">
          <FeedItem
            v-for="event in rigEvents"
            :key="event.day"
            :event="event"
            :display-name="profile.display_name"
          />
        </div>
      </div>
    </div>
  </div>
  <p v-else-if="profileError" :class="dangerClass">{{ t.profile.loadError }}</p>
  <p v-else class="text-muted">{{ t.profile.notFound }}</p>
</template>
