import { describe, it, expect } from 'vitest';
import {
  RiskScorer,
  TypeScorer,
  AsyncScorer,
  DataIntegrityScorer,
  ScopeScorer,
  ImpactScorer,
  FrequencyScorer,
  TestingAdvisor
} from '#layer-a/race-detector/scorers/index.js';

describe('race-detector/scorers/index.js', () => {
  it('exports all scorer constructors', () => {
    expect(RiskScorer).toBeTypeOf('function');
    expect(TypeScorer).toBeTypeOf('function');
    expect(AsyncScorer).toBeTypeOf('function');
    expect(DataIntegrityScorer).toBeTypeOf('function');
    expect(ScopeScorer).toBeTypeOf('function');
    expect(ImpactScorer).toBeTypeOf('function');
    expect(FrequencyScorer).toBeTypeOf('function');
    expect(TestingAdvisor).toBeTypeOf('function');
  });
});
