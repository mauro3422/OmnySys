import { describe, it, expect } from 'vitest';

describe('race-detector/.../pattern-matcher/matchers/core.js', () => {
  it('currently exposes import-path blocker from nested analyzer imports', async () => {
    await expect(
      import('#layer-a/race-detector/strategies/race-detection-strategy/patterns/pattern-matcher/matchers/core.js')
    ).rejects.toThrow("Cannot find module '../../analyzers/shared-state-analyzer.js'");
  });
});
