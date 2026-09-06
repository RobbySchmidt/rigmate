// Spielt die Demo-Nutzer aus scripts/data/demoUsers.ts in die gehostete
// Supabase-Instanz. Laeuft standalone ueber tsx, ausserhalb der
// Nuxt-Build-Pipeline -- deshalb relative Importe statt der Nuxt-Aliase.
//
// Idempotent ueber die aus dem Anzeigenamen abgeleitete E-Mail-Adresse: ein
// bestehender Auth-Nutzer wird wiederverwendet, Rig, Praeferenzen und
// Wunschliste werden vollstaendig neu aufgebaut. Zwei Laeufe hintereinander
// muessen dieselbe Zahl melden.
//
// Der service_role key umgeht RLS komplett und bleibt deshalb serverseitig:
// dieses Skript liegt in scripts/, nie in app/.
//
// Jedes { error } wird geworfen, keins verschluckt. Ein stillschweigend
// halb eingespielter Demo-Datenbestand ist schlimmer als gar keiner -- die
// Empfehlungsliste saehe danach einfach nur duenn aus, ohne Hinweis darauf,
// dass die Daten fehlen.
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { DEMO_USERS, type DemoUser } from './data/demoUsers'

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} fehlt in .env`)
  return value
}

const DEMO_EMAIL_PREFIX = 'demo-'
const DEMO_EMAIL_DOMAIN = '@rigmate.invalid'
const DEMO_PASSWORD = 'rigmate-demo-2026'

const supabase = createClient(required('SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
})

/**
 * Der Praefix `demo-` ist bewusst ein anderer als `rigmate-test-` aus
 * tests/helpers/testUser.ts: deleteTestUsers() raeumt dort JEDEN Nutzer mit
 * dem Testpraefix ab. Wuerden die Demo-Nutzer denselben Praefix tragen,
 * loeschte jeder Testlauf die Vorfuehrdaten mit weg.
 */
export function emailFor(displayName: string): string {
  const slug = displayName
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    // \p{M} statt eines Bereichs mit unsichtbaren kombinierenden Zeichen im Quelltext.
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${DEMO_EMAIL_PREFIX}${slug}${DEMO_EMAIL_DOMAIN}`
}

async function catalogIdByName(): Promise<Map<string, string>> {
  const { data, error } = await supabase.from('catalog_items').select('id, name')
  if (error) throw new Error(`Katalog lesen: ${error.message}`)
  return new Map((data ?? []).map((row) => [row.name as string, row.id as string]))
}

/**
 * Einmal blaettern statt je Demo-Nutzer eine Liste zu ziehen. listUsers()
 * paginiert ueber einen Offset; hier wird nur gelesen, also verschiebt sich
 * das Fenster waehrenddessen nicht.
 */
async function authUserIdByEmail(): Promise<Map<string, string>> {
  const perPage = 1000
  let page = 1
  const byEmail = new Map<string, string>()
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) throw new Error(`Nutzer auflisten: ${error.message}`)
    for (const user of data.users) {
      if (user.email) byEmail.set(user.email, user.id)
    }
    if (data.users.length < perPage) break
    page += 1
  }
  return byEmail
}

/**
 * Prueft die Daten vollstaendig, BEVOR irgendetwas geschrieben wird. Ein
 * Tippfehler im Katalog-Namen soll nicht dazu fuehren, dass die ersten
 * zwoelf Nutzer stehen und der Rest fehlt.
 */
function validate(catalog: Map<string, string>): void {
  const problems: string[] = []
  const seenEmails = new Map<string, string>()

  for (const demo of DEMO_USERS) {
    const email = emailFor(demo.displayName)
    const clash = seenEmails.get(email)
    if (clash) problems.push(`"${demo.displayName}" und "${clash}" ergeben dieselbe Adresse ${email}`)
    seenEmails.set(email, demo.displayName)

    const gearNames = new Set<string>()
    for (const gear of demo.gear) {
      if (!catalog.has(gear.item)) problems.push(`${demo.displayName}: unbekannter Katalog-Eintrag "${gear.item}"`)
      // Der Zielname von installedIn wird ueber eine Map aufgeloest - ein
      // doppelter Name im selben Rig waere dort mehrdeutig.
      if (gearNames.has(gear.item)) problems.push(`${demo.displayName}: "${gear.item}" doppelt im Rig`)
      gearNames.add(gear.item)
    }
    for (const gear of demo.gear) {
      if (!gear.installedIn) continue
      if (!gearNames.has(gear.installedIn)) {
        problems.push(`${demo.displayName}: "${gear.installedIn}" nicht im eigenen Rig`)
        continue
      }
      // Einbau ist genau eine Ebene tief (siehe enforce_gear_item_rules()).
      const target = demo.gear.find((candidate) => candidate.item === gear.installedIn)
      if (target?.installedIn) {
        problems.push(`${demo.displayName}: "${gear.item}" waere zwei Ebenen tief verbaut`)
      }
    }

    for (const [label, names] of [['Präferenz', demo.preferences], ['Wunsch', demo.wishlist]] as const) {
      const seen = new Set<string>()
      for (const name of names) {
        if (!catalog.has(name)) problems.push(`${demo.displayName}: unbekannter Katalog-Eintrag "${name}"`)
        if (seen.has(name)) problems.push(`${demo.displayName}: ${label} "${name}" doppelt`)
        seen.add(name)
      }
    }
  }

  if (problems.length > 0) throw new Error(`Demo-Daten fehlerhaft:\n- ${problems.join('\n- ')}`)
}

async function ensureUser(demo: DemoUser, existingByEmail: Map<string, string>): Promise<string> {
  const email = emailFor(demo.displayName)
  const existing = existingByEmail.get(email)
  if (existing) return existing

  // email_confirm statt die Bestaetigung projektweit abzuschalten.
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: demo.displayName },
  })
  if (error) throw new Error(`Demo-Nutzer "${demo.displayName}": ${error.message}`)
  const id = data.user?.id
  if (!id) throw new Error(`Demo-Nutzer "${demo.displayName}": Admin-API lieferte keine Id`)
  existingByEmail.set(email, id)
  return id
}

async function seedUser(
  demo: DemoUser,
  catalog: Map<string, string>,
  existingByEmail: Map<string, string>,
): Promise<void> {
  const userId = await ensureUser(demo, existingByEmail)

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ display_name: demo.displayName, bio: demo.bio ?? null, bands: demo.bands ?? [] })
    .eq('id', userId)
  if (profileError) throw new Error(`${demo.displayName} / Profil: ${profileError.message}`)

  // Vollstaendig neu aufbauen, damit ein zweiter Lauf nichts verdoppelt.
  for (const [table, column] of [
    ['gear_items', 'owner_id'],
    ['preferences', 'user_id'],
    ['wishlist_items', 'user_id'],
  ] as const) {
    const { error } = await supabase.from(table).delete().eq(column, userId)
    if (error) throw new Error(`${demo.displayName} / ${table} leeren: ${error.message}`)
  }

  const gearIdByName = new Map<string, string>()

  // Erst alles ohne installed_in, damit die Ziele existieren.
  for (const gear of demo.gear.filter((g) => !g.installedIn)) {
    const catalogItemId = catalog.get(gear.item)
    if (!catalogItemId) throw new Error(`Unbekannter Katalog-Eintrag: ${gear.item}`)
    const { data, error } = await supabase
      .from('gear_items')
      .insert({
        owner_id: userId,
        catalog_item_id: catalogItemId,
        year: gear.year ?? null,
        finish: gear.finish ?? null,
        modifications: gear.modifications ?? null,
      })
      .select('id')
      .single()
    if (error) throw new Error(`${demo.displayName} / ${gear.item}: ${error.message}`)
    gearIdByName.set(gear.item, data.id)
  }

  for (const gear of demo.gear.filter((g) => g.installedIn)) {
    const catalogItemId = catalog.get(gear.item)
    const target = gearIdByName.get(gear.installedIn!)
    if (!catalogItemId) throw new Error(`Unbekannter Katalog-Eintrag: ${gear.item}`)
    if (!target) throw new Error(`${demo.displayName}: "${gear.installedIn}" nicht im eigenen Rig`)
    const { error } = await supabase.from('gear_items').insert({
      owner_id: userId,
      catalog_item_id: catalogItemId,
      year: gear.year ?? null,
      finish: gear.finish ?? null,
      modifications: gear.modifications ?? null,
      installed_in_id: target,
    })
    if (error) throw new Error(`${demo.displayName} / ${gear.item}: ${error.message}`)
  }

  for (const name of demo.preferences) {
    const catalogItemId = catalog.get(name)
    if (!catalogItemId) throw new Error(`Unbekannter Katalog-Eintrag: ${name}`)
    const { error } = await supabase
      .from('preferences')
      .insert({ user_id: userId, catalog_item_id: catalogItemId })
    if (error) throw new Error(`${demo.displayName} / ${name}: ${error.message}`)
  }

  for (const name of demo.wishlist) {
    const catalogItemId = catalog.get(name)
    if (!catalogItemId) throw new Error(`Unbekannter Katalog-Eintrag: ${name}`)
    const { error } = await supabase
      .from('wishlist_items')
      .insert({ user_id: userId, catalog_item_id: catalogItemId })
    if (error) throw new Error(`${demo.displayName} / ${name}: ${error.message}`)
  }
}

async function main() {
  const catalog = await catalogIdByName()
  validate(catalog)

  const existingByEmail = await authUserIdByEmail()
  for (const demo of DEMO_USERS) {
    await seedUser(demo, catalog, existingByEmail)
    process.stdout.write('.')
  }
  process.stdout.write('\n')

  const gearCount = DEMO_USERS.reduce((sum, demo) => sum + demo.gear.length, 0)
  const preferenceCount = DEMO_USERS.reduce((sum, demo) => sum + demo.preferences.length, 0)
  const wishCount = DEMO_USERS.reduce((sum, demo) => sum + demo.wishlist.length, 0)
  console.log(
    `${DEMO_USERS.length} Demo-Nutzer eingespielt: ` +
      `${gearCount} Geräte, ${preferenceCount} Präferenzen, ${wishCount} Wünsche.`,
  )
  console.log(`Anmeldung: ${emailFor(DEMO_USERS[0]!.displayName)} / ${DEMO_PASSWORD}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
