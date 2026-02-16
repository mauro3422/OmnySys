import { describe, it, expect } from 'vitest';
import { detectTimeouts } from '#layer-a/extractors/metadata/temporal-connections/detectors/timeout-detector.js';
import timeoutDetector from '#layer-a/extractors/metadata/temporal-connections/detectors/timeout-detector.js';

describe('extractors/metadata/temporal-connections/detectors/timeout-detector.js', () => {
  it('detects setTimeout with explicit delay', () => {
    const out = detectTimeouts('setTimeout(() => run(), 1000);');
    expect(out.length).toBe(1);
    expect(out[0].delay).toBe(1000);
    expect(out[0].delayCategory).toBe('normal');
  });

  it('detects timeout without explicit delay as unknown', () => {
    const out = detectTimeouts('setTimeout(runTask);');
    expect(out.length).toBe(1);
    expect(out[0].delay).toBe('unknown');
  });

  it('default detector strategy supports timeout code', () => {
    expect(timeoutDetector.name).toBe('timeout');
    expect(timeoutDetector.supports('setTimeout(fn, 0)')).toBe(true);
  });
});

