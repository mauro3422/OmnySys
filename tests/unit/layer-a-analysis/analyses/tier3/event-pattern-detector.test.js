import { describe, it, expect } from 'vitest';
import * as legacy from '#layer-a/analyses/tier3/event-pattern-detector.js';

describe('analyses/tier3/event-pattern-detector.js', () => {
  it('re-exports event-detector modular API for compatibility', () => {
    expect(legacy.detectEventPatterns).toBeTypeOf('function');
    expect(legacy.generateEventConnections).toBeTypeOf('function');
  });
});

