/**
 * @fileoverview Tests for tier2/cycle-metadata.js
 * 
 * Tests the extractCycleMetadata and deriveCycleProperties functions.
 */

import { describe, it, expect } from 'vitest';
import {
  extractCycleMetadata,
  deriveCycleProperties
} from '#layer-a/analyses/tier2/cycle-metadata.js';

describe('tier2/cycle-metadata.js', () => {
  describe('extractCycleMetadata', () => {
    it('should return array with same length as cycle', () => {
      const cycle = ['src/a.js', 'src/b.js', 'src/c.js'];
      const atomsIndex = {};
      
      const result = extractCycleMetadata(cycle, atomsIndex);
      
      expect(result).toHaveLength(3);
    });

    it('should include filePath for each entry', () => {
      const cycle = ['src/a.js'];
      const atomsIndex = {};
      
      const result = extractCycleMetadata(cycle, atomsIndex);
      
      expect(result[0].filePath).toBe('src/a.js');
    });

    it('should extract atoms with all relevant properties', () => {
      const cycle = ['src/utils.js'];
      const atomsIndex = {
        'src/utils.js': {
          atoms: [{
            name: 'formatDate',
            isAsync: false,
            hasSideEffects: false,
            hasNetworkCalls: false,
            hasStorageAccess: false,
            hasLifecycleHooks: false,
            hasDomManipulation: false,
            archetypes: ['helper'],
            temporal: {},
            calls: []
          }]
        }
      };
      
      const result = extractCycleMetadata(cycle, atomsIndex);
      
      const atom = result[0].atoms[0];
      expect(atom.name).toBe('formatDate');
      expect(atom.isAsync).toBe(false);
      expect(atom.hasSideEffects).toBe(false);
      expect(atom.archetypes).toEqual(['helper']);
    });

    it('should handle atoms without all properties', () => {
      const cycle = ['src/simple.js'];
      const atomsIndex = {
        'src/simple.js': {
          atoms: [{ name: 'simple' }]
        }
      };
      
      const result = extractCycleMetadata(cycle, atomsIndex);
      
      expect(result[0].atoms[0].name).toBe('simple');
      expect(result[0].atoms[0].isAsync).toBeFalsy();
    });

    it('should count atoms correctly', () => {
      const cycle = ['src/many.js'];
      const atomsIndex = {
        'src/many.js': {
          atoms: [
            { name: 'a' },
            { name: 'b' },
            { name: 'c' }
          ]
        }
      };
      
      const result = extractCycleMetadata(cycle, atomsIndex);
      
      expect(result[0].atomCount).toBe(3);
    });

    it('should handle empty atoms array', () => {
      const cycle = ['src/empty.js'];
      const atomsIndex = {
        'src/empty.js': { atoms: [] }
      };
      
      const result = extractCycleMetadata(cycle, atomsIndex);
      
      expect(result[0].atomCount).toBe(0);
      expect(result[0].atoms).toEqual([]);
    });

    it('should handle missing file in atomsIndex', () => {
      const cycle = ['src/existing.js', 'src/missing.js'];
      const atomsIndex = {
        'src/existing.js': { atoms: [{ name: 'func' }] }
      };
      
      const result = extractCycleMetadata(cycle, atomsIndex);
      
      expect(result[0].atoms).toHaveLength(1);
      expect(result[1].atoms).toEqual([]);
    });

    it('should preserve complex temporal patterns', () => {
      const cycle = ['src/events.js'];
      const atomsIndex = {
        'src/events.js': {
          atoms: [{
            temporal: {
              patterns: {
                eventEmitter: true,
                eventListener: false,
                lifecycleHooks: ['mount', 'unmount'],
                initialization: true
              }
            }
          }]
        }
      };
      
      const result = extractCycleMetadata(cycle, atomsIndex);
      
      expect(result[0].atoms[0].temporal.patterns.eventEmitter).toBe(true);
      expect(result[0].atoms[0].temporal.patterns.lifecycleHooks).toEqual(['mount', 'unmount']);
    });
  });

  describe('deriveCycleProperties', () => {
    it('should handle empty metadata array', () => {
      const result = deriveCycleProperties([]);
      
      expect(result.cycleLength).toBe(0);
      expect(result.totalAtoms).toBe(0);
    });

    it('should calculate cycle length correctly', () => {
      const metadata = [
        { filePath: 'src/a.js', atoms: [] },
        { filePath: 'src/b.js', atoms: [] }
      ];
      
      const result = deriveCycleProperties(metadata);
      
      expect(result.cycleLength).toBe(2);
    });

    it('should count total atoms across all files', () => {
      const metadata = [
        { filePath: 'src/a.js', atoms: [{}, {}] },
        { filePath: 'src/b.js', atoms: [{}] }
      ];
      
      const result = deriveCycleProperties(metadata);
      
      expect(result.totalAtoms).toBe(3);
    });

    it('should detect event emitters', () => {
      const metadata = [{
        filePath: 'src/events.js',
        atoms: [{ temporal: { patterns: { eventEmitter: true } } }]
      }];
      
      const result = deriveCycleProperties(metadata);
      
      expect(result.hasEventEmitters).toBe(true);
      expect(result.hasEventListeners).toBe(false);
    });

    it('should detect event listeners', () => {
      const metadata = [{
        filePath: 'src/events.js',
        atoms: [{ temporal: { patterns: { eventListener: true } } }]
      }];
      
      const result = deriveCycleProperties(metadata);
      
      expect(result.hasEventListeners).toBe(true);
      expect(result.hasEventEmitters).toBe(false);
    });

    it('should detect lifecycle hooks', () => {
      const metadata = [{
        filePath: 'src/component.js',
        atoms: [{ hasLifecycleHooks: true }]
      }];
      
      const result = deriveCycleProperties(metadata);
      
      expect(result.hasLifecycleHooks).toBe(true);
    });

    it('should detect initialization patterns', () => {
      const metadata = [{
        filePath: 'src/init.js',
        atoms: [{ temporal: { patterns: { initialization: true } } }]
      }];
      
      const result = deriveCycleProperties(metadata);
      
      expect(result.hasInitialization).toBe(true);
    });

    it('should detect WebSocket/network calls', () => {
      const metadata = [{
        filePath: 'src/socket.js',
        atoms: [{ hasNetworkCalls: true }]
      }];
      
      const result = deriveCycleProperties(metadata);
      
      expect(result.hasWebSocket).toBe(true);
    });

    it('should detect side effects', () => {
      const metadata = [{
        filePath: 'src/effects.js',
        atoms: [{ hasSideEffects: true }]
      }];
      
      const result = deriveCycleProperties(metadata);
      
      expect(result.hasSideEffects).toBe(true);
    });

    it('should detect async patterns', () => {
      const metadata = [{
        filePath: 'src/async.js',
        atoms: [{ isAsync: true }]
      }];
      
      const result = deriveCycleProperties(metadata);
      
      expect(result.hasAsync).toBe(true);
    });

    it('should detect store archetype', () => {
      const metadata = [{
        filePath: 'src/store.js',
        atoms: [{ archetypes: ['store'] }]
      }];
      
      const result = deriveCycleProperties(metadata);
      
      expect(result.hasStateManagement).toBe(true);
    });

    it('should detect handler archetype', () => {
      const metadata = [{
        filePath: 'src/handlers.js',
        atoms: [{ archetypes: ['handler'] }]
      }];
      
      const result = deriveCycleProperties(metadata);
      
      expect(result.hasHandlers).toBe(true);
    });

    it('should calculate event-driven ratio', () => {
      const metadata = [{
        filePath: 'src/mixed.js',
        atoms: [
          { temporal: { patterns: { eventEmitter: true } } },
          { temporal: { patterns: {} } },
          { temporal: { patterns: { eventListener: true } } }
        ]
      }];
      
      const result = deriveCycleProperties(metadata);
      
      expect(result.eventDrivenRatio).toBe(2 / 3);
    });

    it('should calculate static import ratio', () => {
      const metadata = [{
        filePath: 'src/static.js',
        atoms: [
          { hasSideEffects: false, hasNetworkCalls: false },
          { hasSideEffects: false, hasNetworkCalls: false }
        ]
      }, {
        filePath: 'src/dynamic.js',
        atoms: [
          { hasSideEffects: true }
        ]
      }];
      
      const result = deriveCycleProperties(metadata);
      
      expect(result.staticImportRatio).toBe(0.5);
    });

    it('should collect unique archetypes', () => {
      const metadata = [{
        filePath: 'src/a.js',
        atoms: [
          { archetypes: ['helper', 'store'] },
          { archetypes: ['helper'] }
        ]
      }, {
        filePath: 'src/b.js',
        atoms: [
          { archetypes: ['handler'] }
        ]
      }];
      
      const result = deriveCycleProperties(metadata);
      
      expect(result.archetypes).toContain('helper');
      expect(result.archetypes).toContain('store');
      expect(result.archetypes).toContain('handler');
      expect(result.archetypes).toHaveLength(3);
    });

    it('should handle atoms without archetypes', () => {
      const metadata = [{
        filePath: 'src/simple.js',
        atoms: [{ name: 'func' }]
      }];
      
      const result = deriveCycleProperties(metadata);
      
      expect(result.archetypes).toEqual([]);
    });
  });
});
