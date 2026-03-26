import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'e2e',
    globals: true,
    environment: 'node',
    // We intentionally DO NOT use setup-sqlite.js because we want E2E to use the real filesystem .omnysys/omnibase.db
    include: [
      'tests/e2e/**/*.test.js',
    ],
    exclude: [
      'node_modules',
      'dist',
      '.omnysysdata',
    ],
    testTimeout: 60000,
    reporters: ['verbose']
  },
  resolve: {
    conditions: ['node'],
  },
});
