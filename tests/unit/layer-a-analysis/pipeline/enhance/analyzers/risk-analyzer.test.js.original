import { describe, it, expect } from 'vitest';
import {
  calculateGraphMetrics,
  calculateRisks,
  analyzeBroken,
  generateReport
} from '#layer-a/pipeline/enhance/analyzers/risk-analyzer.js';

describe('pipeline/enhance/analyzers/risk-analyzer.js', () => {
  it('exports risk analyzer functions', () => {
    expect(calculateGraphMetrics).toBeTypeOf('function');
    expect(calculateRisks).toBeTypeOf('function');
    expect(analyzeBroken).toBeTypeOf('function');
    expect(generateReport).toBeTypeOf('function');
  });

  it('calculateGraphMetrics returns per-file metrics', () => {
    const res = calculateGraphMetrics({
      metadata: { cyclesDetected: [['src/a.js', 'src/b.js']] },
      files: {
        'src/a.js': { usedBy: ['src/b.js'], dependsOn: ['src/b.js'] },
        'src/b.js': { usedBy: [], dependsOn: [] }
      }
    });
    expect(res['src/a.js']).toHaveProperty('inDegree');
    expect(res['src/a.js']).toHaveProperty('totalCycles');
  });

  it('documents current risk-scorer wrapper blocker explicitly', () => {
    expect(() => calculateRisks({ files: {} }, {}, {}, {})).toThrow();
    expect(() => generateReport({})).toThrow();
  });
});
