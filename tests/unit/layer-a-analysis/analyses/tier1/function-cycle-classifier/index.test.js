import { describe, it, expect } from 'vitest';
import {
  classifyFunctionCycle,
  classifyAllFunctionCycles
} from '#layer-a/analyses/tier1/function-cycle-classifier/index.js';

describe('analyses/tier1/function-cycle-classifier/index.js', () => {
  it('classifies cycles using extracted metadata', () => {
    const cycle = ['src/a.js::initApp', 'src/a.js::initApp'];
    const atomsIndex = {
      'src/a.js': {
        atoms: [{ name: 'initApp', complexity: 1 }]
      }
    };
    const out = classifyFunctionCycle(cycle, atomsIndex);
    expect(out).toHaveProperty('category');
    expect(out).toHaveProperty('severity');
  });

  it('returns empty aggregate for no cycles', () => {
    const out = classifyAllFunctionCycles([], {});
    expect(out.total).toBe(0);
    expect(out.classifications).toEqual([]);
  });
});

