import { createClient, type SupabaseClient } from '@supabase/supabase-js'

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} fehlt in .env — siehe .env.example`)
  }
  return value
}

/** Umgeht RLS. Nur für Aufbau und Aufräumen in Tests. */
export function adminClient(): SupabaseClient {
  return createClient(required('SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** Nicht angemeldet, RLS greift. Prüft, was ein Besucher ohne Login sieht. */
export function anonClient(): SupabaseClient {
  return createClient(required('SUPABASE_URL'), required('SUPABASE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
