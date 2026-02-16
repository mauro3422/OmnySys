import { describe, it, expect } from 'vitest';
import {
  extractInheritedConnections,
  calculateAverageVibration
} from '#layer-a/pipeline/enhancers/connections/ancestry/index.js';

describe('pipeline/enhancers/connections/ancestry/index.js', () => {
  it('exports ancestry connection helpers', () => {
    expect(extractInheritedConnections).toBeTypeOf('function');
    expect(calculateAverageVibration).toBeTypeOf('function');
  });

  it('calculateAverageVibration returns stable average', () => {
    const avg = calculateAverageVibration([
      { ancestry: { vibrationScore: 0.2 } },
      { ancestry: { vibrationScore: 0.8 } }
    ]);

    expect(avg).toBeCloseTo(0.5);
  });
});
