/**
 * @fileoverview race-detector-contract.test.js
 * 
 * Contract tests for all race detector modules.
 * Ensures all modules follow consistent interface contracts.
 * 
 * @module tests/unit/layer-a-analysis/race-detector/race-detector-contract
 */

import { describe, it, expect } from 'vitest';

// Import all modules to test contracts
describe('Race Detector Contract Tests', () => {
  describe('Module Exports Contract', () => {
    it('should export all required classes from index', async () => {
      const index = await import('#layer-a/race-detector/index.js');
      
      expect(index.RiskScorer).toBeDefined();
      expect(index.TypeScorer).toBeDefined();
      expect(index.AsyncScorer).toBeDefined();
      expect(index.DataIntegrityScorer).toBeDefined();
      expect(index.ScopeScorer).toBeDefined();
      expect(index.ImpactScorer).toBeDefined();
      expect(index.FrequencyScorer).toBeDefined();
      expect(index.TestingAdvisor).toBeDefined();
      expect(index.ScoreWeights).toBeDefined();
    });

    it('should export default from index', async () => {
      const index = await import('#layer-a/race-detector/index.js');
      expect(index.default).toBeDefined();
    });

    it('should export all required functions from integration', async () => {
      const integration = await import('#layer-a/race-detector/integration.js');
      
      expect(typeof integration.analyzeProjectRaces).toBe('function');
      expect(typeof integration.enrichProjectWithRaces).toBe('function');
      expect(typeof integration.getRacesByModule).toBe('function');
      expect(typeof integration.getRacesByFile).toBe('function');
      expect(typeof integration.getRacesByFunction).toBe('function');
      expect(typeof integration.generateStateReport).toBe('function');
      expect(typeof integration.exportRaceResults).toBe('function');
    });

    it('should export default from integration', async () => {
      const integration = await import('#layer-a/race-detector/integration.js');
      expect(integration.default).toBeDefined();
    });

    it('should export ScoreWeights from factors', async () => {
      const factors = await import('#layer-a/race-detector/factors/index.js');
      expect(factors.ScoreWeights).toBeDefined();
    });

    it('should export phase functions and classes', async () => {
      const collectPhase = await import('#layer-a/race-detector/phases/collect-phase.js');
      const detectPhase = await import('#layer-a/race-detector/phases/detect-phase.js');
      const severityPhase = await import('#layer-a/race-detector/phases/severity-phase.js');
      const mitigationPhase = await import('#layer-a/race-detector/phases/mitigation-phase.js');
      
      expect(typeof collectPhase.collectSharedState).toBe('function');
      expect(typeof collectPhase.CollectPhase).toBe('function');
      expect(typeof detectPhase.detectRaces).toBe('function');
      expect(typeof detectPhase.DetectPhase).toBe('function');
      expect(typeof severityPhase.calculateSeverities).toBe('function');
      expect(typeof severityPhase.SeverityPhase).toBe('function');
      expect(typeof mitigationPhase.checkMitigations).toBe('function');
      expect(typeof mitigationPhase.MitigationPhase).toBe('function');
    });

    it('should export tracker classes', async () => {
      const baseTracker = await import('#layer-a/race-detector/trackers/base-tracker.js');
      const globalTracker = await import('#layer-a/race-detector/trackers/global-variable-tracker.js');
      const moduleTracker = await import('#layer-a/race-detector/trackers/module-state-tracker.js');
      
      expect(typeof baseTracker.BaseTracker).toBe('function');
      expect(typeof globalTracker.GlobalVariableTracker).toBe('function');
      expect(typeof moduleTracker.ModuleStateTracker).toBe('function');
    });

    it('should export mitigation checkers', async () => {
      const lockChecker = await import('#layer-a/race-detector/mitigation/lock-checker.js');
      const atomicChecker = await import('#layer-a/race-detector/mitigation/atomic-checker.js');
      const immutableChecker = await import('#layer-a/race-detector/mitigation/immutable-checker.js');
      
      expect(typeof lockChecker.hasLockProtection).toBe('function');
      expect(typeof lockChecker.getLockDetails).toBe('function');
      expect(typeof atomicChecker.isAtomicOperation).toBe('function');
      expect(typeof atomicChecker.getAtomicDetails).toBe('function');
      expect(typeof immutableChecker.usesImmutableData).toBe('function');
      expect(typeof immutableChecker.getImmutableDetails).toBe('function');
    });
  });

  describe('Class Interface Contract', () => {
    it('all scorers must have score method', async () => {
      const { RiskScorer, TypeScorer, AsyncScorer, DataIntegrityScorer, ScopeScorer, ImpactScorer, FrequencyScorer, TestingAdvisor, ScoreWeights } = await import('#layer-a/race-detector/index.js');
      
      const scorers = [
        { name: 'RiskScorer', instance: new RiskScorer() },
        { name: 'TypeScorer', instance: new TypeScorer(new ScoreWeights()) },
        { name: 'AsyncScorer', instance: new AsyncScorer(new ScoreWeights()) },
        { name: 'DataIntegrityScorer', instance: new DataIntegrityScorer(new ScoreWeights()) },
        { name: 'ScopeScorer', instance: new ScopeScorer(new ScoreWeights()) },
        { name: 'ImpactScorer', instance: new ImpactScorer() },
        { name: 'FrequencyScorer', instance: new FrequencyScorer() }
      ];
      
      scorers.forEach(({ name, instance }) => {
        expect(typeof instance.score, `${name} should have score method`).toBe('function');
      });
    });

    it('all phase classes must have execute method', async () => {
      const { CollectPhase } = await import('#layer-a/race-detector/phases/collect-phase.js');
      const { DetectPhase } = await import('#layer-a/race-detector/phases/detect-phase.js');
      const { SeverityPhase } = await import('#layer-a/race-detector/phases/severity-phase.js');
      const { MitigationPhase } = await import('#layer-a/race-detector/phases/mitigation-phase.js');
      
      const phases = [
        { name: 'CollectPhase', instance: new CollectPhase([]) },
        { name: 'DetectPhase', instance: new DetectPhase([], new Map(), {}) },
        { name: 'SeverityPhase', instance: new SeverityPhase([], {}, {}) },
        { name: 'MitigationPhase', instance: new MitigationPhase([], {}, []) }
      ];
      
      phases.forEach(({ name, instance }) => {
        expect(typeof instance.execute, `${name} should have execute method`).toBe('function');
      });
    });

    it('all trackers must extend BaseTracker interface', async () => {
      const { BaseTracker } = await import('#layer-a/race-detector/trackers/base-tracker.js');
      const { GlobalVariableTracker } = await import('#layer-a/race-detector/trackers/global-variable-tracker.js');
      const { ModuleStateTracker } = await import('#layer-a/race-detector/trackers/module-state-tracker.js');
      
      const project = { modules: [] };
      
      const trackers = [
        { name: 'BaseTracker', instance: new BaseTracker(project) },
        { name: 'GlobalVariableTracker', instance: new GlobalVariableTracker(project) },
        { name: 'ModuleStateTracker', instance: new ModuleStateTracker(project) }
      ];
      
      trackers.forEach(({ name, instance }) => {
        expect(typeof instance.track, `${name} should have track method`).toBe('function');
        expect(typeof instance.registerAccess, `${name} should have registerAccess method`).toBe('function');
        expect(instance.state).toBeInstanceOf(Map);
      });
    });
  });

  describe('Return Type Contract', () => {
    it('track methods must return Map', async () => {
      const { BaseTracker } = await import('#layer-a/race-detector/trackers/base-tracker.js');
      const project = { modules: [] };
      const tracker = new BaseTracker(project);
      
      const result = tracker.track();
      expect(result).toBeInstanceOf(Map);
    });

    it('execute methods must return expected types', async () => {
      const { CollectPhase } = await import('#layer-a/race-detector/phases/collect-phase.js');
      const { DetectPhase } = await import('#layer-a/race-detector/phases/detect-phase.js');
      const { SeverityPhase } = await import('#layer-a/race-detector/phases/severity-phase.js');
      const { MitigationPhase } = await import('#layer-a/race-detector/phases/mitigation-phase.js');
      
      const collectPhase = new CollectPhase([]);
      expect(collectPhase.execute()).toBeInstanceOf(Map);
      
      const detectPhase = new DetectPhase([], new Map(), {});
      expect(Array.isArray(detectPhase.execute())).toBe(true);
      
      const severityPhase = new SeverityPhase([], { calculate: () => 'medium' }, {});
      expect(Array.isArray(severityPhase.execute())).toBe(true);
      
      const mitigationPhase = new MitigationPhase([], {}, []);
      expect(Array.isArray(mitigationPhase.execute())).toBe(true);
    });

    it('calculate methods must return valid values', async () => {
      const { RiskScorer, ScoreWeights } = await import('#layer-a/race-detector/index.js');
      
      const scorer = new RiskScorer();
      const race = {
        id: 'race-1',
        type: 'WW',
        stateType: 'global',
        accesses: [
          { isAsync: true },
          { isAsync: true }
        ]
      };
      
      const severity = scorer.calculate(race, {});
      expect(['low', 'medium', 'high', 'critical']).toContain(severity);
    });
  });

  describe('Error Handling Contract', () => {
    it('modules should handle null/undefined gracefully', async () => {
      const { enrichProjectWithRaces } = await import('#layer-a/race-detector/integration.js');
      
      expect(() => enrichProjectWithRaces(null, { races: [] })).not.toThrow();
      expect(() => enrichProjectWithRaces({}, null)).not.toThrow();
    });

    it('scorers should handle missing data gracefully', async () => {
      const { ImpactScorer } = await import('#layer-a/race-detector/index.js');
      
      const scorer = new ImpactScorer();
      expect(() => scorer.score(null, {})).not.toThrow();
      expect(() => scorer.score({}, null)).not.toThrow();
      expect(() => scorer.score({ accesses: null }, {})).not.toThrow();
    });

    it('trackers should handle null project gracefully', async () => {
      const { BaseTracker } = await import('#layer-a/race-detector/trackers/base-tracker.js');
      
      expect(() => new BaseTracker(null)).not.toThrow();
      expect(() => new BaseTracker(undefined)).not.toThrow();
    });
  });

  describe('Naming Convention Contract', () => {
    it('should follow consistent naming for race types', async () => {
      const { ScoreWeights } = await import('#layer-a/race-detector/index.js');
      
      const weights = new ScoreWeights();
      const expectedTypes = ['WW', 'RW', 'IE', 'EH', 'OTHER'];
      
      expectedTypes.forEach(type => {
        expect(weights.getTypeWeight(type)).toBeDefined();
      });
    });

    it('should follow consistent naming for severity levels', async () => {
      const { RiskScorer } = await import('#layer-a/race-detector/index.js');
      
      const scorer = new RiskScorer();
      const severities = ['low', 'medium', 'high', 'critical'];
      
      severities.forEach(severity => {
        const advice = scorer.suggestTestingLevel(severity);
        expect(advice).toBeDefined();
        expect(advice.level).toBeDefined();
      });
    });
  });

  describe('Integration Contract', () => {
    it('all components should work together in pipeline', async () => {
      const { RiskScorer, ScoreWeights } = await import('#layer-a/race-detector/index.js');
      const { CollectPhase } = await import('#layer-a/race-detector/phases/collect-phase.js');
      const { DetectPhase } = await import('#layer-a/race-detector/phases/detect-phase.js');
      const { SeverityPhase } = await import('#layer-a/race-detector/phases/severity-phase.js');
      
      // Create a simple pipeline
      const mockTracker = {
        track: () => new Map([['key1', [{ atom: 'a1', type: 'write' }]]])
      };
      
      const mockStrategy = {
        detect: (state) => [{
          id: 'race-1',
          type: 'WW',
          stateType: 'global',
          accesses: [{ isAsync: true }, { isAsync: true }]
        }]
      };
      
      // Execute pipeline
      const collectPhase = new CollectPhase([mockTracker]);
      const state = collectPhase.execute();
      
      const detectPhase = new DetectPhase([mockStrategy], state, {});
      const races = detectPhase.execute();
      
      const riskScorer = new RiskScorer();
      const severityPhase = new SeverityPhase(races, riskScorer, {});
      const scoredRaces = severityPhase.execute();
      
      expect(scoredRaces).toHaveLength(1);
      expect(scoredRaces[0]).toHaveProperty('severity');
      expect(['low', 'medium', 'high', 'critical']).toContain(scoredRaces[0].severity);
    });
  });
});
