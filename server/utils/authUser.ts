import { serverSupabaseUser } from '#supabase/server'
import type { H3Event } from 'h3'

export interface AuthClaims {
  id?: string
  sub?: string
}

/**
 * Normalisiert die angemeldete Nutzer-Id auf der Server-Seite.
 *
 * @nuxtjs/supabase 2.0.10s serverSupabaseUser() (siehe
 * node_modules/@nuxtjs/supabase/dist/runtime/server/services/serverSupabaseUser.js)
 * ruft client.auth.getClaims() auf und liefert data.claims zurueck - das
 * dekodierte JWT-Payload, kein echtes User-Objekt. Die Nutzer-Id steckt
 * dort unter "sub", nicht unter "id" - empirisch geprueft, ein echter Login
 * liefert claims.sub und kein claims.id ueberhaupt. Ohne diese
 * Normalisierung war user.id project-weit ueberall undefined (acht
 * betroffene Schreibstellen, siehe task-14-report.md, Fix-Runde 1).
 *
 * Faengt das Modul irgendwann wieder ein echtes User-Objekt zurueck (dann
 * waere ".id" gesetzt, ".sub" nicht), liefert der Fallback unten weiterhin
 * das Richtige, ohne Anpassung. Das Gegenstueck fuer die Client-Seite ist
 * app/composables/useUserId.ts - dieselbe Regel, an zwei Stellen, weil
 * Client und Server unterschiedliche Bausteine (useSupabaseUser vs.
 * serverSupabaseUser) befragen.
 */
export function normalizeUserId(claims: AuthClaims | null | undefined): string | null {
  return claims?.sub ?? claims?.id ?? null
}

/**
 * Liest den angemeldeten Nutzer aus dem Session-Cookie und normalisiert auf
 * seine Id. Wirft 401, wenn niemand angemeldet ist - das wollte jeder
 * bisherige Aufrufer ohnehin (server/api/catalog/items.post.ts,
 * server/api/recommendations.get.ts).
 */
export async function requireUserId(event: H3Event): Promise<string> {
  const claims = (await serverSupabaseUser(event)) as AuthClaims | null
  const id = normalizeUserId(claims)
  if (!id) throw createError({ statusCode: 401, statusMessage: 'Nicht angemeldet' })
  return id
}
