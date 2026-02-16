import { describe, it, expect } from 'vitest';
import {
  analyzeFile,
  analyzeAllFiles,
  calculateGraphMetrics,
  calculateRisks,
  analyzeBroken,
  generateReport
} from '#layer-a/pipeline/enhance/analyzers/index.js';

describe('pipeline/enhance/analyzers/index.js', () => {
  it('exports analyzer contract', () => {
    expect(analyzeFile).toBeTypeOf('function');
    expect(analyzeAllFiles).toBeTypeOf('function');
    expect(calculateGraphMetrics).toBeTypeOf('function');
    expect(calculateRisks).toBeTypeOf('function');
    expect(analyzeBroken).toBeTypeOf('function');
    expect(generateReport).toBeTypeOf('function');
  });

  it('calculateGraphMetrics returns deterministic structure', () => {
    const result = calculateGraphMetrics({
      metadata: { cyclesDetected: [['src/a.js', 'src/b.js']] },
      files: {
        'src/a.js': { usedBy: ['src/b.js'], dependsOn: ['src/b.js'] },
        'src/b.js': { usedBy: [], dependsOn: ['src/a.js'] }
      }
    });

    expect(result['src/a.js']).toHaveProperty('inDegree');
    expect(result['src/a.js']).toHaveProperty('outDegree');
    expect(result['src/a.js']).toHaveProperty('totalCycles');
  });
});
