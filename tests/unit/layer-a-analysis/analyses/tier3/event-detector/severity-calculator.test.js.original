import { describe, it, expect } from 'vitest';
import {
  calculateEventSeverity,
  isCriticalEventName,
  calculateAverageConfidence,
  determineConnectionSeverity
} from '#layer-a/analyses/tier3/event-detector/severity-calculator.js';

describe('analyses/tier3/event-detector/severity-calculator.js', () => {
  it('computes severity based on counts and critical event names', () => {
    expect(calculateEventSeverity('auth:login', 1, 1)).toBe('high');
    expect(calculateEventSeverity('update', 2, 2)).toBe('critical');
    expect(isCriticalEventName('fatal-error')).toBe(true);
  });

  it('computes confidence average and connection severity', () => {
    expect(calculateAverageConfidence(0.8, 0.6, 2)).toBeCloseTo(0.7);
    expect(determineConnectionSeverity(['auth.login'], 1)).toBe('high');
  });
});

