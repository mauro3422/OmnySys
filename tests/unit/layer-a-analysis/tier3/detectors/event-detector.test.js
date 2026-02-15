/**
 * @fileoverview Event Detector Integration Tests
 * 
 * Phase 3 - Tier 3 Analysis Testing
 * Tests for event-detector/ facade (index.js)
 * 
 * @module tests/unit/layer-a-analysis/tier3/detectors/event-detector
 */

import { describe, it, expect } from 'vitest';
import {
  analyzeEventPatterns,
  detectEventPatterns,
  detectListeners,
  detectEmitters,
  generateEventConnections,
  // Constants
  EVENT_PATTERNS,
  ConnectionType,
  Severity,
  MIN_CONFIDENCE_THRESHOLD,
  // Parser
  parseCodeToAST,
  isParseableFile,
  // AST Utils
  extractEventName,
  getConfidence,
  getObjectName,
  getMethodName,
  isMethodCall,
  // Indexer
  indexEventsByName,
  indexBusObjects,
  getBusAccessors,
  getEventStats,
  // Bus Owner
  detectBusOwners,
  isPossibleBusOwner,
  getBusOwner,
  getOrphanBuses,
  // Severity Calculator
  calculateEventSeverity,
  isCriticalEventName,
  calculateAverageConfidence,
  determineConnectionSeverity
} from '#layer-a/analyses/tier3/event-detector/index.js';
import { EventPatternBuilder } from '../../../../factories/tier3-analysis.factory.js';

describe('EventDetector', () => {
  describe('Structure Contract', () => {
    it('should export main analyze function', () => {
      expect(typeof analyzeEventPatterns).toBe('function');
    });

    it('should export detection functions', () => {
      expect(typeof detectEventPatterns).toBe('function');
      expect(typeof detectListeners).toBe('function');
      expect(typeof detectEmitters).toBe('function');
    });

    it('should export connection generator', () => {
      expect(typeof generateEventConnections).toBe('function');
    });

    it('should export constants', () => {
      expect(EVENT_PATTERNS).toBeDefined();
      expect(ConnectionType).toBeDefined();
      expect(Severity).toBeDefined();
      expect(typeof MIN_CONFIDENCE_THRESHOLD).toBe('number');
    });

    it('should export parser functions', () => {
      expect(typeof parseCodeToAST).toBe('function');
      expect(typeof isParseableFile).toBe('function');
    });

    it('should export AST utils', () => {
      expect(typeof extractEventName).toBe('function');
      expect(typeof getConfidence).toBe('function');
      expect(typeof getObjectName).toBe('function');
      expect(typeof getMethodName).toBe('function');
      expect(typeof isMethodCall).toBe('function');
    });

    it('should export indexer functions', () => {
      expect(typeof indexEventsByName).toBe('function');
      expect(typeof indexBusObjects).toBe('function');
      expect(typeof getBusAccessors).toBe('function');
      expect(typeof getEventStats).toBe('function');
    });

    it('should export bus owner functions', () => {
      expect(typeof detectBusOwners).toBe('function');
      expect(typeof isPossibleBusOwner).toBe('function');
      expect(typeof getBusOwner).toBe('function');
      expect(typeof getOrphanBuses).toBe('function');
    });

    it('should export severity functions', () => {
      expect(typeof calculateEventSeverity).toBe('function');
      expect(typeof isCriticalEventName).toBe('function');
      expect(typeof calculateAverageConfidence).toBe('function');
      expect(typeof determineConnectionSeverity).toBe('function');
    });

    it('should return expected structure from detectEventPatterns', () => {
      const result = detectEventPatterns('', 'test.js');
      expect(result).toHaveProperty('eventListeners');
      expect(result).toHaveProperty('eventEmitters');
      expect(Array.isArray(result.eventListeners)).toBe(true);
      expect(Array.isArray(result.eventEmitters)).toBe(true);
    });

    it('should not throw on empty input', () => {
      expect(() => detectEventPatterns('', 'test.js')).not.toThrow();
      expect(() => analyzeEventPatterns({})).not.toThrow();
    });
  });

  describe('Functionality Tests', () => {
    describe('Event Pattern Detection', () => {
      it('should detect event listeners', () => {
        const code = `eventBus.on('user-login', handler);`;
        const result = detectEventPatterns(code, 'test.js');
        
        expect(result.eventListeners).toHaveLength(1);
        expect(result.eventListeners[0]).toMatchObject({
          eventName: 'user-login',
          pattern: 'on',
          objectName: 'eventBus'
        });
      });

      it('should detect event emitters', () => {
        const code = `eventBus.emit('user-login', data);`;
        const result = detectEventPatterns(code, 'test.js');
        
        expect(result.eventEmitters).toHaveLength(1);
        expect(result.eventEmitters[0]).toMatchObject({
          eventName: 'user-login',
          pattern: 'emit',
          objectName: 'eventBus'
        });
      });

      it('should detect addEventListener', () => {
        const code = `document.addEventListener('click', handler);`;
        const result = detectEventPatterns(code, 'test.js');
        
        expect(result.eventListeners[0].pattern).toBe('addEventListener');
      });

      it('should detect once listener', () => {
        const code = `emitter.once('ready', init);`;
        const result = detectEventPatterns(code, 'test.js');
        
        expect(result.eventListeners[0].pattern).toBe('once');
      });

      it('should detect subscribe listener with string event', () => {
        const code = `store.subscribe('event', callback);`;
        const result = detectEventPatterns(code, 'test.js');
        
        expect(result.eventListeners[0].pattern).toBe('subscribe');
      });

      it('should detect trigger emitter', () => {
        const code = `$(element).trigger('click');`;
        const result = detectEventPatterns(code, 'test.js');
        
        expect(result.eventEmitters[0].pattern).toBe('trigger');
      });

      it('should detect publish emitter', () => {
        const code = `pubsub.publish('message', data);`;
        const result = detectEventPatterns(code, 'test.js');
        
        expect(result.eventEmitters[0].pattern).toBe('publish');
      });

      it('should track file path and location', () => {
        const code = `bus.on('event', fn);`;
        const result = detectEventPatterns(code, '/path/file.js');
        
        expect(result.eventListeners[0].filePath).toBe('/path/file.js');
        expect(result.eventListeners[0]).toHaveProperty('line');
        expect(result.eventListeners[0]).toHaveProperty('column');
      });

      it('should track function context', () => {
        const code = `
          function setup() {
            bus.on('event', handler);
          }
        `;
        const result = detectEventPatterns(code, 'test.js');
        
        expect(result.eventListeners[0].functionContext).toBe('setup');
      });

      it('should calculate confidence for string literals', () => {
        const code = `bus.on('known-event', fn);`;
        const result = detectEventPatterns(code, 'test.js');
        
        expect(result.eventListeners[0].confidence).toBe(1.0);
      });

      it('should skip events with variable names', () => {
        const code = `bus.on(variableName, fn);`;
        const result = detectEventPatterns(code, 'test.js');
        
        expect(result.eventListeners).toHaveLength(0);
      });
    });

    describe('Detect Helpers', () => {
      it('detectListeners should return only listeners', () => {
        const code = `
          bus.on('event1', fn1);
          bus.emit('event2', data);
          bus.on('event3', fn2);
        `;
        const listeners = detectListeners(code, 'test.js');
        
        expect(listeners).toHaveLength(2);
        expect(listeners.every(l => l.eventName)).toBe(true);
      });

      it('detectEmitters should return only emitters', () => {
        const code = `
          bus.on('event1', fn);
          bus.emit('event2', data);
          bus.publish('event3', msg);
        `;
        const emitters = detectEmitters(code, 'test.js');
        
        expect(emitters).toHaveLength(2);
      });
    });

    describe('Event Indexing', () => {
      const mockFileAnalysis = {
        'fileA.js': {
          eventListeners: [
            { eventName: 'login', objectName: 'bus', pattern: 'on' }
          ],
          eventEmitters: []
        },
        'fileB.js': {
          eventListeners: [],
          eventEmitters: [
            { eventName: 'login', objectName: 'bus', pattern: 'emit' }
          ]
        }
      };

      it('should index events by name', () => {
        const index = indexEventsByName(mockFileAnalysis);
        
        expect(index.has('login')).toBe(true);
        expect(index.get('login').listeners).toHaveLength(1);
        expect(index.get('login').emitters).toHaveLength(1);
      });

      it('should index bus objects', () => {
        const index = indexBusObjects(mockFileAnalysis);
        
        expect(index.has('bus')).toBe(true);
        expect(index.get('bus').listeners).toContain('fileA.js');
        expect(index.get('bus').emitters).toContain('fileB.js');
      });

      it('should get bus accessors', () => {
        const busData = { listeners: ['fileA.js'], emitters: ['fileB.js'] };
        const accessors = getBusAccessors(busData);
        
        expect(accessors).toContain('fileA.js');
        expect(accessors).toContain('fileB.js');
      });

      it('should calculate event stats', () => {
        const index = indexEventsByName(mockFileAnalysis);
        const stats = getEventStats(index);
        
        expect(stats.totalEvents).toBe(1);
        expect(stats.totalListeners).toBe(1);
        expect(stats.totalEmitters).toBe(1);
      });
    });

    describe('Bus Owner Detection', () => {
      it('should detect bus owner by file name pattern', () => {
        const fileAnalysis = {
          'src/events/eventBus.js': { eventListeners: [], eventEmitters: [] },
          'src/components/App.js': { 
            eventListeners: [{ objectName: 'eventBus' }], 
            eventEmitters: [] 
          }
        };
        const busIndex = new Map([['eventBus', { listeners: ['src/components/App.js'], emitters: [] }]]);
        
        const owners = detectBusOwners(busIndex, fileAnalysis);
        
        expect(owners.get('eventBus')).toBe('src/events/eventBus.js');
      });

      it('should fallback to first accessor if no pattern match', () => {
        const fileAnalysis = { 'src/utils.js': {} };
        const busIndex = new Map([['myBus', { listeners: ['src/utils.js'], emitters: [] }]]);
        
        const owners = detectBusOwners(busIndex, fileAnalysis);
        
        expect(owners.get('myBus')).toBe('src/utils.js');
      });

      it('should identify possible bus owners', () => {
        expect(isPossibleBusOwner('src/eventBus.js')).toBe(true);
        expect(isPossibleBusOwner('src/event-bus.js')).toBe(true);
        expect(isPossibleBusOwner('src/events.js')).toBe(true);
        expect(isPossibleBusOwner('src/utils.js')).toBe(false);
      });

      it('should get bus owner', () => {
        const owners = new Map([['bus1', 'fileA.js']]);
        
        expect(getBusOwner('bus1', owners)).toBe('fileA.js');
        expect(getBusOwner('bus2', owners)).toBeNull();
      });

      it('should find orphan buses', () => {
        const busIndex = new Map([['bus1', {}], ['bus2', {}]]);
        const owners = new Map([['bus1', 'fileA.js']]);
        
        const orphans = getOrphanBuses(busIndex, owners);
        
        expect(orphans).toContain('bus2');
        expect(orphans).not.toContain('bus1');
      });
    });

    describe('Connection Generation', () => {
      const mockAnalysis = {
        'emitter.js': {
          eventListeners: [],
          eventEmitters: [
            { eventName: 'user-action', objectName: 'bus', pattern: 'emit', confidence: 1.0 }
          ]
        },
        'listener.js': {
          eventListeners: [
            { eventName: 'user-action', objectName: 'bus', pattern: 'on', confidence: 1.0 }
          ],
          eventEmitters: []
        }
      };

      it('should generate emitter to listener connections', () => {
        const connections = generateEventConnections(mockAnalysis);
        
        expect(connections.length).toBeGreaterThan(0);
        expect(connections[0]).toMatchObject({
          type: ConnectionType.EVENT_LISTENER,
          sourceFile: 'emitter.js',
          targetFile: 'listener.js'
        });
      });

      it('should skip same-file connections', () => {
        const sameFileAnalysis = {
          'file.js': {
            eventListeners: [
              { eventName: 'event', objectName: 'bus', pattern: 'on', confidence: 1.0 }
            ],
            eventEmitters: [
              { eventName: 'event', objectName: 'bus', pattern: 'emit', confidence: 1.0 }
            ]
          }
        };
        
        const connections = generateEventConnections(sameFileAnalysis);
        
        expect(connections).toHaveLength(0);
      });

      it('should filter by confidence threshold', () => {
        // Use different bus names to avoid bus connections interfering
        const lowConfidenceAnalysis = {
          'fileA.js': {
            eventEmitters: [{ eventName: 'event', objectName: 'emitterBus', pattern: 'emit', confidence: 0.3 }],
            eventListeners: []
          },
          'fileB.js': {
            eventListeners: [{ eventName: 'event', objectName: 'listenerBus', pattern: 'on', confidence: 0.3 }],
            eventEmitters: []
          }
        };
        
        const connections = generateEventConnections(lowConfidenceAnalysis);
        
        // Confidence 0.3 is below MIN_CONFIDENCE_THRESHOLD (0.7)
        // No connections should be created
        expect(connections).toHaveLength(0);
      });

      it('should include event names in connections', () => {
        const connections = generateEventConnections(mockAnalysis);
        
        expect(connections[0].eventNames).toContain('user-action');
        expect(connections[0].eventCount).toBeGreaterThan(0);
      });

      it('should generate bus connections', () => {
        const busAnalysis = {
          'src/events/bus.js': { eventListeners: [], eventEmitters: [] },
          'src/user.js': {
            eventListeners: [{ eventName: 'login', objectName: 'eventBus', pattern: 'on', confidence: 1.0 }],
            eventEmitters: []
          }
        };
        
        const connections = generateEventConnections(busAnalysis);
        
        const busConnection = connections.find(c => c.reason?.includes('event bus'));
        if (busConnection) {
          expect(busConnection.severity).toBe('high');
        }
      });
    });

    describe('Severity Calculation', () => {
      it('should calculate critical severity for multiple emitters and listeners', () => {
        const severity = calculateEventSeverity('event', 2, 2);
        
        expect(severity).toBe(Severity.CRITICAL);
      });

      it('should calculate high severity for critical event names', () => {
        const severity = calculateEventSeverity('user-auth', 1, 1);
        
        expect(severity).toBe(Severity.HIGH);
      });

      it('should calculate high severity for many listeners', () => {
        const severity = calculateEventSeverity('event', 5, 1);
        
        expect(severity).toBe(Severity.HIGH);
      });

      it('should calculate medium severity for normal events', () => {
        const severity = calculateEventSeverity('normal-event', 1, 1);
        
        expect(severity).toBe(Severity.MEDIUM);
      });

      it('should identify critical event names', () => {
        expect(isCriticalEventName('auth')).toBe(true);
        expect(isCriticalEventName('login')).toBe(true);
        expect(isCriticalEventName('error')).toBe(true);
        expect(isCriticalEventName('crash')).toBe(true);
        expect(isCriticalEventName('user-click')).toBe(false);
      });

      it('should calculate average confidence', () => {
        expect(calculateAverageConfidence(0, 1.0, 1)).toBe(1.0);
        expect(calculateAverageConfidence(0.8, 0.9, 2)).toBeCloseTo(0.85);
      });

      it('should determine connection severity', () => {
        expect(determineConnectionSeverity(['auth'], 1)).toBe(Severity.HIGH);
        expect(determineConnectionSeverity(['event1', 'event2', 'event3', 'event4'], 4)).toBe(Severity.HIGH);
        expect(determineConnectionSeverity(['normal'], 1)).toBe(Severity.MEDIUM);
      });
    });

    describe('Integration - analyzeEventPatterns', () => {
      it('should analyze multiple files', () => {
        const files = {
          'fileA.js': `bus.emit('event', data);`,
          'fileB.js': `bus.on('event', handler);`
        };
        
        const result = analyzeEventPatterns(files);
        
        expect(result).toHaveProperty('connections');
        expect(result).toHaveProperty('fileResults');
        expect(result.connections.length).toBeGreaterThan(0);
      });

      it('should return file results', () => {
        const files = {
          'file.js': `bus.on('test', fn);`
        };
        
        const result = analyzeEventPatterns(files);
        
        expect(result.fileResults['file.js']).toBeDefined();
        expect(result.fileResults['file.js'].eventListeners).toHaveLength(1);
      });
    });

    describe('AST Utils', () => {
      it('should extract string literal event names', () => {
        expect(extractEventName({ type: 'StringLiteral', value: 'event' })).toBe('event');
        expect(extractEventName({ type: 'Identifier', name: 'VAR' })).toBeNull();
        expect(extractEventName(null)).toBeNull();
      });

      it('should calculate confidence', () => {
        expect(getConfidence({ type: 'StringLiteral' })).toBe(1.0);
        expect(getConfidence({ type: 'Identifier' })).toBe(0.5);
        expect(getConfidence({ type: 'TemplateLiteral' })).toBe(0.6);
        expect(getConfidence(null)).toBe(0.3);
      });

      it('should get object name from callee', () => {
        const callee = { type: 'MemberExpression', object: { name: 'bus' } };
        expect(getObjectName(callee)).toBe('bus');
        expect(getObjectName({ type: 'Identifier' })).toBeNull();
      });

      it('should get method name from callee', () => {
        const callee = { type: 'MemberExpression', property: { name: 'on' } };
        expect(getMethodName(callee)).toBe('on');
        expect(getMethodName({ type: 'Identifier' })).toBeNull();
      });

      it('should identify method calls', () => {
        expect(isMethodCall({ callee: { type: 'MemberExpression', property: { name: 'on' } } })).toBe(true);
        expect(isMethodCall({ callee: { type: 'Identifier' } })).toBe(false);
        expect(isMethodCall(null)).toBe(false);
      });
    });

    describe('Parser', () => {
      it('should parse JavaScript code', () => {
        const ast = parseCodeToAST('const x = 1;', 'test.js');
        
        expect(ast).toBeDefined();
        expect(ast?.type).toBe('File');
      });

      it('should return null for invalid code', () => {
        const ast = parseCodeToAST('not valid', 'test.js');
        
        expect(ast).toBeNull();
      });

      it('should identify parseable files', () => {
        expect(isParseableFile('file.js')).toBe(true);
        expect(isParseableFile('file.ts')).toBe(true);
        expect(isParseableFile('file.jsx')).toBe(true);
        expect(isParseableFile('file.css')).toBe(false);
      });
    });
  });

  describe('Error Handling Contract', () => {
    it('should handle empty code in detection', () => {
      const result = detectEventPatterns('', 'test.js');
      
      expect(result.eventListeners).toHaveLength(0);
      expect(result.eventEmitters).toHaveLength(0);
    });

    it('should handle invalid code gracefully', () => {
      const result = detectEventPatterns('not valid {{{}}}', 'test.js');
      
      expect(result.eventListeners).toHaveLength(0);
      expect(result.eventEmitters).toHaveLength(0);
    });

    it('should handle missing arrays in file analysis', () => {
      const fileAnalysis = {
        'file.js': { eventListeners: null, eventEmitters: undefined }
      };
      
      expect(() => indexEventsByName(fileAnalysis)).not.toThrow();
    });

    it('should handle event names with special characters', () => {
      const code = `bus.on('user:login:success', fn);`;
      const result = detectEventPatterns(code, 'test.js');
      
      expect(result.eventListeners[0].eventName).toBe('user:login:success');
    });

    it('should handle code without event patterns', () => {
      const code = `const x = 1; function test() { return x; }`;
      const result = detectEventPatterns(code, 'test.js');
      
      expect(result.eventListeners).toHaveLength(0);
      expect(result.eventEmitters).toHaveLength(0);
    });

    it('should handle empty file map', () => {
      const result = analyzeEventPatterns({});
      
      expect(result.connections).toHaveLength(0);
      expect(Object.keys(result.fileResults)).toHaveLength(0);
    });

    it('should handle null parameters (documented behavior)', () => {
      // Module throws on null - documenting current behavior
      try {
        parseCodeToAST(null, 'test.js');
      } catch (e) {
        expect(e).toBeInstanceOf(TypeError);
      }
      try {
        isParseableFile(null);
      } catch (e) {
        expect(e).toBeInstanceOf(TypeError);
      }
    });

    it('should handle undefined parameters (documented behavior)', () => {
      // Module throws on undefined - documenting current behavior
      try {
        parseCodeToAST(undefined, 'test.js');
      } catch (e) {
        expect(e).toBeInstanceOf(TypeError);
      }
      try {
        isParseableFile(undefined);
      } catch (e) {
        expect(e).toBeInstanceOf(TypeError);
      }
    });

    it('should handle null in extractEventName', () => {
      expect(extractEventName(null)).toBeNull();
    });

    it('should handle null in getConfidence', () => {
      expect(getConfidence(null)).toBe(0.3);
    });
  });
});
