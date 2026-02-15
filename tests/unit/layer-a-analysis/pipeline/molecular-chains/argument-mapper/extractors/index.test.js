import { describe, it, expect } from 'vitest';
import {
  extractArgumentCode,
  extractRootVariable
} from '#layer-a/pipeline/molecular-chains/argument-mapper/extractors/index.js';

describe('pipeline/molecular-chains/argument-mapper/extractors/index.js', () => {
  it('exports extractor functions', () => {
    expect(extractArgumentCode).toBeTypeOf('function');
    expect(extractRootVariable).toBeTypeOf('function');
  });

  it('extracts argument code and root variable', () => {
    const member = { type: 'MemberExpression', object: 'order', property: 'items' };
    expect(extractArgumentCode(member)).toBe('order.items');
    expect(extractRootVariable({ type: 'Identifier', name: 'payload' })).toBe('payload');
  });
});
