import { describe, it, expect } from 'vitest';
import {
  BrokenConnectionsDetector,
  WorkerDetector,
  ImportDetector,
  DuplicateDetector,
  DeadCodeDetector
} from '#layer-a/analyses/tier3/detectors/index.js';

describe('analyses/tier3/detectors/index.js', () => {
  it('exports detector constructors', () => {
    expect(BrokenConnectionsDetector).toBeTypeOf('function');
    expect(WorkerDetector).toBeTypeOf('function');
    expect(ImportDetector).toBeTypeOf('function');
    expect(DuplicateDetector).toBeTypeOf('function');
    expect(DeadCodeDetector).toBeTypeOf('function');
  });

  it('BrokenConnectionsDetector analyze returns normalized structure', () => {
    const detector = new BrokenConnectionsDetector();
    const result = detector.analyze({}, {});

    expect(result).toHaveProperty('summary');
    expect(result.summary).toHaveProperty('total');
    expect(result).toHaveProperty('all');
    expect(Array.isArray(result.all)).toBe(true);
  });
});
