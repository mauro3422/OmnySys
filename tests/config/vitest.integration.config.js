import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'integration',
    globals: true,
    environment: 'node',
    include: [
      'tests/integration/**/*.test.js',
    ],
    exclude: [
      'node_modules',
      'dist',
      '.omnysysdata',
    ],
    testTimeout: 30000,
    reporters: ['verbose'],
  },
  resolve: {
    conditions: ['node'],
  },
});
