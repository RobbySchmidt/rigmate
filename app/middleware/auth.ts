export default defineNuxtRouteMiddleware((to) => {
  // useSupabaseUser() direkt auf Wahrheitsgehalt zu pruefen, funktioniert
  // heute zufaellig (das Claims-Objekt ist truthy, solange jemand
  // angemeldet ist) - es ist aber genau die Nahtstelle, die andernorts acht
  // Schreibstellen unbemerkt kaputt gemacht hat, weil dort ".id" statt
  // ".sub" gelesen wurde (siehe app/composables/useUserId.ts). Konsequent
  // ueber useUserId() zu gehen kostet hier keine Zeile mehr, haelt das
  // Projekt aber bei einem einzigen Weg, den angemeldeten Zustand
  // abzufragen.
  const userId = useUserId()
  if (userId.value) return
  // Das Supabase-Modul leitet bewusst nicht global um (siehe nuxt.config.ts),
  // deshalb schützen wir hier pro Seite.
  return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
})
