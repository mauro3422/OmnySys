import { describe, it, expect } from 'vitest';
import { countUsages } from '../../../../../../../src/layer-a-static/pattern-detection/detectors/shared-objects-detector/analyzers/usage-counter.js';

describe('pattern-detection/shared-objects/analyzers/usage-counter.js', () => {
  it('counts imported usages across files', () => {
    const out = countUsages('sharedStore', {
      files: {
        'a.js': { imports: [{ source: './s', line: 1, specifiers: [{ imported: 'sharedStore' }] }] },
        'b.js': { imports: [{ source: './s', line: 1, specifiers: [{ local: 'sharedStore' }] }] }
      }
    });
    expect(out).toHaveLength(2);
  });
});

