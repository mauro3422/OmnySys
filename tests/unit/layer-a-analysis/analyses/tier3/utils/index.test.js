import { describe, it, expect } from 'vitest';
import { groupByFile, sortBySeverity, isCommonFunctionName, normalizeName } from '#layer-a/analyses/tier3/utils/index.js';

describe('analyses/tier3/utils/index.js', () => {
  it('exports utility functions', () => {
    expect(groupByFile).toBeTypeOf('function');
    expect(sortBySeverity).toBeTypeOf('function');
    expect(isCommonFunctionName).toBeTypeOf('function');
    expect(normalizeName).toBeTypeOf('function');
  });

  it('groupByFile groups issues using sourceFile/file keys', () => {
    const grouped = groupByFile([
      { sourceFile: 'src/a.js', type: 'A' },
      { file: 'src/a.js', type: 'B' },
      { sourceFile: 'src/b.js', type: 'C' }
    ]);

    expect(Object.keys(grouped)).toHaveLength(2);
    expect(grouped['src/a.js']).toHaveLength(2);
  });

  it('normalizeName and name checks keep deterministic behavior', () => {
    expect(normalizeName('User_Profile')).toBe('userprofile');
    expect(isCommonFunctionName('onClick')).toBe(true);
    expect(isCommonFunctionName('highlySpecificBusinessFlow')).toBe(false);
  });

  it('sortBySeverity orders HIGH before MEDIUM before LOW', () => {
    const sorted = sortBySeverity([
      { severity: 'LOW' },
      { severity: 'HIGH' },
      { severity: 'MEDIUM' }
    ]);

    expect(sorted.map((x) => x.severity)).toEqual(['HIGH', 'MEDIUM', 'LOW']);
  });
});
