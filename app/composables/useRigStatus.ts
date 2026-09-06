// Ob jemand schon Equipment eingetragen hat - Grundlage fuer alles, was
// darauf reagieren soll (z.B. ein Hinweis auf der Startseite oder eine
// Weiterleitung zurueck ins Onboarding). Ein Fehlschlag beim Zaehlen ist
// hier bewusst kein Schreibfehler, der eine Meldung braucht - er degradiert
// still auf "kein Equipment bekannt" statt die Seite zu blockieren.
export function useRigStatus() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const count = ref(0)

  async function refresh() {
    if (!user.value) {
      count.value = 0
      return
    }
    const { count: rows } = await supabase
      .from('gear_items')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', user.value.id)
    count.value = rows ?? 0
  }

  const hasGear = computed(() => count.value > 0)
  return { hasGear, count, refresh }
}
