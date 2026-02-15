/**
 * @fileoverview RaceDetectionStrategy.test.js
 * 
 * Tests for RaceDetectionStrategy base class.
 * 
 * @module tests/unit/layer-a-analysis/race-detector/strategies/race-detection-strategy/RaceDetectionStrategy
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RaceDetectionStrategy } from '#layer-a/race-detector/strategies/race-detection-strategy/strategy/RaceDetectionStrategy.js';
import { RaceStrategyBuilder } from '../../../../../factories/race-detector-test.factory.js';

describe('RaceDetectionStrategy', () => {
  describe('Structure Contract', () => {
    it('should export RaceDetectionStrategy class', () => {
      expect(RaceDetectionStrategy).toBeDefined();
      expect(typeof RaceDetectionStrategy).toBe('function');
    });

    it('should be an abstract class', () => {
      expect(() => new RaceDetectionStrategy()).toThrow('Cannot instantiate abstract class');
    });
  });

  describe('Abstract Methods', () => {
    it('should require detect method implementation', () => {
      class TestStrategy extends RaceDetectionStrategy {
        getRaceType() { return 'TEST'; }
      }
      
      const strategy = new TestStrategy();
      expect(() => strategy.detect()).toThrow('Subclasses must implement detect()');
    });

    it('should require getRaceType method implementation', () => {
      class TestStrategy extends RaceDetectionStrategy {
        detect() { return []; }
      }
      
      const strategy = new TestStrategy();
      expect(() => strategy.getRaceType()).toThrow('Subclasses must implement getRaceType()');
    });
  });

  describe('Concrete Implementation', () => {
    class ConcreteStrategy extends RaceDetectionStrategy {
      getRaceType() { return 'TEST'; }
      detect() {
        return [];
      }
    }

    let strategy;

    beforeEach(() => {
      strategy = new ConcreteStrategy();
    });

    it('should instantiate when abstract methods are implemented', () => {
      expect(strategy).toBeInstanceOf(RaceDetectionStrategy);
    });

    it('should have shared state analyzer', () => {
      expect(strategy.sharedStateAnalyzer).toBeDefined();
    });

    it('should have timing analyzer', () => {
      expect(strategy.timingAnalyzer).toBeDefined();
    });

    it('should have lock analyzer', () => {
      expect(strategy.lockAnalyzer).toBeDefined();
    });

    it('should have pattern matcher', () => {
      expect(strategy.patternMatcher).toBeDefined();
    });

    it('should have race factory', () => {
      expect(strategy.raceFactory).toBeDefined();
    });
  });

  describe('Protected Methods', () => {
    class TestStrategy extends RaceDetectionStrategy {
      getRaceType() { return 'TEST'; }
      detect() { return []; }
      
      testCanRunConcurrently(a1, a2, project) {
        return this.canRunConcurrently(a1, a2, project);
      }
      testSameBusinessFlow(a1, a2, project) {
        return this.sameBusinessFlow(a1, a2, project);
      }
      testSameEntryPoint(a1, a2, project) {
        return this.sameEntryPoint(a1, a2, project);
      }
      testGetAtomCallers(atomId, project) {
        return this.getAtomCallers(atomId, project);
      }
      testFindEntryPoints(atomId, project) {
        return this.findEntryPoints(atomId, project);
      }
      testFindAtomById(atomId, project) {
        return this.findAtomById(atomId, project);
      }
      testGetLockProtection(access, atom, project) {
        return this.getLockProtection(access, atom, project);
      }
      testHaveCommonLock(a1, a2, atom1, atom2, project) {
        return this.haveCommonLock(a1, a2, atom1, atom2, project);
      }
      testCheckMitigation(race, project) {
        return this.checkMitigation(race, project);
      }
      testCreateRace(stateKey, a1, a2, type) {
        return this.createRace(stateKey, a1, a2, type);
      }
      testMatchPatterns(a1, a2, project) {
        return this.matchPatterns(a1, a2, project);
      }
      testGetMitigationStrategies(patternType) {
        return this.getMitigationStrategies(patternType);
      }
    }

    let strategy;

    beforeEach(() => {
      strategy = new TestStrategy();
    });

    it('should provide canRunConcurrently', () => {
      const access1 = { isAsync: true };
      const access2 = { isAsync: true };
      const result = strategy.testCanRunConcurrently(access1, access2, {});
      expect(typeof result).toBe('boolean');
    });

    it('should provide sameBusinessFlow', () => {
      const result = strategy.testSameBusinessFlow({}, {}, {});
      expect(typeof result).toBe('boolean');
    });

    it('should provide sameEntryPoint', () => {
      const result = strategy.testSameEntryPoint({}, {}, {});
      expect(typeof result).toBe('boolean');
    });

    it('should provide getAtomCallers', () => {
      const result = strategy.testGetAtomCallers('atom-1', {});
      expect(Array.isArray(result)).toBe(true);
    });

    it('should provide findEntryPoints', () => {
      const result = strategy.testFindEntryPoints('atom-1', {});
      expect(Array.isArray(result)).toBe(true);
    });

    it('should provide findAtomById', () => {
      const result = strategy.testFindAtomById('atom-1', {});
      expect(result === null || typeof result === 'object').toBe(true);
    });

    it('should provide getLockProtection', () => {
      const result = strategy.testGetLockProtection({}, null, {});
      expect(result === null || typeof result === 'object').toBe(true);
    });

    it('should provide haveCommonLock', () => {
      const result = strategy.testHaveCommonLock({}, {}, null, null, {});
      expect(typeof result).toBe('boolean');
    });

    it('should provide checkMitigation', () => {
      const race = { accesses: [{}, {}] };
      const result = strategy.testCheckMitigation(race, {});
      expect(typeof result).toBe('object');
      expect(result).toHaveProperty('isMitigated');
    });

    it('should provide createRace', () => {
      const access1 = { atomName: 'test1' };
      const access2 = { atomName: 'test2' };
      const result = strategy.testCreateRace('state:key', access1, access2, 'WW');
      
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('type', 'WW');
      expect(result).toHaveProperty('stateKey', 'state:key');
      expect(result).toHaveProperty('accesses');
      expect(result.accesses).toHaveLength(2);
    });

    it('should provide matchPatterns', () => {
      const result = strategy.testMatchPatterns({ type: 'read' }, { type: 'write' }, {});
      expect(Array.isArray(result)).toBe(true);
    });

    it('should provide getMitigationStrategies', () => {
      const result = strategy.testGetMitigationStrategies('WW');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Options Support', () => {
    it('should accept options in constructor', () => {
      class TestStrategy extends RaceDetectionStrategy {
        getRaceType() { return 'TEST'; }
        detect() { return []; }
      }
      
      const options = { checkTiming: false, checkLocks: false };
      const strategy = new TestStrategy(options);
      
      expect(strategy).toBeDefined();
      expect(strategy.patternMatcher).toBeDefined();
    });
  });
});
