import { describe, it, expect } from 'vitest';
import { MetricsCalculator } from '../../../../../../src/layer-a-static/module-system/module-analyzer/metrics/metrics-calculator.js';

describe('module-system/module-analyzer/metrics/metrics-calculator.js', () => {
  it('exports MetricsCalculator class', () => {
    expect(typeof MetricsCalculator).toBe('function');
  });

  it('calculates base metrics', () => {
    const out = new MetricsCalculator([
      { atoms: [{ name: 'a', isExported: true, hasSideEffects: false, complexity: 2, calls: [] }] }
    ]).calculate();
    expect(out.totalFiles).toBe(1);
    expect(out.totalFunctions).toBe(1);
    expect(out.exportedFunctions).toBe(1);
  });
});

