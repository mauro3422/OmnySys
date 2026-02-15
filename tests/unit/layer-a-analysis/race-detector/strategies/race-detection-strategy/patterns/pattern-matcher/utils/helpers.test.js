import { describe, it, expect } from 'vitest';
import { findAtom, severityRank } from '#layer-a/race-detector/strategies/race-detection-strategy/patterns/pattern-matcher/utils/helpers.js';

describe('race-detector/.../pattern-matcher/utils/helpers.js', () => {
  const project = {
    modules: [{
      files: [{
        atoms: [{ id: 'a1', name: 'alpha' }]
      }]
    }]
  };

  it('finds atom and ranks severity labels', () => {
    expect(findAtom('a1', project)?.name).toBe('alpha');
    expect(findAtom('missing', project)).toBe(null);
    expect(severityRank('critical')).toBe(4);
    expect(severityRank('unknown')).toBe(0);
  });
});

