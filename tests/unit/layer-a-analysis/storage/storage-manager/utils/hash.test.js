import { describe, it, expect } from 'vitest';
import { calculateFileHash } from '#layer-a/storage/storage-manager/utils/hash.js';

describe('storage/storage-manager/utils/hash.js', () => {
  it('returns stable 8-char hash for file path', () => {
    const a = calculateFileHash('src/a.js');
    const b = calculateFileHash('src/a.js');
    expect(a).toHaveLength(8);
    expect(a).toBe(b);
  });
});

