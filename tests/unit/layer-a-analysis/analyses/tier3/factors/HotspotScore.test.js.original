import { describe, it, expect } from 'vitest';
import { calculateHotspotScore } from '#layer-a/analyses/tier3/factors/HotspotScore.js';

describe('analyses/tier3/factors/HotspotScore.js', () => {
  it('assigns hotspot score from in/out degree metrics', () => {
    expect(calculateHotspotScore({ inDegree: 16, outDegree: 5 }).score).toBe(2);
    expect(calculateHotspotScore({ inDegree: 9, outDegree: 11 }).score).toBe(1);
  });
});

