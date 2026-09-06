import { createClient, type SupabaseClient } from '@supabase/supabase-js'
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

  // Seitenweise weiterblättern, bis eine Seite nicht mehr voll ist -
  // andernfalls blieben Testnutzer ab der 1001. Adresse unentdeckt liegen.
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) throw new Error(`Testnutzer auflisten: ${error.message}`)

    for (const user of data.users) {
      if (!isTestUserEmail(user.email)) continue
      await admin.auth.admin.deleteUser(user.id)
    }

    if (data.users.length < perPage) break
    page += 1
  }
}
