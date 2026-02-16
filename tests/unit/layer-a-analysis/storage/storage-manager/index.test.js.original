import { describe, it, expect } from 'vitest';
import * as storage from '#layer-a/storage/storage-manager/index.js';

describe('storage/storage-manager/index.js', () => {
  it('exports modular storage operations', () => {
    expect(storage.calculateFileHash).toBeTypeOf('function');
    expect(storage.createDataDirectory).toBeTypeOf('function');
    expect(storage.saveFileAnalysis).toBeTypeOf('function');
    expect(storage.saveMolecule).toBeTypeOf('function');
    expect(storage.saveAtom).toBeTypeOf('function');
  });
});

