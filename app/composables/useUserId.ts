/**
 * Normalisiert die angemeldete Nutzer-Id auf der Client-Seite.
 *
 * @nuxtjs/supabase 2.0.10 befuellt useSupabaseUser() nicht mit einem echten
 * User-Objekt, sondern mit dem Rueckgabewert von client.auth.getClaims() -
 * dem dekodierten JWT-Payload (siehe
 * node_modules/@nuxtjs/supabase/dist/runtime/plugins/supabase.client.js,
 * Zeilen 52-53: "currentUser.value = claimsData?.claims"). Die Nutzer-Id
 * steckt dort unter "sub", nicht unter "id" - empirisch geprueft, ein
 * echter Login liefert claims.sub und kein claims.id ueberhaupt. Ohne diese
 * Normalisierung war user.value!.id project-weit ueberall undefined (acht
 * betroffene Schreibstellen, siehe task-14-report.md, Fix-Runde 1) - jede
 * Stelle, die die eigene Id braucht, muss durch dieses Composable gehen
 * statt useSupabaseUser() direkt zu befragen.
 *
 * Faengt das Modul irgendwann wieder ein echtes User-Objekt zurueck (dann
 * waere ".id" gesetzt, ".sub" nicht), liefert der Fallback unten weiterhin
 * das Richtige, ohne Anpassung.
 */
export function useUserId() {
  const user = useSupabaseUser()
  return computed(() => {
    const claims = user.value as { id?: string; sub?: string } | null
    return claims?.sub ?? claims?.id ?? null
  })
}
