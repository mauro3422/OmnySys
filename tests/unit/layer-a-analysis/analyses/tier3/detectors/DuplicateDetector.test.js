import { describe, it, expect } from 'vitest';
import { DuplicateDetector } from '#layer-a/analyses/tier3/detectors/DuplicateDetector.js';

describe('analyses/tier3/detectors/DuplicateDetector.js', () => {
  it('detects duplicated uncommon function names across files', () => {
    const detector = new DuplicateDetector();
    const out = detector.detect({
      functions: {
        'a.js': [{ name: 'calculateRevenue' }],
        'b.js': [{ name: 'calculateRevenue' }]
      }
    });
    expect(out.total).toBe(1);
    expect(out.all[0].functionName).toBe('calculateRevenue');
  });
});

