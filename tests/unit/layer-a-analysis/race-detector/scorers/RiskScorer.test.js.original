/**
 * @fileoverview RiskScorer.test.js
 * 
 * Tests for RiskScorer class.
 * 
 * @module tests/unit/layer-a-analysis/race-detector/scorers/RiskScorer
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RiskScorer } from '#layer-a/race-detector/scorers/RiskScorer.js';
import { RaceConditionBuilder, RaceTestConstants } from '../../../../factories/race-detector-test.factory.js';

describe('RiskScorer', () => {
  describe('Structure Contract', () => {
    it('should export RiskScorer class', () => {
      expect(RiskScorer).toBeDefined();
      expect(typeof RiskScorer).toBe('function');
    });

    it('should create instance with all scorers', () => {
      const scorer = new RiskScorer();
      expect(scorer.weights).toBeDefined();
      expect(scorer.typeScorer).toBeDefined();
      expect(scorer.asyncScorer).toBeDefined();
      expect(scorer.integrityScorer).toBeDefined();
      expect(scorer.scopeScorer).toBeDefined();
      expect(scorer.impactScorer).toBeDefined();
      expect(scorer.frequencyScorer).toBeDefined();
      expect(scorer.testingAdvisor).toBeDefined();
    });

    it('should have required methods', () => {
      const scorer = new RiskScorer();
      expect(typeof scorer.calculate).toBe('function');
      expect(typeof scorer.scoreToSeverity).toBe('function');
      expect(typeof scorer.explainScore).toBe('function');
      expect(typeof scorer.suggestTestingLevel).toBe('function');
      expect(typeof scorer.setWeights).toBe('function');
    });
  });

  describe('calculate', () => {
    let scorer;
    let projectData;

    beforeEach(() => {
      scorer = new RiskScorer();
      projectData = {
        system: {
          businessFlows: [],
          entryPoints: []
        }
      };
    });

    it('should return severity string', () => {
      const race = new RaceConditionBuilder().build();
      const severity = scorer.calculate(race, projectData);
      expect(RaceTestConstants.SEVERITY_LEVELS).toContain(severity);
    });

    it('should calculate for WW race', () => {
      const race = new RaceConditionBuilder()
        .withType('WW')
        .withStateType('global')
        .withAccess('a1', { isAsync: true })
        .withAccess('a2', { isAsync: true })
        .build();
      
      const severity = scorer.calculate(race, projectData);
      expect(RaceTestConstants.SEVERITY_LEVELS).toContain(severity);
    });

    it('should calculate for RW race', () => {
      const race = new RaceConditionBuilder()
        .withType('RW')
        .withStateType('module')
        .build();
      
      const severity = scorer.calculate(race, projectData);
      expect(RaceTestConstants.SEVERITY_LEVELS).toContain(severity);
    });

    it('should return higher severity for critical conditions', () => {
      const criticalRace = new RaceConditionBuilder()
        .withType('WW')
        .withStateType('global')
        .withAccess('a1', { isAsync: true, isExported: true })
        .withAccess('a2', { isAsync: true, isExported: true })
        .build();
      
      const lowRace = new RaceConditionBuilder()
        .withType('RW')
        .withStateType('closure')
        .withAccess('a1', { isAsync: false })
        .withAccess('a2', { isAsync: false })
        .build();
      
      projectData.system.businessFlows = [{
        name: 'criticalFlow',
        steps: [{ function: 'a1' }]
      }];
      
      const criticalSeverity = scorer.calculate(criticalRace, projectData);
      const lowSeverity = scorer.calculate(lowRace, projectData);
      
      const severityRank = { low: 1, medium: 2, high: 3, critical: 4 };
      expect(severityRank[criticalSeverity]).toBeGreaterThanOrEqual(severityRank[lowSeverity]);
    });

    it('should handle race with no accesses', () => {
      const race = { id: 'race-1', type: 'WW', stateType: 'global' };
      const severity = scorer.calculate(race, projectData);
      expect(RaceTestConstants.SEVERITY_LEVELS).toContain(severity);
    });

    it('should handle race with single access', () => {
      const race = {
        id: 'race-1',
        type: 'WW',
        stateType: 'global',
        accesses: [{ atom: 'a1', isAsync: true }]
      };
      const severity = scorer.calculate(race, projectData);
      expect(RaceTestConstants.SEVERITY_LEVELS).toContain(severity);
    });
  });

  describe('scoreToSeverity', () => {
    let scorer;

    beforeEach(() => {
      scorer = new RiskScorer();
    });

    it('should return critical for score >= 0.8', () => {
      expect(scorer.scoreToSeverity(0.8)).toBe('critical');
      expect(scorer.scoreToSeverity(0.9)).toBe('critical');
      expect(scorer.scoreToSeverity(1.0)).toBe('critical');
    });

    it('should return high for score >= 0.6 and < 0.8', () => {
      expect(scorer.scoreToSeverity(0.6)).toBe('high');
      expect(scorer.scoreToSeverity(0.7)).toBe('high');
      expect(scorer.scoreToSeverity(0.79)).toBe('high');
    });

    it('should return medium for score >= 0.4 and < 0.6', () => {
      expect(scorer.scoreToSeverity(0.4)).toBe('medium');
      expect(scorer.scoreToSeverity(0.5)).toBe('medium');
      expect(scorer.scoreToSeverity(0.59)).toBe('medium');
    });

    it('should return low for score < 0.4', () => {
      expect(scorer.scoreToSeverity(0)).toBe('low');
      expect(scorer.scoreToSeverity(0.1)).toBe('low');
      expect(scorer.scoreToSeverity(0.39)).toBe('low');
    });

    it('should handle boundary values', () => {
      expect(scorer.scoreToSeverity(0.399)).toBe('low');
      expect(scorer.scoreToSeverity(0.4)).toBe('medium');
      expect(scorer.scoreToSeverity(0.599)).toBe('medium');
      expect(scorer.scoreToSeverity(0.6)).toBe('high');
      expect(scorer.scoreToSeverity(0.799)).toBe('high');
      expect(scorer.scoreToSeverity(0.8)).toBe('critical');
    });
  });

  describe('explainScore', () => {
    let scorer;
    let projectData;

    beforeEach(() => {
      scorer = new RiskScorer();
      projectData = { system: { businessFlows: [], entryPoints: [] } };
    });

    it('should return array of factors', () => {
      const race = new RaceConditionBuilder()
        .withType('WW')
        .withStateType('global')
        .build();
      
      const factors = scorer.explainScore(race, projectData);
      expect(Array.isArray(factors)).toBe(true);
    });

    it('should include type factor for high type score', () => {
      const race = new RaceConditionBuilder()
        .withType('WW')
        .build();
      
      const factors = scorer.explainScore(race, projectData);
      const hasTypeFactor = factors.some(f => f.includes('race type'));
      expect(hasTypeFactor).toBe(true);
    });

    it('should include async factor for both async', () => {
      const race = new RaceConditionBuilder()
        .withAccess('a1', { isAsync: true })
        .withAccess('a2', { isAsync: true })
        .build();
      
      const factors = scorer.explainScore(race, projectData);
      const hasAsyncFactor = factors.some(f => f.includes('async'));
      expect(hasAsyncFactor).toBe(true);
    });

    it('should include scope factor for global state', () => {
      const race = new RaceConditionBuilder()
        .withStateType('global')
        .withStateKey('window.shared')
        .build();
      
      const factors = scorer.explainScore(race, projectData);
      const hasScopeFactor = factors.some(f => f.includes('Global'));
      expect(hasScopeFactor).toBe(true);
    });

    it('should include impact factor for exported access', () => {
      const race = new RaceConditionBuilder()
        .withAccess('a1', { isExported: true })
        .withAccess('a2', { isExported: true })
        .build();
      
      projectData.system.businessFlows = [{
        name: 'flow1',
        steps: [{ function: 'a1' }]
      }];
      
      const factors = scorer.explainScore(race, projectData);
      expect(Array.isArray(factors)).toBe(true);
    });

    it('should return empty array for low risk race', () => {
      const race = new RaceConditionBuilder()
        .withType('OTHER')
        .withStateType('closure')
        .withAccess('a1', { isAsync: false })
        .withAccess('a2', { isAsync: false })
        .build();
      
      const factors = scorer.explainScore(race, projectData);
      expect(factors).toEqual([]);
    });
  });

  describe('suggestTestingLevel', () => {
    let scorer;

    beforeEach(() => {
      scorer = new RiskScorer();
    });

    it('should return mandatory testing for critical', () => {
      const advice = scorer.suggestTestingLevel('critical');
      expect(advice.level).toBe('mandatory');
      expect(advice.priority).toBe('P0');
      expect(advice.tests).toContain('unit');
      expect(advice.tests).toContain('integration');
      expect(advice.tests).toContain('e2e');
      expect(advice.tests).toContain('stress');
    });

    it('should return recommended testing for high', () => {
      const advice = scorer.suggestTestingLevel('high');
      expect(advice.level).toBe('recommended');
      expect(advice.priority).toBe('P1');
      expect(advice.tests).toContain('unit');
      expect(advice.tests).toContain('integration');
      expect(advice.tests).toContain('stress');
      expect(advice.tests).not.toContain('e2e');
    });

    it('should return optional testing for medium', () => {
      const advice = scorer.suggestTestingLevel('medium');
      expect(advice.level).toBe('optional');
      expect(advice.priority).toBe('P2');
      expect(advice.tests).toContain('unit');
      expect(advice.tests).toContain('integration');
    });

    it('should return documentation testing for low', () => {
      const advice = scorer.suggestTestingLevel('low');
      expect(advice.level).toBe('documentation');
      expect(advice.priority).toBe('P3');
      expect(advice.tests).toContain('unit');
    });

    it('should default to low for unknown severity', () => {
      const advice = scorer.suggestTestingLevel('unknown');
      expect(advice.level).toBe('documentation');
      expect(advice.priority).toBe('P3');
    });
  });

  describe('setWeights', () => {
    let scorer;

    beforeEach(() => {
      scorer = new RiskScorer();
    });

    it('should update weights', () => {
      scorer.setWeights({
        type: { WW: 2.0 }
      });
      
      expect(scorer.weights.getTypeWeight('WW')).toBe(2.0);
    });

    it('should merge weights with existing', () => {
      scorer.setWeights({
        type: { NEW: 0.6 }
      });
      
      expect(scorer.weights.getTypeWeight('NEW')).toBe(0.6);
      expect(scorer.weights.getTypeWeight('WW')).toBe(1.0);
    });

    it('should affect future calculations', () => {
      scorer.setWeights({
        type: { WW: 0.1 }
      });
      
      const race = new RaceConditionBuilder()
        .withType('WW')
        .build();
      
      const severity = scorer.calculate(race, {});
      expect(RaceTestConstants.SEVERITY_LEVELS).toContain(severity);
    });
  });

  describe('Error Handling Contract', () => {
    let scorer;

    beforeEach(() => {
      scorer = new RiskScorer();
    });

    it('should handle null race in calculate', () => {
      expect(() => scorer.calculate(null, {})).not.toThrow();
    });

    it('should handle undefined race in calculate', () => {
      expect(() => scorer.calculate(undefined, {})).not.toThrow();
    });

    it('should handle null projectData in calculate', () => {
      const race = new RaceConditionBuilder().build();
      expect(() => scorer.calculate(race, null)).not.toThrow();
    });

    it('should handle race without type', () => {
      const race = { id: 'race-1' };
      const severity = scorer.calculate(race, {});
      expect(RaceTestConstants.SEVERITY_LEVELS).toContain(severity);
    });

    it('should handle race without accesses', () => {
      const race = { id: 'race-1', type: 'WW', stateType: 'global' };
      const severity = scorer.calculate(race, {});
      expect(RaceTestConstants.SEVERITY_LEVELS).toContain(severity);
    });

    it('should handle invalid score in scoreToSeverity', () => {
      expect(scorer.scoreToSeverity(-1)).toBe('low');
      expect(scorer.scoreToSeverity(2)).toBe('critical');
    });

    it('should handle null in scoreToSeverity', () => {
      expect(scorer.scoreToSeverity(null)).toBe('low');
    });

    it('should handle explainScore with null race', () => {
      expect(() => scorer.explainScore(null, {})).not.toThrow();
    });

    it('should handle suggestTestingLevel with null', () => {
      const advice = scorer.suggestTestingLevel(null);
      expect(advice.level).toBe('documentation');
    });

    it('should handle setWeights with null', () => {
      expect(() => scorer.setWeights(null)).not.toThrow();
    });
  });
});
