import { describe, expect, it } from 'vitest';
import {
  buildLightweightCacheMetadata,
  seedDeferredCachePlaceholders,
  shouldDeferCriticalCachePreload
} from '../../../../src/layer-c-memory/mcp/core/initialization/steps/cache-init-helpers.js';

describe('cache-init-helpers', () => {
  it('defers heavy preload after a non-incremental Layer A rebuild', () => {
    expect(shouldDeferCriticalCachePreload({
      startupLayerAResult: {
        ran: true,
        incremental: false,
        strategy: 'FULL_REINDEX'
      }
    })).toBe(true);

    expect(shouldDeferCriticalCachePreload({
      startupLayerAResult: {
        ran: true,
        incremental: true,
        strategy: 'INCREMENTAL'
      }
    })).toBe(false);
  });

  it('builds lightweight metadata from the cache index', () => {
    expect(buildLightweightCacheMetadata({
      index: {
        metadata: {
          totalFiles: 12,
          totalAtoms: 34,
          totalDependencies: 56
        }
      }
    })).toEqual(expect.objectContaining({
      totalFiles: 12,
      totalAtoms: 34,
      deferred: true,
      source: 'cache_lightweight_bootstrap'
    }));
  });

  it('seeds deferred placeholders without requiring full preload', () => {
    const server = {};
    const cache = {
      index: {
        metadata: {
          totalFiles: 2,
          totalAtoms: 5,
          totalDependencies: 7
        }
      },
      values: new Map(),
      set(key, value) {
        this.values.set(key, value);
      }
    };

    seedDeferredCachePlaceholders(server, cache);

    expect(server.metadata).toEqual(expect.objectContaining({
      totalFiles: 2,
      totalAtoms: 5,
      deferred: true
    }));
    expect(cache.values.get('connections')).toEqual(expect.objectContaining({
      total: 0,
      deferred: true
    }));
    expect(cache.values.get('assessment')).toEqual(expect.objectContaining({
      deferred: true
    }));
  });
});
