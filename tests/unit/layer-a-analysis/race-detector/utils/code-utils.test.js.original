import { describe, it, expect } from 'vitest';
import {
  getCodeContext,
  extractVariable,
  hasAsyncOperation
} from '#layer-a/race-detector/utils/code-utils.js';

describe('race-detector/utils/code-utils.js', () => {
  it('returns code context and extracts variable from assignment-like code', () => {
    expect(getCodeContext({ code: 'count += 1' })).toBe('count += 1');
    expect(getCodeContext({})).toBe(null);
    expect(extractVariable('total = next + 1')).toBe('total');
    expect(extractVariable('value += 2')).toBe('value');
  });

  it('detects async operation patterns', () => {
    expect(hasAsyncOperation('await fetchData()')).toBe(true);
    expect(hasAsyncOperation('Promise.resolve(1)')).toBe(true);
    expect(hasAsyncOperation('const x = 1 + 2')).toBe(false);
  });
});

