import { describe, it, expect } from 'vitest';
import { haveSameAwaitContext } from '#layer-a/race-detector/strategies/race-detection-strategy/analyzers/timing-analyzer/analyzers/patterns.js';

describe('race-detector/.../timing-analyzer/analyzers/patterns.js', () => {
  it('detects same await context and rejects Promise.all context', () => {
    const project = { modules: [] };
    const analyzerSeq = {
      getAtomCallers: () => ['caller::A'],
      findAtomById: () => ({ code: 'const a = await fn1();\nawait fn2(a);' })
    };
    const analyzerConcurrent = {
      getAtomCallers: () => ['caller::A'],
      findAtomById: () => ({ code: 'await Promise.all([fn1(), fn2()]);' })
    };

    expect(haveSameAwaitContext({ atom: 'x' }, { atom: 'y' }, project, analyzerSeq)).toBe(true);
    expect(haveSameAwaitContext({ atom: 'x' }, { atom: 'y' }, project, analyzerConcurrent)).toBe(false);
  });
});

