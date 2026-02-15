import { describe, it, expect } from 'vitest';
import * as files from '#layer-a/storage/storage-manager/files/index.js';

describe('storage/storage-manager/files/index.js', () => {
  it('re-exports file persistence operations', () => {
    expect(files.saveMetadata).toBeTypeOf('function');
    expect(files.saveFileAnalysis).toBeTypeOf('function');
    expect(files.saveConnections).toBeTypeOf('function');
    expect(files.saveRiskAssessment).toBeTypeOf('function');
    expect(files.savePartitionedSystemMap).toBeTypeOf('function');
  });
});

