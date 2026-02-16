import { describe, it, expect } from 'vitest';
import {
  calculateStaticComplexity,
  calculateSemanticScore,
  calculateSideEffectScore,
  calculateHotspotScore,
  calculateCouplingScore
} from '#layer-a/analyses/tier3/factors/index.js';

describe('analyses/tier3/factors/index.js', () => {
  it('exports all risk factor calculators', () => {
    expect(calculateStaticComplexity).toBeTypeOf('function');
    expect(calculateSemanticScore).toBeTypeOf('function');
    expect(calculateSideEffectScore).toBeTypeOf('function');
    expect(calculateHotspotScore).toBeTypeOf('function');
    expect(calculateCouplingScore).toBeTypeOf('function');
  });

  it('returns stable object contract for each factor', () => {
    const staticRes = calculateStaticComplexity({});
    const semanticRes = calculateSemanticScore([]);
    const sideRes = calculateSideEffectScore({});
    const hotspotRes = calculateHotspotScore({});
    const couplingRes = calculateCouplingScore({});

    [staticRes, semanticRes, sideRes, hotspotRes, couplingRes].forEach((result) => {
      expect(result).toHaveProperty('score');
      expect(typeof result.score).toBe('number');
      expect(result).toHaveProperty('metrics');
    });
  });
});
