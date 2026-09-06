import { defineConfig } from 'vitest/config'

export default defineConfig({
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
  },
})
