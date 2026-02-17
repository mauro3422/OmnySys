import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'unit',
    globals: true,
    environment: 'node',
    include: [
      'tests/unit/**/*.test.js',
      'tests/contracts/**/*.test.js',
      'tests/functional/**/*.test.js',
    ],
    exclude: [
      'node_modules',
      'dist',
      '.omnysysdata',
    ],
    testTimeout: 10000,
    retry: 1,
    reporters: ['verbose'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      reportOnFailure: true,
      include: ['src/layer-a-static/**/*.js', 'src/layer-b-semantic/**/*.js'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.test.js',
        '**/*.spec.js',
        '**/index.js'
      ],
      all: true
    }
  },
  resolve: {
    conditions: ['node'],
  },
});
