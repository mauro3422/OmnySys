import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'unit',
    globals: true,
    environment: 'node',
    include: [
      'tests/unit/**/*.test.js',
      'tests/contracts/**/*.test.js',
    ],
    exclude: [
      'node_modules',
      'dist',
      '.omnysysdata',
    ],
    testTimeout: 10000,
    retry: 1,
    reporters: ['verbose'],
  },
  resolve: {
    conditions: ['node'],
  },
});
