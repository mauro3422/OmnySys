/**
 * @fileoverview dataflow-extractor.test.js
 * 
 * Tests for DataFlow Extractor
 * Tests extractDataFlowConnections, generateTypeKey, calculateDataFlowConfidence
 * 
 * @module tests/unit/layer-a-analysis/pipeline/enhancers/connections/dataflow
 */

import { describe, it, expect } from 'vitest';
import {
  extractDataFlowConnections,
  generateTypeKey,
  calculateDataFlowConfidence
} from '#layer-a/pipeline/enhancers/connections/dataflow/dataflow-extractor.js';

describe('DataFlow Extractor', () => {
  describe('extractDataFlowConnections', () => {
    it('should return empty array for empty atoms', () => {
      const result = extractDataFlowConnections([]);

      expect(result).toEqual([]);
    });

    it('should return empty array for atoms without dataFlow', () => {
      const atoms = [
        { id: 'atom-1', name: 'test' }
      ];

      const result = extractDataFlowConnections(atoms);

      expect(result).toEqual([]);
    });

    it('should extract connections from matching inputs and outputs', () => {
      const atoms = [
        {
          id: 'atom-1',
          dataFlow: {
            outputs: [
              { type: 'User', shape: { name: 'string' } }
            ]
          }
        },
        {
          id: 'atom-2',
          dataFlow: {
            inputs: [
              { type: 'User', shape: { name: 'string' } }
            ]
          }
        }
      ];

      const result = extractDataFlowConnections(atoms);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe('data-flow-chain');
    });

    it('should set correct from and to', () => {
      const atoms = [
        {
          id: 'producer',
          dataFlow: {
            outputs: [{ type: 'Data' }]
          }
        },
        {
          id: 'consumer',
          dataFlow: {
            inputs: [{ type: 'Data' }]
          }
        }
      ];

      const result = extractDataFlowConnections(atoms);

      expect(result[0].from).toBe('producer');
      expect(result[0].to).toBe('consumer');
    });

    it('should set relationship to produces-consumes', () => {
      const atoms = [
        {
          id: 'atom-1',
          dataFlow: {
            outputs: [{ type: 'Data' }]
          }
        },
        {
          id: 'atom-2',
          dataFlow: {
            inputs: [{ type: 'Data' }]
          }
        }
      ];

      const result = extractDataFlowConnections(atoms);

      expect(result[0].relationship).toBe('produces-consumes');
    });

    it('should not connect atom to itself', () => {
      const atoms = [
        {
          id: 'atom-1',
          dataFlow: {
            outputs: [{ type: 'Data' }],
            inputs: [{ type: 'Data' }]
          }
        }
      ];

      const result = extractDataFlowConnections(atoms);

      expect(result).toEqual([]);
    });

    it('should include confidence', () => {
      const atoms = [
        {
          id: 'atom-1',
          dataFlow: {
            outputs: [{ type: 'Data' }]
          }
        },
        {
          id: 'atom-2',
          dataFlow: {
            inputs: [{ type: 'Data' }]
          }
        }
      ];

      const result = extractDataFlowConnections(atoms);

      expect(result[0].confidence).toBeDefined();
      expect(typeof result[0].confidence).toBe('number');
    });

    it('should include evidence', () => {
      const atoms = [
        {
          id: 'atom-1',
          dataFlow: {
            outputs: [{ type: 'Data', shape: { id: 'number' } }]
          }
        },
        {
          id: 'atom-2',
          dataFlow: {
            inputs: [{ type: 'Data', shape: { id: 'number' } }]
          }
        }
      ];

      const result = extractDataFlowConnections(atoms);

      expect(result[0].evidence).toBeDefined();
    });

    it('should include dataType', () => {
      const atoms = [
        {
          id: 'atom-1',
          dataFlow: {
            outputs: [{ type: 'UserData' }]
          }
        },
        {
          id: 'atom-2',
          dataFlow: {
            inputs: [{ type: 'UserData' }]
          }
        }
      ];

      const result = extractDataFlowConnections(atoms);

      expect(result[0].dataType).toBeDefined();
    });
  });

  describe('generateTypeKey', () => {
    it('should generate key from shape', () => {
      const data = { shape: { name: 'string', age: 'number' } };

      const result = generateTypeKey(data);

      expect(result).toContain('name');
      expect(result).toContain('string');
    });

    it('should generate key from type', () => {
      const data = { type: 'User' };

      const result = generateTypeKey(data);

      expect(result).toBe('User');
    });

    it('should return unknown for empty data', () => {
      const result = generateTypeKey({});

      expect(result).toBe('unknown');
    });

    it('should remove quotes from JSON', () => {
      const data = { shape: { name: 'string' } };

      const result = generateTypeKey(data);

      expect(result).not.toContain('"');
    });

    it('should handle nested shapes', () => {
      const data = {
        shape: {
          user: { name: 'string' },
          items: []
        }
      };

      const result = generateTypeKey(data);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('calculateDataFlowConfidence', () => {
    it('should return base confidence for basic match', () => {
      const source = {
        atom: { id: 'atom-1', filePath: 'a.js', isExported: false, calls: [] },
        output: { type: 'Data' }
      };
      const input = { name: 'test' };

      const result = calculateDataFlowConfidence(source, input);

      expect(result).toBeGreaterThanOrEqual(0.5);
    });

    it('should increase confidence for same file', () => {
      const source = {
        atom: { id: 'atom-1', filePath: 'same.js', isExported: false, calls: [] },
        output: { type: 'Data' }
      };
      const input = { name: 'test', filePath: 'same.js' };

      const result = calculateDataFlowConfidence(source, input);

      expect(result).toBeGreaterThan(0.5);
    });

    it('should increase confidence for exported source', () => {
      const source = {
        atom: { id: 'atom-1', filePath: 'a.js', isExported: true, calls: [] },
        output: { type: 'Data' }
      };
      const input = { name: 'test' };

      const result = calculateDataFlowConfidence(source, input);

      expect(result).toBeGreaterThan(0.5);
    });

    it('should increase confidence when source is called', () => {
      const source = {
        atom: { id: 'atom-1', filePath: 'a.js', isExported: false, calls: ['test', 'other'] },
        output: { type: 'Data' }
      };
      const input = { name: 'test' };

      const result = calculateDataFlowConfidence(source, input);

      expect(result).toBeGreaterThan(0.5);
    });

    it('should cap confidence at 1.0', () => {
      const source = {
        atom: {
          id: 'atom-1',
          filePath: 'same.js',
          isExported: true,
          calls: ['test']
        },
        output: { type: 'Data' }
      };
      const input = { name: 'test', filePath: 'same.js' };

      const result = calculateDataFlowConfidence(source, input);

      expect(result).toBeLessThanOrEqual(1.0);
    });
  });
});
