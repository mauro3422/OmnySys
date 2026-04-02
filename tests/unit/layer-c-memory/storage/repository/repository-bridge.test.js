import { describe, expect, it } from 'vitest';

import { isRepositoryReady } from '../../../../../src/layer-c-memory/storage/repository/repository-bridge.js';

describe('isRepositoryReady', () => {
  it('accepts an initialized open repo with healthy integrity', () => {
    expect(isRepositoryReady({
      initialized: true,
      db: { open: true },
      integrity: { healthy: true }
    })).toBe(true);
  });

  it('rejects a repo with a failed integrity probe', () => {
    expect(isRepositoryReady({
      initialized: true,
      db: { open: true },
      integrity: { healthy: false }
    })).toBe(false);
  });

  it('rejects a repo with a closed database', () => {
    expect(isRepositoryReady({
      initialized: true,
      db: { open: false },
      integrity: { healthy: true }
    })).toBe(false);
  });
});
