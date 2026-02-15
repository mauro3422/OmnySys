import { describe, it, expect } from 'vitest';
import * as legacy from '#layer-a/analyses/tier3/broken-connections-detector.js';

describe('analyses/tier3/broken-connections-detector.js', () => {
  it('exports compatibility wrapper API', () => {
    expect(legacy.detectBrokenWorkers).toBeTypeOf('function');
    expect(legacy.detectBrokenDynamicImports).toBeTypeOf('function');
    expect(legacy.detectDuplicateFunctions).toBeTypeOf('function');
    expect(legacy.detectDeadFunctions).toBeTypeOf('function');
    expect(legacy.detectSuspiciousUrls).toBeTypeOf('function');
    expect(legacy.analyzeBrokenConnections).toBeTypeOf('function');
  });

  it('can run analysis with empty inputs', () => {
    const out = legacy.analyzeBrokenConnections({}, {});
    expect(out).toHaveProperty('summary');
    expect(out).toHaveProperty('all');
    expect(Array.isArray(out.all)).toBe(true);
  });
});

