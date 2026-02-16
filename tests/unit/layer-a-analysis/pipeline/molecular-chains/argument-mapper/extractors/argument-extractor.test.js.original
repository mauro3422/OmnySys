import { describe, it, expect } from 'vitest';
import {
  extractArgumentCode,
  extractRootVariable
} from '#layer-a/pipeline/molecular-chains/argument-mapper/extractors/argument-extractor.js';

describe('pipeline/molecular-chains/argument-mapper/extractors/argument-extractor.js', () => {
  it('extracts argument code for primitive and object forms', () => {
    expect(extractArgumentCode('rawArg')).toBe('rawArg');
    expect(
      extractArgumentCode({
        type: 'MemberExpression',
        object: 'order',
        property: 'items'
      })
    ).toBe('order.items');
  });

  it('extracts argument code for nested call expressions', () => {
    const value = extractArgumentCode({
      type: 'CallExpression',
      callee: 'transform',
      arguments: [{ name: 'x' }, { code: '2' }]
    });
    expect(value).toBe('transform(x, 2)');
  });

  it('extracts root variable from supported node shapes', () => {
    expect(extractRootVariable({ type: 'Identifier', name: 'id' })).toBe('id');
    expect(
      extractRootVariable({
        type: 'MemberExpression',
        object: { name: 'order' },
        property: { name: 'id' }
      })
    ).toBe('order');
    expect(extractRootVariable({ variable: 'fromVar' })).toBe('fromVar');
    expect(extractRootVariable({ type: 'Literal', value: 10 })).toBe(null);
  });
});

