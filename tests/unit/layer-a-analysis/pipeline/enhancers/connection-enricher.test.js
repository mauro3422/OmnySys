/**
 * @fileoverview connection-enricher.test.js
 * 
 * Tests for Connection Enricher
 * Tests enrichConnections
 * 
 * @module tests/unit/layer-a-analysis/pipeline/enhancers/connection-enricher
 */

import { describe, it, expect, vi } from 'vitest';
import { enrichConnections } from '#layer-a/pipeline/enhancers/connection-enricher.js';

// Mock all dependencies
vi.mock('#layer-a/extractors/metadata/temporal-connections.js', () => ({
  extractTemporalConnections: vi.fn(() => []),
  extractCrossFileTemporalConnections: vi.fn(() => [])
}));

vi.mock('#layer-a/extractors/metadata/type-contracts.js', () => ({
  extractTypeContractConnections: vi.fn(() => [])
}));

vi.mock('#layer-a/extractors/metadata/error-flow.js', () => ({
  extractErrorFlowConnections: vi.fn(() => [])
}));

vi.mock('#layer-a/extractors/metadata/performance-impact.js', () => ({
  extractPerformanceImpactConnections: vi.fn(() => [])
}));

vi.mock('#layer-a/pipeline/enhancers/connections/dataflow/index.js', () => ({
  extractDataFlowConnections: vi.fn(() => [])
}));

vi.mock('#layer-a/pipeline/enhancers/connections/ancestry/index.js', () => ({
  extractInheritedConnections: vi.fn(() => Promise.resolve([]))
}));

vi.mock('#layer-a/pipeline/enhancers/connections/weights/index.js', () => ({
  calculateAllWeights: vi.fn(() => [])
}));

vi.mock('#layer-a/pipeline/enhancers/connections/conflicts/index.js', () => ({
  detectConnectionConflicts: vi.fn(() => [])
}));

describe('Connection Enricher', () => {
  describe('enrichConnections', () => {
    it('should return connections, conflicts, and stats', async () => {
      const atoms = [{ id: 'atom-1' }];

      const result = await enrichConnections(atoms);

      expect(result).toHaveProperty('connections');
      expect(result).toHaveProperty('conflicts');
      expect(result).toHaveProperty('stats');
    });

    it('should include array connections', async () => {
      const atoms = [{ id: 'atom-1' }];

      const result = await enrichConnections(atoms);

      expect(Array.isArray(result.connections)).toBe(true);
    });

    it('should include array conflicts', async () => {
      const atoms = [{ id: 'atom-1' }];

      const result = await enrichConnections(atoms);

      expect(Array.isArray(result.conflicts)).toBe(true);
    });

    it('should include object stats', async () => {
      const atoms = [{ id: 'atom-1' }];

      const result = await enrichConnections(atoms);

      expect(typeof result.stats).toBe('object');
    });

    it('should call extractTemporalConnections', async () => {
      const { extractTemporalConnections } = await import('#layer-a/extractors/metadata/temporal-connections.js');
      const atoms = [{ id: 'atom-1' }];

      await enrichConnections(atoms);

      expect(extractTemporalConnections).toHaveBeenCalledWith(atoms);
    });

    it('should call extractDataFlowConnections', async () => {
      const { extractDataFlowConnections } = await import('#layer-a/pipeline/enhancers/connections/dataflow/index.js');
      const atoms = [{ id: 'atom-1' }];

      await enrichConnections(atoms);

      expect(extractDataFlowConnections).toHaveBeenCalledWith(atoms);
    });

    it('should call calculateAllWeights', async () => {
      const { calculateAllWeights } = await import('#layer-a/pipeline/enhancers/connections/weights/index.js');
      const atoms = [{ id: 'atom-1' }];

      await enrichConnections(atoms);

      expect(calculateAllWeights).toHaveBeenCalled();
    });

    it('should call detectConnectionConflicts', async () => {
      const { detectConnectionConflicts } = await import('#layer-a/pipeline/enhancers/connections/conflicts/index.js');
      const atoms = [{ id: 'atom-1' }];

      await enrichConnections(atoms);

      expect(detectConnectionConflicts).toHaveBeenCalled();
    });

    it('should include stats for each connection type', async () => {
      const atoms = [{ id: 'atom-1' }];

      const result = await enrichConnections(atoms);

      expect(result.stats).toHaveProperty('temporal');
      expect(result.stats).toHaveProperty('crossFileTemporal');
      expect(result.stats).toHaveProperty('dataFlow');
      expect(result.stats).toHaveProperty('inherited');
      expect(result.stats).toHaveProperty('conflicts');
    });

    it('should handle empty atoms array', async () => {
      const atoms = [];

      const result = await enrichConnections(atoms);

      expect(result.connections).toEqual([]);
      expect(result.conflicts).toEqual([]);
    });

    it('should accept options parameter', async () => {
      const atoms = [{ id: 'atom-1' }];
      const options = { verbose: true };

      const result = await enrichConnections(atoms, options);

      expect(result).toBeDefined();
    });

    it('should return weighted connections', async () => {
      const { calculateAllWeights } = await import('#layer-a/pipeline/enhancers/connections/weights/index.js');
      calculateAllWeights.mockReturnValueOnce([
        { id: 'conn-1', weight: 1.5, connectionCategory: 'critical' }
      ]);

      const atoms = [{ id: 'atom-1' }];

      const result = await enrichConnections(atoms);

      expect(result.connections).toHaveLength(1);
      expect(result.connections[0].weight).toBe(1.5);
    });

    it('should return conflicts from detector', async () => {
      const { detectConnectionConflicts } = await import('#layer-a/pipeline/enhancers/connections/conflicts/index.js');
      detectConnectionConflicts.mockReturnValueOnce([
        { type: 'temporal-cycle', severity: 'critical' }
      ]);

      const atoms = [{ id: 'atom-1' }];

      const result = await enrichConnections(atoms);

      expect(result.conflicts).toHaveLength(1);
      expect(result.stats.conflicts).toBe(1);
    });
  });
});
