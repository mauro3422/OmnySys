import { describe, it, expect } from 'vitest';
import {
  findCapturedVariables,
  calculateCaptureRisk
} from '#layer-a/race-detector/closure-analysis/capture-detector.js';

describe('race-detector/closure-analysis/capture-detector.js', () => {
  it('returns empty list when atom has no code', () => {
    expect(findCapturedVariables({ id: 'a1' })).toEqual([]);
  });

  it('detects captured shared/global vars from closures', () => {
    const atom = {
      id: 'a2',
      isAsync: true,
      code: `
        const local = 1;
        const run = () => { stateCache++; local++; };
        promise.then(() => { global.value = 2; });
      `
    };

    const captured = findCapturedVariables(atom);
    const names = captured.map(c => c.name);
    expect(names).toContain('stateCache');
    expect(names).not.toContain('local');
  });

  it('calculates capture risk based on atom/variable properties', () => {
    expect(calculateCaptureRisk('stateCache', { isAsync: false })).toBe('high');
    expect(calculateCaptureRisk('localValue', { isAsync: true })).toBe('high');
    expect(calculateCaptureRisk('plainVar', { isAsync: false })).toBe('medium');
  });
});
