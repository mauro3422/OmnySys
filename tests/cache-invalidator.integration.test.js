/**
 * @fileoverview cache-invalidator.integration.test.js
 *
 * Integration tests for the cache invalidator.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { CacheInvalidator } from '../src/core/cache/invalidator/index.js';
import { UnifiedCacheManager } from '../src/core/cache/manager/index.js';

describe('CacheInvalidator Integration Tests', () => {
  let cacheManager;
  let invalidator;
  let testDir;

  beforeEach(async () => {
    testDir = path.join(process.cwd(), '.test-cache');
    await fs.mkdir(testDir, { recursive: true });

    cacheManager = new UnifiedCacheManager(testDir);
    await cacheManager.initialize();

    invalidator = new CacheInvalidator(cacheManager);
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should invalidate and allow re-analysis', async () => {
    const filePath = 'src/integration-test.js';

    cacheManager.set(`analysis:${filePath}`, {
      imports: [],
      exports: ['test'],
      analyzedAt: Date.now()
    });

    const result = await invalidator.invalidateSync(filePath);
    expect(result.success).toBe(true);
    expect(cacheManager.get(`analysis:${filePath}`)).toBeNull();

    cacheManager.set(`analysis:${filePath}`, {
      imports: ['new-import'],
      exports: ['test', 'new-export'],
      analyzedAt: Date.now()
    });

    const newData = cacheManager.get(`analysis:${filePath}`);
    expect(newData).not.toBeNull();
    expect(newData.exports).toContain('new-export');
  });

  it('should handle file deletion scenario', async () => {
    const filePath = 'src/deleted.js';

    cacheManager.set(`analysis:${filePath}`, { data: 'old' });
    cacheManager.index.entries[filePath] = { hash: 'old' };

    const result = await invalidator.invalidateSync(filePath);

    expect(result.success).toBe(true);
    expect(cacheManager.index.entries[filePath]).toBeUndefined();
  });
});

console.log('🧪 Running Cache Invalidator Integration Tests...');
console.log('Total test suites: 1');
console.log('Total tests: 2');
