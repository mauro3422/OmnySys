import { describe, it, expect } from 'vitest';
import { detectIntervals } from '#layer-a/extractors/metadata/temporal-connections/detectors/interval-detector.js';
import intervalDetector from '#layer-a/extractors/metadata/temporal-connections/detectors/interval-detector.js';

describe('extractors/metadata/temporal-connections/detectors/interval-detector.js', () => {
  it('detects setInterval and classifies interval speed', () => {
    const out = detectIntervals('setInterval(() => refresh(), 50);');
    expect(out.length).toBe(1);
    expect(out[0].type).toBe('setInterval');
    expect(out[0].intervalCategory).toBe('fast');
  });

  it('detects generic interval call without explicit ms', () => {
    const out = detectIntervals('setInterval(runTask);');
    expect(out[0]).toHaveProperty('recurring', true);
  });

  it('default detector strategy supports interval code', () => {
    expect(intervalDetector.name).toBe('interval');
    expect(intervalDetector.supports('setInterval(x, 1000)')).toBe(true);
  });
});

