<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

interface ProfileLink {
  label: string
  url: string
}

// Nicht willkuerlich: die "links"-Spalte hat keine Laengenbeschraenkung in
// der Datenbank (siehe supabase/migrations/20260906115314_profiles.sql).
// Ohne eine Grenze hier koennte jemand hunderte Zeilen einfuegen - kein
// Absturz, aber eine Profilseite, die niemand mehr lesen kann. Ein Fehler
// statt stillem Abschneiden: wer die Grenze reisst, soll es sehen und die
// Liste selbst kuerzen, statt dass wir unbemerkt Zeilen verwerfen.
const MAX_LINKS = 20

const t = useText()
const supabase = useSupabaseClient()
// useSupabaseUser() liefert JWT-Claims (".sub"), kein User-Objekt - siehe
// app/composables/useUserId.ts. Jeder Schreibzugriff hier haengt an der
// eigenen Nutzer-Id, deshalb ausschliesslich ueber useUserId().
const userId = useUserId()

const displayName = ref('')
const realName = ref('')
const bio = ref('')
const bandsText = ref('')
const linksText = ref('')
const avatarPath = ref<string | null>(null)

const saved = ref(false)
const saveError = ref('')
const loadError = ref(false)
const avatarError = ref('')

const { data: profile } = await useAsyncData('own-profile', async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('display_name, real_name, bio, bands, links, avatar_path')
    .eq('id', userId.value!)
    .single()
  if (error) loadError.value = true
  return data
})

watchEffect(() => {
  if (!profile.value) return
  displayName.value = profile.value.display_name ?? ''
  realName.value = profile.value.real_name ?? ''
  bio.value = profile.value.bio ?? ''
  bandsText.value = (profile.value.bands ?? []).join(', ')
  linksText.value = ((profile.value.links as ProfileLink[] | null) ?? []).map((link) => link.url).join('\n')
  avatarPath.value = profile.value.avatar_path ?? null
})

const currentAvatarUrl = computed(() => {
  if (!avatarPath.value) return null
  return supabase.storage.from('avatars').getPublicUrl(avatarPath.value).data.publicUrl
})

type ParseLinksResult = { success: true; links: ProfileLink[] } | { success: false; message: string }

/**
 * Eine Zeile, die keine echte Adresse ist, darf nie unveraendert als "Link"
 * auf dem Profil landen - das waere ein Anker, der ins Leere oder auf eine
 * relative Seite zeigt, ohne dass irgendwer je einen Fehler gesehen hat.
 * Deshalb bricht das Speichern hier komplett ab statt die kaputte Zeile
 * stillschweigend zu ueberspringen oder als Text ohne Verlinkung
 * durchzulassen: der Nutzer bekommt die genaue Zeile genannt und kann sie
 * selbst korrigieren.
 */
function parseLinks(text: string): ParseLinksResult {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length > MAX_LINKS) {
    return { success: false, message: t.settings.linksTooMany }
  }

  const links: ProfileLink[] = []
  for (const line of lines) {
    let parsed: URL
    try {
      parsed = new URL(line)
    } catch {
      return { success: false, message: t.settings.linkInvalid.replace('{value}', line) }
    }
    // new URL() laesst auch z.B. "javascript:..." oder "mailto:..." als
    // "gueltig" durch - hier soll nur ein anklickbarer Web-Link ankommen.
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { success: false, message: t.settings.linkInvalid.replace('{value}', line) }
    }
    links.push({ label: line.replace(/^https?:\/\//, ''), url: line })
  }

  return { success: true, links }
}

async function save() {
  saved.value = false
  saveError.value = ''

  const parsedLinks = parseLinks(linksText.value)
  if (!parsedLinks.success) {
    saveError.value = parsedLinks.message
    return
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: displayName.value.trim(),
      real_name: realName.value.trim() || null,
      bio: bio.value.trim() || null,
      bands: bandsText.value.split(',').map((b) => b.trim()).filter(Boolean),
      links: parsedLinks.links,
    })
    .eq('id', userId.value!)

  if (error) {
    // Verworfenes { error } war project-weit der Klassiker fuer "sieht aus
    // wie nichts passiert" - hier stattdessen sichtbar und generisch, denn
    // die Datenbank kann aus mehreren Gruenden ablehnen (RLS, ein zu langer
    // Anzeigename, ...) und keiner davon soll wie Erfolg aussehen.
    saveError.value = t.settings.saveError
    return
  }
  saved.value = true
}

async function uploadAvatar(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  avatarError.value = ''

  // Eigener Ordner - so verlangt es die Storage-Policy aus Task 7.
  const path = `${userId.value!}/${crypto.randomUUID()}`
  const { error: uploadFailure } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
  if (uploadFailure) {
    avatarError.value = t.settings.avatarError
    return
  }

  const { error: updateFailure } = await supabase
    .from('profiles')
    .update({ avatar_path: path })
    .eq('id', userId.value!)
  if (updateFailure) {
    // Die Datei liegt jetzt im Storage, aber ohne diesen zweiten Schritt
    // zeigt kein Profil darauf - auch das ist ein Fehlschlag, keiner.
    avatarError.value = t.settings.avatarError
    return
  }
  avatarPath.value = path
}
</script>

<template>
  <div class="mx-auto flex max-w-lg flex-col gap-4">
    <h1 class="display text-f-4xl font-semibold">{{ t.settings.title }}</h1>
    <p class="text-sm text-muted">{{ t.settings.optionalHint }}</p>
    <p v-if="loadError" class="text-sm text-danger">{{ t.settings.loadError }}</p>

    <form class="flex flex-col gap-4 rounded-card bg-surface p-f-6" @submit.prevent="save">
      <label class="flex flex-col gap-1">
        <span class="text-sm">{{ t.settings.displayName }}</span>
        <input v-model="displayName" type="text" required minlength="2" maxlength="40" class="rounded-field bg-surface-2 px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-accent" />
        <span class="text-xs text-muted">{{ t.settings.displayNameHint }}</span>
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-sm">{{ t.settings.realName }}</span>
        <input v-model="realName" type="text" maxlength="80" class="rounded-field bg-surface-2 px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-accent" />
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-sm">{{ t.settings.bio }}</span>
        <textarea v-model="bio" maxlength="500" rows="4" class="rounded-field bg-surface-2 px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-accent" />
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-sm">{{ t.settings.bands }}</span>
        <input v-model="bandsText" type="text" class="rounded-field bg-surface-2 px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-accent" />
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-sm">{{ t.settings.links }}</span>
        <textarea v-model="linksText" rows="3" class="rounded-field bg-surface-2 px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-accent" />
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-sm">{{ t.settings.avatar }}</span>
        <img
          v-if="currentAvatarUrl"
          :src="currentAvatarUrl"
          :alt="t.settings.avatar"
          class="h-16 w-16 rounded-full object-cover"
        />
        <input type="file" accept="image/*" class="rounded-btn outline-none focus-visible:ring-2 focus-visible:ring-accent" @change="uploadAvatar" />
      </label>
      <p v-if="avatarError" class="text-sm text-danger">{{ avatarError }}</p>
      <p v-if="saveError" class="text-sm text-danger">{{ saveError }}</p>
      <p v-if="saved" class="text-sm text-muted">{{ t.settings.saved }}</p>
      <button type="submit" class="rounded-btn bg-accent px-4 py-2 text-accent-ink outline-none focus-visible:ring-2 focus-visible:ring-accent">{{ t.settings.save }}</button>
    </form>
  </div>
</template>
