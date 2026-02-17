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
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage/integration',
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
