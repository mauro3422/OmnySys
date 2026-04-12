import { defineConfig } from 'vitest/config';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __fileUrl = new URL(import.meta.url);
const dbPath = resolve(dirname(fileURLToPath(__fileUrl)), '../../.omnysysdata/omnysys.db');
const serverRunning = existsSync(dbPath);

export default defineConfig({
  test: {
    name: 'unit-live',
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
    setupFiles: ['./tests/config/setup-live.js'],
    testTimeout: 30000,
    retry: serverRunning ? 1 : 0,
    reporters: ['verbose'],
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    hookTimeout: 30000,
    globals: {
      __TEST_LIVE_MODE__: true,
      __DB_AVAILABLE__: serverRunning
    },
    onConsoleLog(log) {
      if (log.includes('[LIVE MODE]')) return false;
      return undefined;
    }
  },
  resolve: {
    conditions: ['node'],
  },
});