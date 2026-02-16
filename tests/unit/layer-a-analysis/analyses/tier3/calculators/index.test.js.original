import { describe, it, expect } from 'vitest';
import {
  calculateRiskScore,
  calculateScoreSeverity,
  getSeverityThreshold,
  ReportGenerator
} from '#layer-a/analyses/tier3/calculators/index.js';

describe('analyses/tier3/calculators/index.js', () => {
  it('exports calculator contracts', () => {
    expect(calculateRiskScore).toBeTypeOf('function');
    expect(calculateScoreSeverity).toBeTypeOf('function');
    expect(getSeverityThreshold).toBeTypeOf('function');
    expect(ReportGenerator).toBeTypeOf('function');
  });

  it('calculates deterministic severity thresholds', () => {
    expect(calculateScoreSeverity(8)).toBe('critical');
    expect(calculateScoreSeverity(6)).toBe('high');
    expect(calculateScoreSeverity(3)).toBe('medium');
    expect(calculateScoreSeverity(2)).toBe('low');
    expect(getSeverityThreshold('critical')).toBe(8);
  });

  it('returns score breakdown with expected fields', () => {
    const result = calculateRiskScore({}, [], {}, {});
    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('breakdown');
    expect(result.breakdown).toHaveProperty('staticComplexity');
  });

  it('ReportGenerator can be constructed', () => {
    const generator = new ReportGenerator();
    expect(generator).toBeInstanceOf(ReportGenerator);
    expect(generator.generate).toBeTypeOf('function');
  });
});
