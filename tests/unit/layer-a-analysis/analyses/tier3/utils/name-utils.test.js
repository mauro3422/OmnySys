import { describe, it, expect } from 'vitest';
import { isCommonFunctionName, normalizeName } from '#layer-a/analyses/tier3/utils/name-utils.js';

describe('analyses/tier3/utils/name-utils.js', () => {
  it('detects common function names and patterns', () => {
    expect(isCommonFunctionName('main')).toBe(true);
    expect(isCommonFunctionName('handleSubmit')).toBe(true);
    expect(isCommonFunctionName('calculateRevenue')).toBe(false);
  });

  it('normalizes names by lowercasing and removing separators', () => {
    expect(normalizeName('My_Function-Name')).toBe('myfunctionname');
  });
});

