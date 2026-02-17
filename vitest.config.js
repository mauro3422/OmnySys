import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'tests/**/*.{test,spec}.{js,mjs,cjs}',
      'src/**/*.{test,spec}.{js,mjs,cjs}'
    ],
    exclude: [
      'node_modules',
      'dist',
      '.omnysysdata',
      'test-cases'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: [
        'src/**/*.js'
      ],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.test.js',
        '**/*.spec.js',
        'scripts/',
        'docs/',
        'src/ai/**',
        'coverage/**'
      ],
      all: true,
      lines: 50,
      functions: 50,
      branches: 50,
      statements: 50
    },
    testTimeout: 30000,
    retry: 1
  },
  resolve: {
    conditions: ['node']
  }
});
