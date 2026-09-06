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
    fileParallelism: false,
  },
})
