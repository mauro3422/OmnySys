import { describe, expect, it } from 'vitest';

import {
  buildLowCoherenceViolation,
  buildUnusedInputsViolation
} from '../../../../../../src/core/file-watcher/guards/integrity-guard/dataflow-violations.js';

describe('integrity-guard dataflow violations', () => {
  it('attaches propagation to low coherence violations', () => {
    const violation = buildLowCoherenceViolation(
      { id: 'atom-1', name: 'coherentFn', filePath: 'src/coherent.js' },
      { coherence: 0.07, inputs: ['a'], outputs: ['b'], transformations: [] }
    );

    expect(violation.context.propagation).toMatchObject({
      changeType: 'integrity_guard',
      decision: 'review',
      cacheHit: false
    });
  });

  it('attaches propagation to unused inputs violations', () => {
    const violation = buildUnusedInputsViolation(
      { id: 'atom-2', name: 'unusedFn', filePath: 'src/unused.js' },
      { inputs: ['a', 'b'] },
      ['a', 'b']
    );

    expect(violation.context.propagation).toMatchObject({
      changeType: 'integrity_guard',
      decision: 'review',
      cacheHit: false
    });
  });
});
