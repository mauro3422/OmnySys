import { describe, it, expect } from 'vitest';
import { detectPromises } from '#layer-a/extractors/metadata/temporal-connections/detectors/promise-detector.js';
import promiseDetector from '#layer-a/extractors/metadata/temporal-connections/detectors/promise-detector.js';

describe('extractors/metadata/temporal-connections/detectors/promise-detector.js', () => {
  it('detects async/await and Promise.all usage', () => {
    const code = 'async function run(){ await Promise.all([a(), b()]); }';
    const out = detectPromises(code, { isAsync: true });
    expect(out.isAsync).toBe(true);
    expect(out.hasAwait).toBe(true);
    expect(out.hasPromiseAll).toBe(true);
    expect(out.parallelOperations.length).toBeGreaterThan(0);
  });

  it('detects sequential awaits', () => {
    const code = 'async function x(){ await a(); await b(); }';
    const out = detectPromises(code);
    expect(out.sequentialOperations.some(op => op.type === 'sequential-awaits')).toBe(true);
  });

  it('default detector strategy supports async code', () => {
    expect(promiseDetector.name).toBe('promise');
    expect(promiseDetector.supports('await loadData()')).toBe(true);
  });
});

