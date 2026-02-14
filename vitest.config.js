import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use globals (describe, it, expect) like Jest
    globals: true,
    // Use Node.js environment
    environment: 'node',
    // Include patterns
    include: [
      'tests/**/*.{test,spec}.{js,mjs,cjs}',
      'src/**/*.{test,spec}.{js,mjs,cjs}'
    ],
    // Exclude patterns
    exclude: [
      'node_modules',
      'dist',
      '.omnysysdata',
      'test-cases'
    ],
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.test.js',
        'scripts/',
        'docs/'
      ]
    },
    // Test timeout
    testTimeout: 30000,
    // Retry on failure (useful for flaky tests)
    retry: 1
  },
  resolve: {
    // Support for Node.js imports (#utils, etc.)
    conditions: ['node']
  }
});
