import { describe, it, expect, vi } from 'vitest';
import { closeIfPresent, stopIfPresent } from '#shared/lifecycle/shutdown-helpers.js';

describe('shutdown-helpers', () => {
  it('closes callback-style targets with closeIfPresent', async () => {
    let closed = false;
    const target = {
      close(callback) {
        closed = true;
        callback();
      }
    };

    await expect(closeIfPresent(target)).resolves.toBe(true);
    expect(closed).toBe(true);
  });

  it('stops promise-style targets with stopIfPresent', async () => {
    const stop = vi.fn(async () => undefined);
    const target = { stop };

    await expect(stopIfPresent(target)).resolves.toBe(true);
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('returns false when no close method exists', async () => {
    await expect(closeIfPresent(null)).resolves.toBe(false);
  });
});
