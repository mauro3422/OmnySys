import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const restoreLogLevel = vi.hoisted(() => {
  const previousLogLevel = process.env.LOG_LEVEL;
  process.env.LOG_LEVEL = 'error';

  return () => {
    if (previousLogLevel === undefined) {
      delete process.env.LOG_LEVEL;
    } else {
      process.env.LOG_LEVEL = previousLogLevel;
    }
  };
});

import { statsPool, createStatsGetter } from '#shared/utils/stats-pool.js';

afterAll(() => {
  restoreLogLevel();
});

beforeEach(() => {
  statsPool.providers.clear();
  statsPool.staticStats.clear();
});

describe('StatsPool', () => {
  it('registers a provider and returns module stats', () => {
    statsPool.registerProvider('watcher', () => ({
      total: 7,
      byType: { semantic: 5, impact: 2 },
      byDomain: { core: 7 }
    }));

    expect(statsPool.getModuleStats('watcher')).toEqual({
      total: 7,
      byType: { semantic: 5, impact: 2 },
      byDomain: { core: 7 }
    });
  });

  it('returns a fallback payload when a provider throws', () => {
    statsPool.registerProvider('broken', () => {
      throw new Error('boom');
    });

    expect(statsPool.getModuleStats('broken')).toEqual({
      error: 'PROVIDER_FAILED',
      total: 0,
      byType: { semantic: 0, impact: 0 },
      byDomain: {}
    });
  });

  it('aggregates static and dynamic stats in getSystemStats', () => {
    statsPool.set('buildMode', 'watch');
    statsPool.set('revision', 42);

    statsPool.registerProvider('watcher', () => ({
      total: 3,
      byType: { semantic: 1, impact: 2 },
      byDomain: { core: 3 }
    }));

    const result = statsPool.getSystemStats();

    expect(result.timestamp).toEqual(expect.any(String));
    expect(result.system).toEqual({
      buildMode: 'watch',
      revision: 42
    });
    expect(result.modules.watcher).toEqual({
      total: 3,
      byType: { semantic: 1, impact: 2 },
      byDomain: { core: 3 }
    });
  });

  it('merges extraBuilder output with the pooled snapshot using the current this binding', () => {
    statsPool.registerProvider('watcher', () => ({
      total: 4,
      status: 'base',
      byType: { semantic: 2, impact: 2 },
      byDomain: { core: 4 }
    }));

    const getWatcherStats = createStatsGetter(
      'watcher',
      function buildWatcherStats(pooled, suffix) {
        return {
          status: 'merged',
          suffix,
          pooledTotal: pooled.total,
          owner: this.owner
        };
      }
    );

    const result = getWatcherStats.call({ owner: 'stats-owner' }, 'live');

    expect(result).toEqual({
      total: 4,
      status: 'merged',
      byType: { semantic: 2, impact: 2 },
      byDomain: { core: 4 },
      suffix: 'live',
      pooledTotal: 4,
      owner: 'stats-owner'
    });
  });

  it('serializes circular or otherwise unstringifiable stats snapshots without throwing', () => {
    const circularStats = {
      total: 1,
      byType: { semantic: 1, impact: 0 },
      byDomain: {}
    };
    circularStats.self = circularStats;

    statsPool.registerProvider('circular', () => circularStats);

    let result;
    expect(() => {
      result = statsPool.getSystemStats();
    }).not.toThrow();

    expect(result.modules.circular).toBe(circularStats);
    expect(result.modules.circular.self).toBe(result.modules.circular);
  });
});
