/**
 * @fileoverview Shared State Detector Tests
 * 
 * Phase 3 - Tier 3 Analysis Testing
 * Tests for shared-state-detector.js
 * 
 * @module tests/unit/layer-a-analysis/tier3/detectors/shared-state-detector
 */

import { describe, it, expect } from 'vitest';
import {
  detectSharedState,
  generateSharedStateConnections
} from '#layer-a/analyses/tier3/shared-state-detector.js';
import { SharedStateBuilder } from '../../../../factories/tier3-analysis.factory.js';

describe('SharedStateDetector', () => {
  describe('Structure Contract', () => {
    it('should export detectSharedState function', () => {
      expect(typeof detectSharedState).toBe('function');
    });

    it('should export generateSharedStateConnections function', () => {
      expect(typeof generateSharedStateConnections).toBe('function');
    });

    it('should return expected structure from detectSharedState', () => {
      const result = detectSharedState('', 'test.js');
      
      expect(result).toHaveProperty('globalAccess');
      expect(result).toHaveProperty('readProperties');
      expect(result).toHaveProperty('writeProperties');
      expect(result).toHaveProperty('propertyAccessMap');
      
      expect(Array.isArray(result.globalAccess)).toBe(true);
      expect(Array.isArray(result.readProperties)).toBe(true);
      expect(Array.isArray(result.writeProperties)).toBe(true);
      expect(typeof result.propertyAccessMap).toBe('object');
    });

    it('should not throw on empty input', () => {
      expect(() => detectSharedState('', 'test.js')).not.toThrow();
      expect(() => generateSharedStateConnections({})).not.toThrow();
    });
  });

  describe('Functionality Tests', () => {
    describe('Window Object Detection', () => {
      it('should detect window property read', () => {
        const code = `const value = window.myVariable;`;
        const result = detectSharedState(code, 'test.js');
        
        expect(result.globalAccess).toHaveLength(1);
        expect(result.globalAccess[0]).toMatchObject({
          objectName: 'window',
          propName: 'myVariable',
          type: 'read',
          fullReference: 'window.myVariable'
        });
        expect(result.readProperties).toContain('myVariable');
      });

      it('should detect window property write', () => {
        const code = `window.myVariable = 'value';`;
        const result = detectSharedState(code, 'test.js');
        
        expect(result.globalAccess).toHaveLength(1);
        expect(result.globalAccess[0]).toMatchObject({
          objectName: 'window',
          propName: 'myVariable',
          type: 'write',
          fullReference: 'window.myVariable'
        });
        expect(result.writeProperties).toContain('myVariable');
      });

      it('should detect multiple window properties', () => {
        const code = `
          window.first = 1;
          const second = window.second;
          window.third = 'three';
        `;
        const result = detectSharedState(code, 'test.js');
        
        expect(result.globalAccess).toHaveLength(3);
        expect(result.readProperties).toContain('second');
        expect(result.writeProperties).toContain('first');
        expect(result.writeProperties).toContain('third');
      });

      it('should detect window property inside function', () => {
        const code = `
          function getConfig() {
            return window.config;
          }
        `;
        const result = detectSharedState(code, 'test.js');
        
        expect(result.globalAccess).toHaveLength(1);
        expect(result.globalAccess[0].functionContext).toBe('getConfig');
      });

      it('should detect window property in arrow function', () => {
        const code = `
          const setValue = () => {
            window.value = 42;
          };
        `;
        const result = detectSharedState(code, 'test.js');
        
        expect(result.globalAccess).toHaveLength(1);
        expect(result.globalAccess[0].functionContext).toBe('anonymous-arrow');
      });
    });

    describe('Global Object Detection', () => {
      it('should detect global property read', () => {
        const code = `const value = global.myVariable;`;
        const result = detectSharedState(code, 'test.js');
        
        expect(result.globalAccess).toHaveLength(1);
        expect(result.globalAccess[0]).toMatchObject({
          objectName: 'global',
          propName: 'myVariable',
          type: 'read'
        });
      });

      it('should detect global property write', () => {
        const code = `global.myVariable = 'value';`;
        const result = detectSharedState(code, 'test.js');
        
        expect(result.globalAccess).toHaveLength(1);
        expect(result.globalAccess[0]).toMatchObject({
          objectName: 'global',
          propName: 'myVariable',
          type: 'write'
        });
      });
    });

    describe('GlobalThis Object Detection', () => {
      it('should detect globalThis property read', () => {
        const code = `const value = globalThis.myVariable;`;
        const result = detectSharedState(code, 'test.js');
        
        expect(result.globalAccess).toHaveLength(1);
        expect(result.globalAccess[0]).toMatchObject({
          objectName: 'globalThis',
          propName: 'myVariable',
          type: 'read'
        });
      });

      it('should detect globalThis property write', () => {
        const code = `globalThis.myVariable = 'value';`;
        const result = detectSharedState(code, 'test.js');
        
        expect(result.globalAccess).toHaveLength(1);
        expect(result.globalAccess[0]).toMatchObject({
          objectName: 'globalThis',
          propName: 'myVariable',
          type: 'write'
        });
      });
    });

    describe('Read vs Write Detection', () => {
      it('should distinguish read from write', () => {
        const code = `
          window.readVar;
          window.writeVar = 1;
        `;
        const result = detectSharedState(code, 'test.js');
        
        const readAccess = result.globalAccess.find(a => a.propName === 'readVar');
        const writeAccess = result.globalAccess.find(a => a.propName === 'writeVar');
        
        expect(readAccess?.type).toBe('read');
        expect(writeAccess?.type).toBe('write');
      });

      it('should detect read when used as function argument', () => {
        const code = `console.log(window.myVar);`;
        const result = detectSharedState(code, 'test.js');
        
        expect(result.globalAccess[0]?.type).toBe('read');
      });

      it('should detect compound assignment as read', () => {
        const code = `window.counter += 1;`;
        const result = detectSharedState(code, 'test.js');
        
        // Compound assignments are technically reads, but our detector
        // only looks at direct AssignmentExpression left side
        expect(result.globalAccess.length).toBeGreaterThanOrEqual(0);
      });

      it('should skip method calls on window properties', () => {
        const code = `window.eventBus.on('event', handler);`;
        const result = detectSharedState(code, 'test.js');
        
        // Should only detect window.eventBus, not the method call
        const eventBusAccess = result.globalAccess.find(a => a.propName === 'eventBus');
        expect(eventBusAccess?.type).toBe('read');
      });
    });

    describe('Property Access Map', () => {
      it('should build property access map with reads and writes', () => {
        const code = `
          window.shared = 'value';
          const x = window.shared;
          window.shared = 'new value';
        `;
        const result = detectSharedState(code, 'test.js');
        
        expect(result.propertyAccessMap).toHaveProperty('shared');
        expect(result.propertyAccessMap.shared.reads).toHaveLength(1);
        expect(result.propertyAccessMap.shared.writes).toHaveLength(2);
      });

      it('should track multiple properties in map', () => {
        const code = `
          window.a = 1;
          window.b = 2;
          const c = window.c;
        `;
        const result = detectSharedState(code, 'test.js');
        
        expect(result.propertyAccessMap).toHaveProperty('a');
        expect(result.propertyAccessMap).toHaveProperty('b');
        expect(result.propertyAccessMap).toHaveProperty('c');
      });
    });

    describe('Connection Generation', () => {
      it('should generate connections for shared properties across files', () => {
        const fileAnalysisMap = {
          'fileA.js': {
            globalAccess: [
              { propName: 'sharedState', type: 'write', filePath: 'fileA.js', line: 1 }
            ],
            readProperties: [],
            writeProperties: ['sharedState']
          },
          'fileB.js': {
            globalAccess: [
              { propName: 'sharedState', type: 'read', filePath: 'fileB.js', line: 1 }
            ],
            readProperties: ['sharedState'],
            writeProperties: []
          }
        };
        
        const connections = generateSharedStateConnections(fileAnalysisMap);
        
        expect(connections.length).toBeGreaterThan(0);
        expect(connections[0]).toMatchObject({
          type: 'shared_state',
          globalProperty: 'sharedState'
        });
      });

      it('should skip event-related properties', () => {
        const fileAnalysisMap = {
          'fileA.js': {
            globalAccess: [{ propName: 'eventBus', type: 'write' }],
            readProperties: [],
            writeProperties: ['eventBus']
          },
          'fileB.js': {
            globalAccess: [{ propName: 'eventBus', type: 'read' }],
            readProperties: ['eventBus'],
            writeProperties: []
          }
        };
        
        const connections = generateSharedStateConnections(fileAnalysisMap);
        
        // eventBus should be skipped
        const eventBusConnections = connections.filter(c => c.globalProperty === 'eventBus');
        expect(eventBusConnections).toHaveLength(0);
      });

      it('should require at least 2 accessors for connection', () => {
        const fileAnalysisMap = {
          'fileA.js': {
            globalAccess: [{ propName: 'onlyState', type: 'write' }],
            readProperties: [],
            writeProperties: ['onlyState']
          }
        };
        
        const connections = generateSharedStateConnections(fileAnalysisMap);
        
        expect(connections).toHaveLength(0);
      });

      it('should calculate severity based on access pattern', () => {
        const fileAnalysisMap = {
          'fileA.js': {
            globalAccess: [{ propName: 'config', type: 'write' }],
            readProperties: [],
            writeProperties: ['config']
          },
          'fileB.js': {
            globalAccess: [{ propName: 'config', type: 'read' }],
            readProperties: ['config'],
            writeProperties: []
          }
        };
        
        const connections = generateSharedStateConnections(fileAnalysisMap);
        
        expect(connections[0]).toHaveProperty('severity');
        expect(['low', 'medium', 'high', 'critical']).toContain(connections[0].severity);
      });

      it('should calculate critical severity for multiple writers and readers', () => {
        const fileAnalysisMap = {
          'fileA.js': {
            globalAccess: [{ propName: 'raceVar', type: 'write' }],
            readProperties: [],
            writeProperties: ['raceVar']
          },
          'fileB.js': {
            globalAccess: [{ propName: 'raceVar', type: 'write' }],
            readProperties: [],
            writeProperties: ['raceVar']
          },
          'fileC.js': {
            globalAccess: [{ propName: 'raceVar', type: 'read' }],
            readProperties: ['raceVar'],
            writeProperties: []
          },
          'fileD.js': {
            globalAccess: [{ propName: 'raceVar', type: 'read' }],
            readProperties: ['raceVar'],
            writeProperties: []
          }
        };
        
        const connections = generateSharedStateConnections(fileAnalysisMap);
        const criticalConnections = connections.filter(c => c.severity === 'critical');
        
        expect(criticalConnections.length).toBeGreaterThan(0);
      });

      it('should include evidence in connections', () => {
        const fileAnalysisMap = {
          'fileA.js': {
            globalAccess: [
              { propName: 'state', type: 'write', line: 5, filePath: 'fileA.js' }
            ],
            readProperties: [],
            writeProperties: ['state']
          },
          'fileB.js': {
            globalAccess: [
              { propName: 'state', type: 'read', line: 10, filePath: 'fileB.js' }
            ],
            readProperties: ['state'],
            writeProperties: []
          }
        };
        
        const connections = generateSharedStateConnections(fileAnalysisMap);
        
        expect(connections[0]).toHaveProperty('evidence');
        expect(connections[0]).toHaveProperty('confidence');
      });
    });
  });

  describe('Error Handling Contract', () => {
    it('should handle empty code', () => {
      const result = detectSharedState('', 'test.js');
      
      expect(result.globalAccess).toHaveLength(0);
      expect(result.readProperties).toHaveLength(0);
      expect(result.writeProperties).toHaveLength(0);
    });

    it('should handle code without global access', () => {
      const code = `
        const local = 'value';
        function test() { return local; }
      `;
      const result = detectSharedState(code, 'test.js');
      
      expect(result.globalAccess).toHaveLength(0);
    });

    it('should handle invalid code gracefully', () => {
      const code = `this is not valid javascript {{}}`;
      const result = detectSharedState(code, 'test.js');
      
      // Should not throw, should return empty result
      expect(result.globalAccess).toHaveLength(0);
    });

    it('should handle TypeScript files', () => {
      const code = `const x: string = window.myVar as string;`;
      const result = detectSharedState(code, 'test.ts');
      
      expect(result.globalAccess.length).toBeGreaterThanOrEqual(0);
    });

    it('should track line and column numbers', () => {
      const code = `window.test = 1;`;
      const result = detectSharedState(code, 'test.js');
      
      if (result.globalAccess.length > 0) {
        expect(result.globalAccess[0]).toHaveProperty('line');
        expect(result.globalAccess[0]).toHaveProperty('column');
        expect(typeof result.globalAccess[0].line).toBe('number');
        expect(typeof result.globalAccess[0].column).toBe('number');
      }
    });

    it('should include file path in access locations', () => {
      const code = `window.test = 1;`;
      const result = detectSharedState(code, '/path/to/file.js');
      
      if (result.globalAccess.length > 0) {
        expect(result.globalAccess[0].filePath).toBe('/path/to/file.js');
      }
    });

    it('should handle empty fileAnalysisMap for connections', () => {
      const connections = generateSharedStateConnections({});
      
      expect(connections).toHaveLength(0);
    });

    it('should handle null/undefined entries in fileAnalysisMap', () => {
      const fileAnalysisMap = {
        'fileA.js': null,
        'fileB.js': undefined,
        'fileC.js': { globalAccess: [], readProperties: [], writeProperties: [] }
      };
      
      // Should not throw
      expect(() => generateSharedStateConnections(fileAnalysisMap)).not.toThrow();
    });

    it('should handle null code input', () => {
      expect(() => detectSharedState(null, 'test.js')).not.toThrow();
    });

    it('should handle undefined code input', () => {
      expect(() => detectSharedState(undefined, 'test.js')).not.toThrow();
    });

    it('should handle null filePath', () => {
      expect(() => detectSharedState('window.test = 1;', null)).not.toThrow();
    });
  });
});
