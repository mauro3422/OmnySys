import { describe, it, expect } from 'vitest';
import {
  calculateAllWeights,
  calculateConnectionWeight,
  getConnectionCategory,
  getWeightStats
} from '#layer-a/pipeline/enhancers/connections/weights/index.js';

describe('pipeline/enhancers/connections/weights/index.js', () => {
  it('exports weight calculation helpers', () => {
    expect(calculateAllWeights).toBeTypeOf('function');
    expect(calculateConnectionWeight).toBeTypeOf('function');
    expect(getConnectionCategory).toBeTypeOf('function');
    expect(getWeightStats).toBeTypeOf('function');
  });

  it('calculates categories and stats deterministically', () => {
    const atomIndex = new Map([['a', { id: 'a' }]]);
    const weight = calculateConnectionWeight({ type: 'import', confidence: 1, from: 'a' }, atomIndex);
    const category = getConnectionCategory(weight);
    const stats = getWeightStats([{ weight, connectionCategory: category }]);

    expect(weight).toBeGreaterThan(0);
    expect(['weak', 'medium', 'strong', 'critical']).toContain(category);
    expect(stats).toHaveProperty('average');
  });
});
