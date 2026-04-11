import { describe, it, expect } from 'vitest';
import { analyzeRiskProfile } from '#layer-a/pattern-detection/detectors/shared-objects-detector/analyzers/risk-analyzer.js';

describe('Shared Objects Risk Analyzer', () => {
  it('recognizes config-like objects as lower risk', () => {
    const result = analyzeRiskProfile(
      {
        name: 'CONFIG',
        objectType: 'enum',
        riskLevel: 'low',
        isMutable: false,
        propertyDetails: [{ risk: 'low' }]
      },
      [{}, {}],
      'src/config/constants.js'
    );

    expect(result.type).toBe('enum');
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.factors).toContain('extractor:enum');
    expect(result.factors).toContain('location:config_file');
  });

  it('recognizes state-like mutable objects as higher risk', () => {
    const result = analyzeRiskProfile(
      {
        name: 'globalState',
        objectType: 'state',
        riskLevel: 'high',
        isMutable: true,
        propertyDetails: [
          { risk: 'high' },
          { risk: 'high' }
        ]
      },
      Array(10).fill({}),
      'src/features/state.js'
    );

    expect(result.type).toBe('state');
    expect(result.score).toBeGreaterThan(0);
    expect(result.factors).toContain('extractor:state');
    expect(result.factors).toContain('parser:mutable');
    expect(result.factors).toContain('usage:high');
  });
});
