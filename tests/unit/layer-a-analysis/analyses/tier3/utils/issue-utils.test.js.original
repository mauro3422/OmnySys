import { describe, it, expect } from 'vitest';
import { groupByFile, sortBySeverity } from '#layer-a/analyses/tier3/utils/issue-utils.js';

describe('analyses/tier3/utils/issue-utils.js', () => {
  it('groups issues by sourceFile/file field', () => {
    const out = groupByFile([{ sourceFile: 'a.js' }, { file: 'b.js' }, { sourceFile: 'a.js' }]);
    expect(out['a.js'].length).toBe(2);
    expect(out['b.js'].length).toBe(1);
  });

  it('sorts issues by HIGH -> MEDIUM -> LOW', () => {
    const out = sortBySeverity([{ severity: 'LOW' }, { severity: 'HIGH' }, { severity: 'MEDIUM' }]);
    expect(out[0].severity).toBe('HIGH');
    expect(out[2].severity).toBe('LOW');
  });
});

