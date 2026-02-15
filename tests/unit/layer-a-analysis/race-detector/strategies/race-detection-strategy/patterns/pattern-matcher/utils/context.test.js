import { describe, it, expect } from 'vitest';
import { buildContext } from '#layer-a/race-detector/strategies/race-detection-strategy/patterns/pattern-matcher/utils/context.js';

describe('race-detector/.../pattern-matcher/utils/context.js', () => {
  it('builds timing and lock context from analyzers', () => {
    const access1 = { atom: 'a1' };
    const access2 = { atom: 'a2' };
    const project = { modules: [] };
    const timing = {
      canRunConcurrently: () => true,
      sameBusinessFlow: () => false,
      sameEntryPoint: () => true
    };
    const lock = {
      haveCommonLock: () => false,
      getLockProtection: () => null
    };

    const ctx = buildContext(access1, access2, project, { seed: 1 }, timing, lock, {
      checkTiming: true,
      checkLocks: true
    });

    expect(ctx.seed).toBe(1);
    expect(ctx.canRunConcurrently).toBe(true);
    expect(ctx.sameBusinessFlow).toBe(false);
    expect(ctx.hasCommonLock).toBe(false);
  });
});

