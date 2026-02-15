import { describe, it, expect } from 'vitest';
import {
  calculateComplexity,
  detectAtomArchetype,
  recalculateArchetypes
} from '#layer-a/pipeline/phases/atom-extraction/metadata/index.js';

describe('pipeline/phases/atom-extraction/metadata/index.js', () => {
  it('exports metadata helpers', () => {
    expect(calculateComplexity).toBeTypeOf('function');
    expect(detectAtomArchetype).toBeTypeOf('function');
    expect(recalculateArchetypes).toBeTypeOf('function');
  });

  it('calculates complexity and archetypes', () => {
    const complexity = calculateComplexity('if(a){x()} else if(b){y()}');
    expect(complexity).toBeGreaterThan(1);

    const atom = {
      complexity: 2,
      hasSideEffects: false,
      hasNetworkCalls: false,
      externalCallCount: 0,
      linesOfCode: 5,
      isExported: false,
      calledBy: [],
      className: null
    };
    const archetype = detectAtomArchetype(atom);
    expect(archetype).toHaveProperty('type');
  });
});
