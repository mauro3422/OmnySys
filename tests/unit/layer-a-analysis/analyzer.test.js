/**
 * @fileoverview Tests for analyzer.js - Root Orchestrator (Meta-Factory Pattern)
 * 
 * Tests the generateAnalysisReport function using standardized contracts.
 * 
 * @module tests/unit/layer-a-analysis/analyzer
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { generateAnalysisReport } from '#layer-a/analyzer.js';
import { SystemMapBuilder } from '#test-factories/graph-test.factory.js';

/**
 * Creates a minimal valid systemMap for testing
 */
function createMockSystemMap() {
  return SystemMapBuilder.create()
    .withFile('src/main.js')
    .withFunction('src/main.js', 'main', { isExported: true })
    .build();
}

/**
 * Meta-Factory Test Suite for analyzer.js
 * 
 * Automatically generates:
 * - Structure Contract (exports verification)
 * - Error Handling Contract (null/undefined handling)
 * - Return Structure Contract (return object shape)
 */
createAnalysisTestSuite({
  module: 'analyzer',
  exports: { generateAnalysisReport },
  analyzeFn: generateAnalysisReport,
  expectedFields: {
    metadata: 'object',
    patternDetection: 'object',
    qualityMetrics: 'object',
    recommendations: 'array'
  },
  createMockInput: createMockSystemMap,
  specificTests: [
    {
      name: 'returns valid analysis report structure',
      fn: async () => {
        const systemMap = createMockSystemMap();
        const report = await generateAnalysisReport(systemMap);
        
        expect(report).toBeDefined();
        expect(report).toHaveProperty('metadata');
        expect(report).toHaveProperty('patternDetection');
        expect(report).toHaveProperty('qualityMetrics');
        expect(report).toHaveProperty('recommendations');
      }
    },
    {
      name: 'includes metadata from systemMap',
      fn: async () => {
        const systemMap = createMockSystemMap();
        
        const report = await generateAnalysisReport(systemMap);
        
        expect(report.metadata).toBeDefined();
        expect(typeof report.metadata).toBe('object');
      }
    },
    {
      name: 'handles minimal systemMap gracefully',
      fn: async () => {
        const minimalSystemMap = SystemMapBuilder.create().build();
        
        const report = await generateAnalysisReport(minimalSystemMap);
        
        expect(report).toBeDefined();
        expect(report).toHaveProperty('metadata');
      }
    }
  ]
});
