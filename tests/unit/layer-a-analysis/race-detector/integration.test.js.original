/**
 * @fileoverview integration.test.js
 * 
 * Tests for race-detector integration module.
 * 
 * @module tests/unit/layer-a-analysis/race-detector/integration
 */

import { describe, it, expect } from 'vitest';
import {
  analyzeProjectRaces,
  enrichProjectWithRaces,
  getRacesByModule,
  getRacesByFile,
  getRacesByFunction,
  generateStateReport,
  exportRaceResults
} from '#layer-a/race-detector/integration.js';
import { RaceConditionBuilder, ProjectDataBuilder } from '../../../factories/race-detector-test.factory.js';

describe('Race Detector Integration', () => {
  describe('Structure Contract', () => {
    it('should export analyzeProjectRaces function', () => {
      expect(analyzeProjectRaces).toBeDefined();
      expect(typeof analyzeProjectRaces).toBe('function');
    });

    it('should export enrichProjectWithRaces function', () => {
      expect(enrichProjectWithRaces).toBeDefined();
      expect(typeof enrichProjectWithRaces).toBe('function');
    });

    it('should export getRacesByModule function', () => {
      expect(getRacesByModule).toBeDefined();
      expect(typeof getRacesByModule).toBe('function');
    });

    it('should export getRacesByFile function', () => {
      expect(getRacesByFile).toBeDefined();
      expect(typeof getRacesByFile).toBe('function');
    });

    it('should export getRacesByFunction function', () => {
      expect(getRacesByFunction).toBeDefined();
      expect(typeof getRacesByFunction).toBe('function');
    });

    it('should export generateStateReport function', () => {
      expect(generateStateReport).toBeDefined();
      expect(typeof generateStateReport).toBe('function');
    });

    it('should export exportRaceResults function', () => {
      expect(exportRaceResults).toBeDefined();
      expect(typeof exportRaceResults).toBe('function');
    });
  });

  describe('enrichProjectWithRaces', () => {
    it('should enrich project data with race conditions', () => {
      const projectData = { name: 'test-project', modules: [] };
      const raceResults = { races: [], warnings: [], summary: {} };

      const enriched = enrichProjectWithRaces(projectData, raceResults);

      expect(enriched).toHaveProperty('name', 'test-project');
      expect(enriched).toHaveProperty('raceConditions', raceResults);
      expect(enriched).toHaveProperty('_meta');
      expect(enriched._meta).toHaveProperty('raceDetectionVersion');
      expect(enriched._meta).toHaveProperty('raceAnalysisAt');
    });

    it('should preserve existing project properties', () => {
      const projectData = { 
        name: 'test-project', 
        version: '1.0.0',
        customField: 'value'
      };
      const raceResults = { races: [], warnings: [] };

      const enriched = enrichProjectWithRaces(projectData, raceResults);

      expect(enriched).toHaveProperty('version', '1.0.0');
      expect(enriched).toHaveProperty('customField', 'value');
    });

    it('should preserve existing meta properties', () => {
      const projectData = { 
        name: 'test-project',
        _meta: { existingField: 'existing' }
      };
      const raceResults = { races: [], warnings: [] };

      const enriched = enrichProjectWithRaces(projectData, raceResults);

      expect(enriched._meta).toHaveProperty('existingField', 'existing');
      expect(enriched._meta).toHaveProperty('raceDetectionVersion');
    });

    it('should generate ISO timestamp for raceAnalysisAt', () => {
      const projectData = { name: 'test' };
      const raceResults = { races: [], warnings: [] };

      const enriched = enrichProjectWithRaces(projectData, raceResults);

      expect(new Date(enriched._meta.raceAnalysisAt).toISOString()).toBe(enriched._meta.raceAnalysisAt);
    });
  });

  describe('getRacesByModule', () => {
    const createMockRaceResults = () => ({
      races: [
        {
          id: 'race-1',
          accesses: [
            { module: 'moduleA', file: 'a.js', atom: 'func1' },
            { module: 'moduleB', file: 'b.js', atom: 'func2' }
          ]
        },
        {
          id: 'race-2',
          accesses: [
            { module: 'moduleA', file: 'a.js', atom: 'func3' },
            { module: 'moduleA', file: 'c.js', atom: 'func4' }
          ]
        },
        {
          id: 'race-3',
          accesses: [
            { module: 'moduleC', file: 'd.js', atom: 'func5' }
          ]
        }
      ]
    });

    it('should return races for specified module', () => {
      const raceResults = createMockRaceResults();
      const races = getRacesByModule('moduleA', raceResults);

      expect(races).toHaveLength(2);
      expect(races.map(r => r.id)).toContain('race-1');
      expect(races.map(r => r.id)).toContain('race-2');
    });

    it('should return empty array when no races for module', () => {
      const raceResults = createMockRaceResults();
      const races = getRacesByModule('nonexistent', raceResults);

      expect(races).toEqual([]);
    });

    it('should handle null raceResults', () => {
      const races = getRacesByModule('moduleA', null);

      expect(races).toEqual([]);
    });

    it('should handle raceResults without races property', () => {
      const races = getRacesByModule('moduleA', { summary: {} });

      expect(races).toEqual([]);
    });

    it('should handle empty races array', () => {
      const races = getRacesByModule('moduleA', { races: [] });

      expect(races).toEqual([]);
    });
  });

  describe('getRacesByFile', () => {
    const createMockRaceResults = () => ({
      races: [
        {
          id: 'race-1',
          accesses: [
            { module: 'moduleA', file: 'src/a.js', atom: 'func1' },
            { module: 'moduleB', file: 'src/b.js', atom: 'func2' }
          ]
        },
        {
          id: 'race-2',
          accesses: [
            { module: 'moduleA', file: 'src/a.js', atom: 'func3' },
            { module: 'moduleA', file: 'src/c.js', atom: 'func4' }
          ]
        }
      ]
    });

    it('should return races for specified file', () => {
      const raceResults = createMockRaceResults();
      const races = getRacesByFile('src/a.js', raceResults);

      expect(races).toHaveLength(2);
    });

    it('should return empty array when no races for file', () => {
      const raceResults = createMockRaceResults();
      const races = getRacesByFile('src/nonexistent.js', raceResults);

      expect(races).toEqual([]);
    });

    it('should handle null raceResults', () => {
      const races = getRacesByFile('src/a.js', null);

      expect(races).toEqual([]);
    });

    it('should handle raceResults without races property', () => {
      const races = getRacesByFile('src/a.js', {});

      expect(races).toEqual([]);
    });
  });

  describe('getRacesByFunction', () => {
    const createMockRaceResults = () => ({
      races: [
        {
          id: 'race-1',
          accesses: [
            { module: 'moduleA', file: 'a.js', atom: 'atom-1' },
            { module: 'moduleB', file: 'b.js', atom: 'atom-2' }
          ]
        },
        {
          id: 'race-2',
          accesses: [
            { module: 'moduleA', file: 'a.js', atom: 'atom-1' },
            { module: 'moduleA', file: 'c.js', atom: 'atom-3' }
          ]
        }
      ]
    });

    it('should return races involving specified function', () => {
      const raceResults = createMockRaceResults();
      const races = getRacesByFunction('atom-1', raceResults);

      expect(races).toHaveLength(2);
    });

    it('should return empty array when no races for function', () => {
      const raceResults = createMockRaceResults();
      const races = getRacesByFunction('nonexistent', raceResults);

      expect(races).toEqual([]);
    });

    it('should handle null raceResults', () => {
      const races = getRacesByFunction('atom-1', null);

      expect(races).toEqual([]);
    });
  });

  describe('generateStateReport', () => {
    it('should generate report for state with races', () => {
      const raceResults = {
        races: [
          {
            id: 'race-1',
            stateKey: 'sharedCounter',
            type: 'WW',
            severity: 'high',
            accesses: [
              { atomName: 'increment', module: 'counter', file: 'counter.js', type: 'write', line: 10 },
              { atomName: 'decrement', module: 'counter', file: 'counter.js', type: 'write', line: 20 }
            ]
          }
        ]
      };

      const report = generateStateReport('sharedCounter', raceResults);

      expect(report).not.toBeNull();
      expect(report).toHaveProperty('stateKey', 'sharedCounter');
      expect(report).toHaveProperty('raceCount', 1);
      expect(report).toHaveProperty('severity');
      expect(report).toHaveProperty('accesses');
      expect(report).toHaveProperty('suggestedFix');
      expect(report.accesses).toHaveLength(2);
    });

    it('should return null for state without races', () => {
      const raceResults = {
        races: [
          {
            id: 'race-1',
            stateKey: 'otherState',
            accesses: [{ module: 'test', file: 'test.js', type: 'write' }]
          }
        ]
      };

      const report = generateStateReport('nonexistent', raceResults);

      expect(report).toBeNull();
    });

    it('should calculate severity index correctly', () => {
      const raceResults = {
        races: [
          {
            id: 'race-1',
            stateKey: 'sharedVar',
            type: 'WW',
            severity: 'critical',
            accesses: [{ type: 'write' }]
          },
          {
            id: 'race-2',
            stateKey: 'sharedVar',
            type: 'RW',
            severity: 'high',
            accesses: [{ type: 'write' }]
          }
        ]
      };

      const report = generateStateReport('sharedVar', raceResults);

      expect(report).not.toBeNull();
      expect(report.severity).toBe(3); // critical index
    });

    it('should provide different suggested fixes based on race type', () => {
      const testCases = [
        { type: 'WW', expected: 'atomic' },
        { type: 'RW', expected: 'synchronization' },
        { type: 'IE', expected: 'singleton' },
        { type: 'EH', expected: 'event' },
        { type: 'UNKNOWN', expected: 'Review' }
      ];

      testCases.forEach(({ type, expected }) => {
        const raceResults = {
          races: [{
            id: 'race-1',
            stateKey: 'testState',
            type,
            severity: 'high',
            accesses: [{ type: 'write' }]
          }]
        };

        const report = generateStateReport('testState', raceResults);
        expect(report.suggestedFix.toLowerCase()).toContain(expected.toLowerCase());
      });
    });
  });

  describe('exportRaceResults', () => {
    const createMockRaceResults = () => ({
      summary: {
        totalRaces: 2,
        totalWarnings: 1,
        sharedStateItems: 3,
        bySeverity: { low: 1, medium: 0, high: 1, critical: 0 },
        byType: { WW: 1, RW: 1 }
      },
      races: [
        {
          id: 'race-1',
          type: 'WW',
          severity: 'high',
          stateKey: 'counter',
          description: 'Write-write race on counter',
          accesses: [
            { atomName: 'increment', module: 'mod', file: 'file.js', line: 10 },
            { atomName: 'decrement', module: 'mod', file: 'file.js', line: 20 }
          ]
        }
      ],
      warnings: []
    });

    it('should export to JSON by default', () => {
      const raceResults = createMockRaceResults();
      const exported = exportRaceResults(raceResults);

      expect(typeof exported).toBe('string');
      const parsed = JSON.parse(exported);
      expect(parsed).toHaveProperty('summary');
      expect(parsed).toHaveProperty('races');
    });

    it('should export to JSON when explicitly specified', () => {
      const raceResults = createMockRaceResults();
      const exported = exportRaceResults(raceResults, 'json');

      expect(typeof exported).toBe('string');
      expect(JSON.parse(exported)).toHaveProperty('summary');
    });

    it('should export to Markdown when specified', () => {
      const raceResults = createMockRaceResults();
      const exported = exportRaceResults(raceResults, 'markdown');

      expect(typeof exported).toBe('string');
      expect(exported).toContain('# Race Conditions Report');
      expect(exported).toContain('Generated:');
      expect(exported).toContain('Total Races:');
    });

    it('should export to CSV when specified', () => {
      const raceResults = createMockRaceResults();
      const exported = exportRaceResults(raceResults, 'csv');

      expect(typeof exported).toBe('string');
      expect(exported).toContain('ID,Type,Severity');
      expect(exported).toContain('race-1');
    });

    it('should default to JSON for unknown format', () => {
      const raceResults = createMockRaceResults();
      const exported = exportRaceResults(raceResults, 'unknown');

      expect(typeof exported).toBe('string');
      expect(JSON.parse(exported)).toHaveProperty('summary');
    });

    it('should include all race details in markdown export', () => {
      const raceResults = createMockRaceResults();
      const exported = exportRaceResults(raceResults, 'markdown');

      expect(exported).toContain('race-1');
      expect(exported).toContain('WW');
      expect(exported).toContain('high');
      expect(exported).toContain('counter');
    });
  });

  describe('Error Handling Contract', () => {
    it('should handle null project data in enrichProjectWithRaces', () => {
      expect(() => enrichProjectWithRaces(null, { races: [] })).not.toThrow();
    });

    it('should handle undefined project data in enrichProjectWithRaces', () => {
      expect(() => enrichProjectWithRaces(undefined, { races: [] })).not.toThrow();
    });

    it('should handle null raceResults in enrichProjectWithRaces', () => {
      expect(() => enrichProjectWithRaces({ name: 'test' }, null)).not.toThrow();
    });

    it('should handle null stateKey in generateStateReport', () => {
      const raceResults = { races: [] };
      expect(() => generateStateReport(null, raceResults)).not.toThrow();
    });

    it('should handle empty raceResults in exportRaceResults', () => {
      expect(() => exportRaceResults({})).not.toThrow();
    });

    it('should handle null raceResults in exportRaceResults', () => {
      expect(() => exportRaceResults(null)).toThrow();
    });
  });
});
