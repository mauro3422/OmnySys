import { describe, it, expect } from 'vitest';
import {
  extractEventName,
  getConfidence,
  getObjectName,
  getMethodName,
  isMethodCall
} from '#layer-a/analyses/tier3/event-detector/ast-utils.js';

describe('analyses/tier3/event-detector/ast-utils.js', () => {
  it('extracts event names and confidence from AST-like nodes', () => {
    expect(extractEventName({ type: 'StringLiteral', value: 'login' })).toBe('login');
    expect(extractEventName({ type: 'Identifier', name: 'EVENT' })).toBeNull();
    expect(getConfidence({ type: 'StringLiteral' })).toBe(1);
  });

  it('extracts object/method names and identifies method calls', () => {
    const callee = { type: 'MemberExpression', object: { name: 'bus' }, property: { name: 'emit' } };
    expect(getObjectName(callee)).toBe('bus');
    expect(getMethodName(callee)).toBe('emit');
    expect(isMethodCall({ callee })).toBe(true);
  });
});

