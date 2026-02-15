import { describe, it, expect } from 'vitest';
import { generateRecommendation, calculateScore } from '../../../../../../../src/layer-a-static/pattern-detection/detectors/shared-objects-detector/analyzers/recommendation-generator.js';

describe('pattern-detection/shared-objects/analyzers/recommendation-generator.js', () => {
  it('generates state recommendation', () => {
    const text = generateRecommendation({ name: 'store', riskProfile: { type: 'state' } });
    expect(text).toContain('Redux');
  });

  it('calculates score from findings severities', () => {
    const score = calculateScore([{ severity: 'critical' }, { severity: 'medium' }]);
    expect(score).toBeLessThan(100);
  });
});

