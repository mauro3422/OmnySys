import { describe, it, expect } from 'vitest';
import * as legacy from '#layer-a/storage/storage-manager.js';

describe('storage/storage-manager.js', () => {
  it('re-exports storage-manager API for backward compatibility', () => {
    expect(legacy.calculateFileHash).toBeTypeOf('function');
    expect(legacy.createDataDirectory).toBeTypeOf('function');
    expect(legacy.saveMetadata).toBeTypeOf('function');
    expect(legacy.saveAtom).toBeTypeOf('function');
    expect(legacy.loadMolecule).toBeTypeOf('function');
  });
});

