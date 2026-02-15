import { describe, it, expect } from 'vitest';
import { analyzeRiskProfile } from '../../../../../../../src/layer-a-static/pattern-detection/detectors/shared-objects-detector/analyzers/risk-analyzer.js';

describe('pattern-detection/shared-objects/analyzers/risk-analyzer.js', () => {
  it('returns normalized risk profile', () => {
    const out = analyzeRiskProfile({ name: 'authStore', isMutable: true }, [{ file: 'a.js' }], 'src/auth/store.js');
    expect(out).toHaveProperty('score');
    expect(out).toHaveProperty('type');
    expect(Array.isArray(out.factors)).toBe(true);
  });
});

