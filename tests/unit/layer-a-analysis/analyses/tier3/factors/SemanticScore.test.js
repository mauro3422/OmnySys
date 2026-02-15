import { describe, it, expect } from 'vitest';
import { calculateSemanticScore } from '#layer-a/analyses/tier3/factors/SemanticScore.js';

describe('analyses/tier3/factors/SemanticScore.js', () => {
  it('assigns semantic score based on connection count/severity', () => {
    expect(calculateSemanticScore(Array.from({ length: 8 }, () => ({ severity: 'medium' }))).score).toBe(3);
    expect(calculateSemanticScore([{ severity: 'high' }]).score).toBe(2);
  });
});

