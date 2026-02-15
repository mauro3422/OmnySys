import { describe, it, expect } from 'vitest';
import {
  calculateScoreSeverity,
  getSeverityThreshold
} from '#layer-a/analyses/tier3/calculators/SeverityCalculator.js';

describe('analyses/tier3/calculators/SeverityCalculator.js', () => {
  it('maps numeric score to severity buckets', () => {
    expect(calculateScoreSeverity(8)).toBe('critical');
    expect(calculateScoreSeverity(6)).toBe('high');
    expect(calculateScoreSeverity(3)).toBe('medium');
    expect(calculateScoreSeverity(1)).toBe('low');
  });

  it('returns threshold for known severity values', () => {
    expect(getSeverityThreshold('critical')).toBe(8);
    expect(getSeverityThreshold('high')).toBe(6);
    expect(getSeverityThreshold('unknown')).toBe(0);
  });
});

