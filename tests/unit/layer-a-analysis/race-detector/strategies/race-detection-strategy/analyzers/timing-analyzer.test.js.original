import { describe, it, expect } from 'vitest';
import TimingAnalyzerDefault, { TimingAnalyzer } from '#layer-a/race-detector/strategies/race-detection-strategy/analyzers/timing-analyzer.js';
import { TimingAnalyzer as DetectorTimingAnalyzer } from '#layer-a/race-detector/strategies/race-detection-strategy/detectors/TimingAnalyzer.js';

describe('race-detector/.../analyzers/timing-analyzer.js', () => {
  it('re-exports detector TimingAnalyzer for backward compatibility', () => {
    expect(TimingAnalyzer).toBe(DetectorTimingAnalyzer);
    expect(TimingAnalyzerDefault).toBe(DetectorTimingAnalyzer);
  });
});

