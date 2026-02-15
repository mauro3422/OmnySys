/**
 * @fileoverview index.test.js
 * 
 * Tests for race-detector module exports.
 * 
 * @module tests/unit/layer-a-analysis/race-detector/index
 */

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
} from '#layer-a/race-detector/index.js';
import { ScoreWeights } from '#layer-a/race-detector/index.js';

describe('Race Detector Index', () => {
  describe('Structure Contract', () => {
    it('should export RiskScorer class', () => {
      expect(RiskScorer).toBeDefined();
      expect(typeof RiskScorer).toBe('function');
    });

    it('should export TypeScorer class', () => {
      expect(TypeScorer).toBeDefined();
      expect(typeof TypeScorer).toBe('function');
    });

    it('should export AsyncScorer class', () => {
      expect(AsyncScorer).toBeDefined();
      expect(typeof AsyncScorer).toBe('function');
    });

    it('should export DataIntegrityScorer class', () => {
      expect(DataIntegrityScorer).toBeDefined();
      expect(typeof DataIntegrityScorer).toBe('function');
    });

    it('should export ScopeScorer class', () => {
      expect(ScopeScorer).toBeDefined();
      expect(typeof ScopeScorer).toBe('function');
    });

    it('should export ImpactScorer class', () => {
      expect(ImpactScorer).toBeDefined();
      expect(typeof ImpactScorer).toBe('function');
    });

    it('should export FrequencyScorer class', () => {
      expect(FrequencyScorer).toBeDefined();
      expect(typeof FrequencyScorer).toBe('function');
    });

    it('should export TestingAdvisor class', () => {
      expect(TestingAdvisor).toBeDefined();
      expect(typeof TestingAdvisor).toBe('function');
    });

    it('should export ScoreWeights class', () => {
      expect(ScoreWeights).toBeDefined();
      expect(typeof ScoreWeights).toBe('function');
    });

    it('should export RiskScorer as default', async () => {
      const module = await import('#layer-a/race-detector/index.js');
      expect(module.default).toBe(RiskScorer);
    });
  });

  describe('Class Instantiation', () => {
    it('should create RiskScorer instance', () => {
      const scorer = new RiskScorer();
      expect(scorer).toBeInstanceOf(RiskScorer);
    });

    it('should create TypeScorer instance with weights', () => {
      const weights = new ScoreWeights();
      const scorer = new TypeScorer(weights);
      expect(scorer).toBeInstanceOf(TypeScorer);
    });

    it('should create AsyncScorer instance with weights', () => {
      const weights = new ScoreWeights();
      const scorer = new AsyncScorer(weights);
      expect(scorer).toBeInstanceOf(AsyncScorer);
    });

    it('should create DataIntegrityScorer instance with weights', () => {
      const weights = new ScoreWeights();
      const scorer = new DataIntegrityScorer(weights);
      expect(scorer).toBeInstanceOf(DataIntegrityScorer);
    });

    it('should create ScopeScorer instance with weights', () => {
      const weights = new ScoreWeights();
      const scorer = new ScopeScorer(weights);
      expect(scorer).toBeInstanceOf(ScopeScorer);
    });

    it('should create ImpactScorer instance', () => {
      const scorer = new ImpactScorer();
      expect(scorer).toBeInstanceOf(ImpactScorer);
    });

    it('should create FrequencyScorer instance', () => {
      const scorer = new FrequencyScorer();
      expect(scorer).toBeInstanceOf(FrequencyScorer);
    });

    it('should create TestingAdvisor instance', () => {
      const advisor = new TestingAdvisor();
      expect(advisor).toBeInstanceOf(TestingAdvisor);
    });

    it('should create ScoreWeights instance', () => {
      const weights = new ScoreWeights();
      expect(weights).toBeInstanceOf(ScoreWeights);
    });
  });

  describe('Error Handling Contract', () => {
    it('should handle RiskScorer instantiation without errors', () => {
      expect(() => new RiskScorer()).not.toThrow();
    });

    it('should handle TypeScorer instantiation without weights', () => {
      expect(() => new TypeScorer()).not.toThrow();
    });

    it('should handle AsyncScorer instantiation without weights', () => {
      expect(() => new AsyncScorer()).not.toThrow();
    });

    it('should handle DataIntegrityScorer instantiation without weights', () => {
      expect(() => new DataIntegrityScorer()).not.toThrow();
    });

    it('should handle ScopeScorer instantiation without weights', () => {
      expect(() => new ScopeScorer()).not.toThrow();
    });

    it('should handle ImpactScorer instantiation without errors', () => {
      expect(() => new ImpactScorer()).not.toThrow();
    });

    it('should handle FrequencyScorer instantiation without errors', () => {
      expect(() => new FrequencyScorer()).not.toThrow();
    });

    it('should handle TestingAdvisor instantiation without errors', () => {
      expect(() => new TestingAdvisor()).not.toThrow();
    });

    it('should handle ScoreWeights instantiation without errors', () => {
      expect(() => new ScoreWeights()).not.toThrow();
    });
  });
});
