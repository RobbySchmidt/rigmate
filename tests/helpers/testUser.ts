import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'
import { adminClient } from './supabase'

const TEST_EMAIL_PREFIX = 'rigmate-test-'
const TEST_EMAIL_DOMAIN = '@example.invalid'
const TEST_PASSWORD = 'rigmate-test-passwort-2026'

export interface TestUser {
  id: string
  email: string
  /** Angemeldet als dieser Nutzer. RLS greift. */
  client: SupabaseClient
}

export async function createTestUser(displayName = 'Testnutzer'): Promise<TestUser> {
  const admin = adminClient()
  const email = `${TEST_EMAIL_PREFIX}${crypto.randomUUID()}${TEST_EMAIL_DOMAIN}`

  // email_confirm: true statt die Bestätigung projektweit abzuschalten -
  // die Pflicht zur Mail-Bestätigung bleibt für echte Registrierungen stehen.
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  })
  if (error) throw new Error(`Testnutzer anlegen: ${error.message}`)

  const client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { error: signInError } = await client.auth.signInWithPassword({ email, password: TEST_PASSWORD })
  if (signInError) throw new Error(`Testnutzer anmelden: ${signInError.message}`)

  return { id: data.user!.id, email, client }
}

/**
 * Meldet sich wie ein echter Browser an — über @supabase/ssr's
 * createBrowserClient() mit einem eigenen In-Memory-Cookie-Jar statt per
 * Bearer-Token. Das ist der Pfad, den server/utils/authUser.ts (und davor
 * server/api/recommendations.get.ts) tatsächlich bedient: serverSupabaseUser()
 * liest ausschließlich Cookies. Ein Test, der stattdessen wie `client` oben
 * einen Bearer-Header schickt, übt diesen Pfad nie aus — und genau das war
 * die Lücke, durch die acht Schreibstellen im Projekt unbemerkt blieben
 * (`user.value!.id` / `user.id` war project-weit `undefined`, weil
 * @nuxtjs/supabase serverseitig UND clientseitig das dekodierte JWT liefert,
 * dessen Nutzer-Id unter `sub` steckt, nicht unter `id`; siehe
 * `.superpowers/sdd/2026-09-06-rigmate-stufe-1/task-14-report.md`,
 * Fix-Runde 1, und `server/utils/authUser.ts` für die Details).
 */
export async function cookieHeaderFor(email: string): Promise<string> {
  const jar = new Map<string, string>()
  const browserClient = createBrowserClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!, {
    isSingleton: false,
    cookies: {
      getAll: () => Array.from(jar.entries()).map(([name, value]) => ({ name, value })),
      setAll: (cookiesToSet: { name: string; value: string }[]) => {
        for (const { name, value } of cookiesToSet) jar.set(name, value)
      },
    },
  })
  const { error } = await browserClient.auth.signInWithPassword({ email, password: TEST_PASSWORD })
  if (error) throw new Error(`Cookie-Anmeldung: ${error.message}`)

  return Array.from(jar.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join('; ')
}

/**
 * Entscheidet, ob eine E-Mail-Adresse zu einem Testnutzer gehört.
 * Bewusst case-sensitiv: createTestUser() erzeugt Adressen ausnahmslos
 * klein geschrieben, ein Gross-Klein-Vergleich würde beim Löschen nur
 * unnötig mehr treffen, ohne echte Testnutzer besser zu finden.
 */
export function isTestUserEmail(email: string | null | undefined): boolean {
  return typeof email === 'string' && email.startsWith(TEST_EMAIL_PREFIX)
}

/**
 * Löscht ausschließlich Nutzer mit dem Testpräfix — und zwar ALLE, nicht nur
 * die vom aktuellen Testlauf angelegten. Das räumt auch Reste eines
 * abgebrochenen Laufs weg. Sicher ist das nur, weil vitest.config.ts
 * `fileParallelism: false` setzt (siehe Kommentar dort) — bei paralleler
 * Ausführung würden sich Testdateien sonst gegenseitig mitten im Lauf die
 * Nutzer löschen.
 */
export async function deleteTestUsers(): Promise<void> {
  const admin = adminClient()
  const perPage = 1000
  let page = 1
  const idsToDelete: string[] = []

  // Erst vollständig durchblättern und sammeln, dann erst löschen.
  // listUsers() paginiert über einen Offset - würde man schon während des
  // Blätterns löschen, verschöbe jede gelöschte Zeile das Fenster der
  // nächsten Seite um eins nach vorn, und Einträge rutschen unbemerkt aus
  // dem Fenster heraus. Das trifft besonders hart, weil dieser Sweep JEDEN
  // rigmate-test-* Account trifft statt nur die des laufenden Tests - eine
  // Seite kann also grossteils aus Treffern bestehen.
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) throw new Error(`Testnutzer auflisten: ${error.message}`)

    for (const user of data.users) {
      if (!isTestUserEmail(user.email)) continue
      idsToDelete.push(user.id)
    }

    if (data.users.length < perPage) break
    page += 1
  }

  for (const id of idsToDelete) {
    await admin.auth.admin.deleteUser(id)
  }
}
