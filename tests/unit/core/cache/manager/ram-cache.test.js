import { afterEach, describe, expect, it, vi } from 'vitest';

const getRepository = vi.fn(() => ({ db: { open: false } }));
const ensureTable = vi.fn();

vi.mock('#layer-c/storage/repository/index.js', () => ({
  getRepository
}));

vi.mock('#layer-c/storage/repository/core/BaseSqlRepository.js', () => ({
  BaseSqlRepository: vi.fn().mockImplementation(() => ({
    db: { open: false },
    ensureTable
  }))
}));

const ramCacheModule = await import('../../../../../src/core/cache/manager/ram-cache.js');

afterEach(() => {
  vi.clearAllMocks();
});

describe('ram-cache fallback', () => {
  it('uses the in-memory cache when the SQLite repository is closed', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const context = {
      projectPath: 'C:/Dev/OmnySystem',
      defaultTtlMinutes: 5,
      maxRamEntries: 4,
      ramCache: new Map()
    };

    ramCacheModule.set.call(context, 'alpha', { value: 1 }, 5);
    expect(context.ramCache.get('alpha')).toEqual(
      expect.objectContaining({
        data: { value: 1 }
      })
    );
    expect(warnSpy).not.toHaveBeenCalled();

    ramCacheModule.purge.call(context);
    expect(context.ramCache.size).toBe(0);
    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});
