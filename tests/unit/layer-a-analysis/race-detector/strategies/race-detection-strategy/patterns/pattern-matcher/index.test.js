import { describe, it, expect } from 'vitest';

describe('race-detector/.../patterns/pattern-matcher/index.js', () => {
  it('currently exposes import-path blocker from matcher core', async () => {
    await expect(
      import('#layer-a/race-detector/strategies/race-detection-strategy/patterns/pattern-matcher/index.js')
    ).rejects.toThrow("Cannot find module '../../analyzers/shared-state-analyzer.js'");
  });
});
