import { describe, it, expect } from 'vitest';
import * as api from '../../../../../../src/layer-a-static/pattern-detection/detectors/shared-objects-detector/index.js';

describe('pattern-detection/shared-objects/index.js', () => {
  it('exports detector + analyzers + patterns API', () => {
    expect(typeof api.SharedObjectsDetector).toBe('function');
    expect(typeof api.analyzeRiskProfile).toBe('function');
    expect(typeof api.countUsages).toBe('function');
    expect(typeof api.generateRecommendation).toBe('function');
    expect(typeof api.calculateScore).toBe('function');
    expect(typeof api.isConfigObject).toBe('function');
    expect(typeof api.isStateObject).toBe('function');
    expect(typeof api.isUtilsObject).toBe('function');
  });
});

