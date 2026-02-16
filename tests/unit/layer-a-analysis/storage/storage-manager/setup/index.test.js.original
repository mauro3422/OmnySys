import { describe, it, expect } from 'vitest';
import * as setup from '#layer-a/storage/storage-manager/setup/index.js';

describe('storage/storage-manager/setup/index.js', () => {
  it('re-exports setup helpers', () => {
    expect(setup.createDataDirectory).toBeTypeOf('function');
    expect(setup.getDataDirectory).toBeTypeOf('function');
    expect(setup.hasExistingAnalysis).toBeTypeOf('function');
  });
});

