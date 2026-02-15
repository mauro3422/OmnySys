/**
 * @fileoverview ImpactScorer.test.js
 * 
 * Tests for ImpactScorer class.
 * 
 * @module tests/unit/layer-a-analysis/race-detector/scorers/ImpactScorer
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ImpactScorer } from '#layer-a/race-detector/scorers/ImpactScorer.js';
import { RaceConditionBuilder } from '../../../../factories/race-detector-test.factory.js';

describe('ImpactScorer', () => {
  describe('Structure Contract', () => {
    it('should export ImpactScorer class', () => {
      expect(ImpactScorer).toBeDefined();
      expect(typeof ImpactScorer).toBe('function');
    });

    it('should have score method', () => {
      const scorer = new ImpactScorer();
      expect(typeof scorer.score).toBe('function');
    });

    it('should have getAffectedBusinessFlows method', () => {
      const scorer = new ImpactScorer();
      expect(typeof scorer.getAffectedBusinessFlows).toBe('function');
    });

    it('should have getAffectedEntryPoints method', () => {
      const scorer = new ImpactScorer();
      expect(typeof scorer.getAffectedEntryPoints).toBe('function');
    });
  });

  describe('score', () => {
    let scorer;

    beforeEach(() => {
      scorer = new ImpactScorer();
    });

    it('should return base score for race with no impact', () => {
      const race = new RaceConditionBuilder().build();
      const projectData = {};
      
      const score = scorer.score(race, projectData);
      expect(score).toBeGreaterThanOrEqual(0.5);
      expect(score).toBeLessThanOrEqual(1.0);
    });

    it('should increase score for affected business flows', () => {
      const race = new RaceConditionBuilder()
        .withAccess('atom-1', { atom: 'atom-1' })
        .build();
      
      const projectData = {
        system: {
          businessFlows: [{
            name: 'criticalFlow',
            steps: [{ function: 'atom-1' }]
          }]
        }
      };
      
      const score = scorer.score(race, projectData);
      expect(score).toBeGreaterThan(0.5);
    });

    it('should increase score for multiple affected flows', () => {
      const race = new RaceConditionBuilder()
        .withAccess('atom-1', { atom: 'atom-1' })
        .withAccess('atom-2', { atom: 'atom-2' })
        .build();
      
      const projectData = {
        system: {
          businessFlows: [
            { name: 'flow1', steps: [{ function: 'atom-1' }] },
            { name: 'flow2', steps: [{ function: 'atom-2' }] },
            { name: 'flow3', steps: [{ function: 'atom-3' }] }
          ]
        }
      };
      
      const score = scorer.score(race, projectData);
      expect(score).toBeGreaterThan(0.5);
    });

    it('should increase score for affected entry points', () => {
      const race = new RaceConditionBuilder()
        .withAccess('atom-1', { module: 'api' })
        .build();
      
      const projectData = {
        system: {
          entryPoints: [{
            type: 'http',
            module: 'api',
            handler: { function: 'handler' }
          }]
        }
      };
      
      const score = scorer.score(race, projectData);
      expect(score).toBeGreaterThan(0.5);
    });

    it('should increase score for exported access', () => {
      const race = new RaceConditionBuilder()
        .withAccess('a1', { isExported: true })
        .withAccess('a2', { isExported: true })
        .build();
      
      const score = scorer.score(race, {});
      expect(score).toBeGreaterThan(0.5);
    });

    it('should cap score at 1.0', () => {
      const race = new RaceConditionBuilder()
        .withAccess('a1', { atom: 'a1', module: 'mod', isExported: true })
        .withAccess('a2', { atom: 'a2', module: 'mod', isExported: true })
        .build();
      
      const projectData = {
        system: {
          businessFlows: [
            { name: 'f1', steps: [{ function: 'a1' }] },
            { name: 'f2', steps: [{ function: 'a1' }] },
            { name: 'f3', steps: [{ function: 'a1' }] }
          ],
          entryPoints: [
            { type: 'http', module: 'mod' },
            { type: 'ws', module: 'mod' }
          ]
        }
      };
      
      const score = scorer.score(race, projectData);
      expect(score).toBeCloseTo(1.0, 10);
    });

    it('should handle empty project data', () => {
      const race = new RaceConditionBuilder().build();
      const score = scorer.score(race, {});
      expect(score).toBe(0.5);
    });

    it('should handle null project data', () => {
      const race = new RaceConditionBuilder().build();
      const score = scorer.score(race, null);
      expect(score).toBe(0.5);
    });
  });

  describe('getAffectedBusinessFlows', () => {
    let scorer;

    beforeEach(() => {
      scorer = new ImpactScorer();
    });

    it('should return empty array when no business flows', () => {
      const race = new RaceConditionBuilder().build();
      const flows = scorer.getAffectedBusinessFlows(race, {});
      expect(flows).toEqual([]);
    });

    it('should return affected flow names', () => {
      const race = new RaceConditionBuilder()
        .withAccess('a1', { atom: 'atom-1' })
        .build();
      
      const projectData = {
        system: {
          businessFlows: [{
            name: 'checkoutFlow',
            steps: [
              { function: 'other' },
              { function: 'atom-1' }
            ]
          }]
        }
      };
      
      const flows = scorer.getAffectedBusinessFlows(race, projectData);
      expect(flows).toContain('checkoutFlow');
    });

    it('should return multiple affected flows', () => {
      const race = new RaceConditionBuilder()
        .withAccess('a1', { atom: 'atom-1' })
        .withAccess('a2', { atom: 'atom-2' })
        .build();
      
      const projectData = {
        system: {
          businessFlows: [
            { name: 'flow1', steps: [{ function: 'atom-1' }] },
            { name: 'flow2', steps: [{ function: 'atom-2' }] },
            { name: 'flow3', steps: [{ function: 'other' }] }
          ]
        }
      };
      
      const flows = scorer.getAffectedBusinessFlows(race, projectData);
      expect(flows).toHaveLength(2);
      expect(flows).toContain('flow1');
      expect(flows).toContain('flow2');
    });

    it('should handle flow without steps', () => {
      const race = new RaceConditionBuilder().build();
      const projectData = {
        system: {
          businessFlows: [{ name: 'emptyFlow' }]
        }
      };
      
      const flows = scorer.getAffectedBusinessFlows(race, projectData);
      expect(flows).toEqual([]);
    });

    it('should handle step without function', () => {
      const race = new RaceConditionBuilder().build();
      const projectData = {
        system: {
          businessFlows: [{
            name: 'flow1',
            steps: [{ operation: 'delay' }]
          }]
        }
      };
      
      const flows = scorer.getAffectedBusinessFlows(race, projectData);
      expect(flows).toEqual([]);
    });
  });

  describe('getAffectedEntryPoints', () => {
    let scorer;

    beforeEach(() => {
      scorer = new ImpactScorer();
    });

    it('should return empty array when no entry points', () => {
      const race = new RaceConditionBuilder().build();
      const entries = scorer.getAffectedEntryPoints(race, {});
      expect(entries).toEqual([]);
    });

    it('should return affected entry point handlers', () => {
      const race = new RaceConditionBuilder()
        .withAccess('a1', { module: 'api' })
        .build();
      
      const projectData = {
        system: {
          entryPoints: [{
            type: 'http',
            module: 'api',
            handler: { function: 'handleRequest' }
          }]
        }
      };
      
      const entries = scorer.getAffectedEntryPoints(race, projectData);
      expect(entries).toContain('handleRequest');
    });

    it('should return entry type when no handler function', () => {
      const race = new RaceConditionBuilder()
        .withAccess('a1', { module: 'ws' })
        .build();
      
      const projectData = {
        system: {
          entryPoints: [{
            type: 'websocket',
            module: 'ws'
          }]
        }
      };
      
      const entries = scorer.getAffectedEntryPoints(race, projectData);
      expect(entries).toContain('websocket');
    });

    it('should return multiple affected entry points', () => {
      const race = new RaceConditionBuilder()
        .withAccess('a1', { module: 'api' })
        .withAccess('a2', { module: 'ws' })
        .build();
      
      const projectData = {
        system: {
          entryPoints: [
            { type: 'http', module: 'api' },
            { type: 'websocket', module: 'ws' },
            { type: 'cron', module: 'jobs' }
          ]
        }
      };
      
      const entries = scorer.getAffectedEntryPoints(race, projectData);
      expect(entries).toHaveLength(2);
    });
  });

  describe('Error Handling Contract', () => {
    let scorer;

    beforeEach(() => {
      scorer = new ImpactScorer();
    });

    it('should handle null race in score', () => {
      expect(() => scorer.score(null, {})).not.toThrow();
    });

    it('should handle undefined race in score', () => {
      expect(() => scorer.score(undefined, {})).not.toThrow();
    });

    it('should handle race without accesses', () => {
      const race = { id: 'race-1' };
      const score = scorer.score(race, {});
      expect(score).toBe(0.5);
    });

    it('should handle null accesses', () => {
      const race = { id: 'race-1', accesses: null };
      const score = scorer.score(race, {});
      expect(score).toBe(0.5);
    });

    it('should handle null projectData in getAffectedBusinessFlows', () => {
      const race = new RaceConditionBuilder().build();
      const flows = scorer.getAffectedBusinessFlows(race, null);
      expect(flows).toEqual([]);
    });

    it('should handle null projectData in getAffectedEntryPoints', () => {
      const race = new RaceConditionBuilder().build();
      const entries = scorer.getAffectedEntryPoints(race, null);
      expect(entries).toEqual([]);
    });

    it('should handle race with null access entries', () => {
      const race = { accesses: [null, undefined] };
      const score = scorer.score(race, {});
      expect(score).toBe(0.5);
    });
  });
});
