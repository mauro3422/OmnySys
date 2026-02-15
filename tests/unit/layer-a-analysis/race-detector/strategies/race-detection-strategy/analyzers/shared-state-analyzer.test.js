import { describe, it, expect } from 'vitest';
import SharedStateAnalyzerDefault, { SharedStateAnalyzer } from '#layer-a/race-detector/strategies/race-detection-strategy/analyzers/shared-state-analyzer.js';
import { SharedStateAnalyzer as DetectorSharedStateAnalyzer } from '#layer-a/race-detector/strategies/race-detection-strategy/detectors/SharedStateAnalyzer.js';

describe('race-detector/.../analyzers/shared-state-analyzer.js', () => {
  it('re-exports detector SharedStateAnalyzer for backward compatibility', () => {
    expect(SharedStateAnalyzer).toBe(DetectorSharedStateAnalyzer);
    expect(SharedStateAnalyzerDefault).toBe(DetectorSharedStateAnalyzer);
  });
});

