import { describe, it, expect } from 'vitest';
import {
  detectAtomArchetype,
  recalculateArchetypes
} from '#layer-a/pipeline/phases/atom-extraction/metadata/archetype.js';

describe('pipeline/phases/atom-extraction/metadata/archetype.js', () => {
  it('detects dead-function and class-method archetypes correctly', () => {
    const dead = detectAtomArchetype({
      complexity: 2,
      hasSideEffects: false,
      hasNetworkCalls: false,
      externalCallCount: 0,
      linesOfCode: 10,
      isExported: false,
      calledBy: [],
      className: null
    });
    const classMethod = detectAtomArchetype({
      complexity: 2,
      hasSideEffects: false,
      hasNetworkCalls: false,
      externalCallCount: 0,
      linesOfCode: 10,
      isExported: false,
      calledBy: [],
      className: 'MyClass'
    });

    expect(dead.type).toBe('dead-function');
    expect(classMethod.type).toBe('class-method');
  });

  it('detects hot-path and network-fragile archetypes', () => {
    const hotPath = detectAtomArchetype({
      complexity: 4,
      hasSideEffects: false,
      hasNetworkCalls: false,
      externalCallCount: 0,
      linesOfCode: 20,
      isExported: true,
      calledBy: ['a', 'b', 'c', 'd', 'e', 'f'],
      className: null
    });
    const fragile = detectAtomArchetype({
      complexity: 6,
      hasSideEffects: true,
      hasNetworkCalls: true,
      hasErrorHandling: false,
      externalCallCount: 2,
      linesOfCode: 30,
      isExported: false,
      calledBy: ['a'],
      className: null
    });

    expect(hotPath.type).toBe('hot-path');
    expect(fragile.type).toBe('fragile-network');
  });

  it('recalculates archetypes in-place for all atoms', () => {
    const atoms = [
      {
        complexity: 1,
        hasSideEffects: false,
        hasNetworkCalls: false,
        externalCallCount: 0,
        linesOfCode: 5,
        isExported: false,
        calledBy: [],
        className: null
      }
    ];

    recalculateArchetypes(atoms);
    expect(atoms[0]).toHaveProperty('archetype');
    expect(atoms[0].archetype).toHaveProperty('type');
  });
});

