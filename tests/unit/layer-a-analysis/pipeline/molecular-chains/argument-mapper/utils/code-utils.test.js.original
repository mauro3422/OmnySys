import { describe, it, expect } from 'vitest';
import {
  findVariableUsages,
  escapeRegex
} from '#layer-a/pipeline/molecular-chains/argument-mapper/utils/code-utils.js';

describe('pipeline/molecular-chains/argument-mapper/utils/code-utils.js', () => {
  it('finds variable usages after specified line', () => {
    const code = [
      'const total = sum(items);',
      'const copy = total;',
      'log(total);'
    ].join('\n');

    const usages = findVariableUsages('total', code, 1);
    expect(usages).toHaveLength(2);
    expect(usages[0].line).toBe(2);
  });

  it('escapes regex special characters', () => {
    const escaped = escapeRegex('sum(items)+v2?');
    expect(escaped).toBe('sum\\(items\\)\\+v2\\?');
  });
});

