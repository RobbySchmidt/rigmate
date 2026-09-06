import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: false },
  modules: ['@nuxtjs/supabase'],
  css: ['~/assets/css/main.css'],

  supabase: {
    // Standardmäßig leitet das Modul jeden Nicht-Angemeldeten auf /login um.
    // Gear-Seiten sollen laut Spec öffentlich sein, deshalb steuern wir den
    // Schutz selbst statt global umzuleiten.
    redirect: false,
    // Nur in server/ verfügbar, landet nicht im Client-Bundle.
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },

  vite: {
    plugins: [
      tailwindcss(),
    ],
  },
});