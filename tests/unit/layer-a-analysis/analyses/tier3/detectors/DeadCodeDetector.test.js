import { describe, it, expect } from 'vitest';
import { DeadCodeDetector } from '#layer-a/analyses/tier3/detectors/DeadCodeDetector.js';

describe('analyses/tier3/detectors/DeadCodeDetector.js', () => {
  it('detects uncalled non-exported functions as dead code', () => {
    const detector = new DeadCodeDetector();
    const out = detector.detect({
      functions: {
        'a.js': [{ name: 'unused', isExported: false, calls: [], usedBy: [] }]
      }
    });
    expect(out.total).toBe(1);
    expect(out.all[0].type).toBe('DEAD_FUNCTION');
  });
});

