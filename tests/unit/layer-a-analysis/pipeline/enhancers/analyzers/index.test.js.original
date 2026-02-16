import { describe, it, expect } from 'vitest';
import {
  collectSemanticIssues,
  detectHighCoupling,
  detectCriticalRisk
} from '#layer-a/pipeline/enhancers/analyzers/index.js';

describe('pipeline/enhancers/analyzers/index.js', () => {
  it('exports semantic issue analyzer contract', () => {
    expect(collectSemanticIssues).toBeTypeOf('function');
    expect(detectHighCoupling).toBeTypeOf('function');
    expect(detectCriticalRisk).toBeTypeOf('function');
  });

  it('detectHighCoupling flags files above threshold', () => {
    const issues = detectHighCoupling({
      'src/a.js': { semanticConnections: new Array(10).fill({}) },
      'src/b.js': { semanticConnections: [] }
    }, 8);

    expect(issues.length).toBe(1);
    expect(issues[0].file).toBe('src/a.js');
  });
});
