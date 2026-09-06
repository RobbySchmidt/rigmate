export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser()
  if (user.value) return
  // Das Supabase-Modul leitet bewusst nicht global um (siehe nuxt.config.ts),
  // deshalb schützen wir hier pro Seite.
  return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
})
