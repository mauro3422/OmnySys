import { describe, it, expect } from 'vitest';
import { BrokenConnectionsDetector } from '#layer-a/analyses/tier3/detectors/BrokenConnectionsDetector.js';

describe('analyses/tier3/detectors/BrokenConnectionsDetector.js', () => {
  it('analyzes broken connection categories with safe defaults', () => {
    const detector = new BrokenConnectionsDetector();
    const out = detector.analyze({}, {});
    expect(out).toHaveProperty('summary');
    expect(out).toHaveProperty('brokenWorkers');
    expect(out).toHaveProperty('all');
    expect(Array.isArray(out.all)).toBe(true);
  });
});

