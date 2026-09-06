import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  // Component-Tests mounten echte .vue-Dateien - ohne den Vue-Plugin kann
  // Vitest SFC-Syntax gar nicht erst transformieren.
  plugins: [vue()],
  resolve: {
    alias: {
      // Nuxt loest diesen Alias normalerweise selbst auf (siehe
      // .nuxt/tsconfig.*.json); ausserhalb der Nuxt-Build-Pipeline muss
      // Vitest das von Hand wissen, sonst schlaegt der Import in
      // CatalogPicker.vue und items.post.ts fehl.
      '#shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    // Integrationstests sprechen mit eu-west-1, das dauert.
    testTimeout: 30000,
    hookTimeout: 30000,
    // Testnutzer sind globaler Zustand auf einer geteilten Instanz.
    // Haengt an deleteTestUsers() in tests/helpers/testUser.ts: die raeumt
    // JEDEN rigmate-test-* Account ab, nicht nur die eigenen. Mit
    // Parallelitaet wuerden sich Testdateien gegenseitig mitten im Lauf die
    // Nutzer wegloeschen.
    fileParallelism: false,
    // Component-Tests stubben ref/computed/useText/... per vi.stubGlobal(),
    // weil Nuxt diese Namen sonst per Auto-Import bereitstellt - das gibt es
    // ausserhalb von Nuxts eigener Build-Pipeline nicht. Diese Option raeumt
    // die Stubs nach jedem Test automatisch wieder ab.
    unstubGlobals: true,
  },
})
