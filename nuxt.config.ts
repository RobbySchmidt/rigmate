import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: false },
  modules: ['@nuxtjs/supabase'],
  css: ['~/assets/css/main.css'],

  app: {
    head: {
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap',
        },
      ],
    },
  },

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