/**
 * @fileoverview event-graph.test.js
 * 
 * Tests para el Event Graph Builder
 */

import { describe, it, expect } from 'vitest';
import { buildEventGraph, findEventChains, getEventGraphStats } from '../../../../src/layer-graph/builders/event-graph.js';

describe('Event Graph Builder', () => {
  describe('buildEventGraph', () => {
    it('should return empty graph for empty atoms', () => {
      const atoms = new Map();
      const result = buildEventGraph(atoms);
      
      expect(result.nodes).toEqual([]);
      expect(result.edges).toEqual([]);
      expect(result.meta.totalEvents).toBe(0);
    });
    
    it('should detect events from temporal patterns', () => {
      const atoms = new Map([
        ['atom1', {
          id: 'atom1',
          name: 'init',
          filePath: 'src/app.js',
          temporal: {
            patterns: {
              events: [
                { name: 'ready', action: 'on', line: 10 },
                { name: 'error', action: 'emit', line: 20 }
              ]
            }
          }
        }]
      ]);
      
      const result = buildEventGraph(atoms);
      
      expect(result.nodes.length).toBeGreaterThan(0);
    });
    
    it('should create edges for emitters and handlers', () => {
      const atoms = new Map([
        ['emitter', {
          id: 'emitter',
          name: 'emitData',
          filePath: 'src/stream.js',
          temporal: {
            patterns: {
              events: [
                { name: 'data', action: 'emit', line: 10 }
              ]
            }
          }
        }],
        ['handler', {
          id: 'handler',
          name: 'onData',
          filePath: 'src/stream.js',
          temporal: {
            patterns: {
              events: [
                { name: 'data', action: 'on', line: 15 }
              ]
            }
          }
        }]
      ]);
      
      const result = buildEventGraph(atoms);
      
      // Should have emit edge and handle edge
      expect(result.edges.length).toBeGreaterThanOrEqual(2);
    });
  });
  
  describe('getEventGraphStats', () => {
    it('should return stats for event graph', () => {
      const eventGraph = {
        nodes: [
          { type: 'event', name: 'click', handlers: [1, 2] },
          { type: 'event', name: 'data', handlers: [1] }
        ],
        meta: {
          totalEmitters: 3,
          totalHandlers: 3
        }
      };
      
      const stats = getEventGraphStats(eventGraph);
      
      expect(stats.totalEvents).toBe(2);
      expect(stats.totalEmitters).toBe(3);
      expect(stats.totalHandlers).toBe(3);
    });
    
    it('should categorize event types', () => {
      const eventGraph = {
        nodes: [
          { type: 'event', name: 'click' },
          { type: 'event', name: 'keydown' },
          { type: 'event', name: 'data' },
          { type: 'event', name: 'error' }
        ],
        meta: { totalEmitters: 0, totalHandlers: 0 }
      };
      
      const stats = getEventGraphStats(eventGraph);
      
      expect(stats.eventTypes['dom-event']).toBe(2);
      expect(stats.eventTypes['data-event']).toBe(1);
      expect(stats.eventTypes['error-event']).toBe(1);
    });
  });
  
  describe('findEventChains', () => {
    it('should return empty array for no chains', () => {
      const eventGraph = { nodes: [] };
      const atoms = new Map();
      
      const chains = findEventChains(eventGraph, atoms);
      
      expect(chains).toEqual([]);
    });
  });
});