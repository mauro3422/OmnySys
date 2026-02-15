import { describe, it, expect } from 'vitest';
import * as utils from '#layer-a/storage/storage-manager/utils/index.js';

describe('storage/storage-manager/utils/index.js', () => {
  it('re-exports calculateFileHash', () => {
    expect(utils.calculateFileHash).toBeTypeOf('function');
  });
});

