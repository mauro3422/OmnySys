import { describe, it, expect } from 'vitest';
import {
  sameBusinessFlow,
  analyzeBusinessFlow
} from '#layer-a/race-detector/mitigation/flow-checker.js';

describe('race-detector/mitigation/flow-checker.js', () => {
  it('uses strategy override when provided', () => {
    const strategies = [{ sameBusinessFlow: () => true }];
    const result = sameBusinessFlow({ file: 'a.js' }, { file: 'b.js' }, {}, strategies);
    expect(result).toBe(true);
  });

  it('falls back to same-file sequential heuristic', () => {
    expect(sameBusinessFlow(
      { file: 'a.js', atom: 'x', line: 10 },
      { file: 'a.js', atom: 'x', line: 15 },
      {}
    )).toBe(true);

    expect(sameBusinessFlow(
      { file: 'a.js', atom: 'x', line: 10 },
      { file: 'a.js', atom: 'y', line: 15 },
      {}
    )).toBe(false);
  });

  it('returns flow analysis only when same flow', () => {
    expect(analyzeBusinessFlow(
      { file: 'a.js', atom: 'x', line: 2 },
      { file: 'a.js', atom: 'x', line: 5 },
      {}
    )).toMatchObject({ type: 'sequential', confidence: 'medium' });

    expect(analyzeBusinessFlow(
      { file: 'a.js', atom: 'x', line: 2 },
      { file: 'b.js', atom: 'x', line: 5 },
      {}
    )).toBe(null);
  });
});

