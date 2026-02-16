import { describe, it, expect } from 'vitest';
import {
  collectSemanticIssues,
  detectHighCoupling,
  detectCriticalRisk
} from '#layer-a/pipeline/enhancers/analyzers/semantic-issue-analyzer.js';

describe('pipeline/enhancers/analyzers/semantic-issue-analyzer.js', () => {
  it('exports semantic issue analyzer functions', () => {
    expect(collectSemanticIssues).toBeTypeOf('function');
    expect(detectHighCoupling).toBeTypeOf('function');
    expect(detectCriticalRisk).toBeTypeOf('function');
  });

  it('detects high coupling and critical risk', () => {
    const files = {
      'src/a.js': {
        semanticConnections: new Array(10).fill({}),
        riskScore: { total: 9, breakdown: {} }
      }
    };
    expect(detectHighCoupling(files, 8)).toHaveLength(1);
    expect(detectCriticalRisk(files, 8)).toHaveLength(1);
  });

  it('collects global issue stats', () => {
    const res = collectSemanticIssues(
      {
        files: {
          'src/a.js': { semanticConnections: new Array(9).fill({}), riskScore: { total: 8, breakdown: {} } }
        }
      },
      { globalConnections: new Array(5).fill({}) }
    );
    expect(res.stats.totalIssues).toBeGreaterThan(0);
  });
});
