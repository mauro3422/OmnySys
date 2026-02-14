/**
 * Layer A Analysis Contract Tests
 * 
 * Verifica que TODOS los sistemas de análisis (Tier 1-3) 
 * cumplen con el mismo contrato de interface.
 */

import { describe, it, expect } from 'vitest';

// Import all Tier 1 analyses
import { 
  findHotspots, 
  findOrphanFiles, 
  findUnusedExports,
  findCircularFunctionDeps 
} from '#layer-a/analyses/tier1/index.js';

// Import all Tier 2 analyses
import { 
  findCircularImports,
  analyzeCoupling,
  analyzeReachability 
} from '#layer-a/analyses/tier2/index.js';

// Mock external dependencies
import { vi } from 'vitest';

vi.mock('#layer-c/verification/utils/path-utils.js', () => ({
  classifyFile: (path) => ({ type: 'source' })
}));

vi.mock('#layer-a/analyses/helpers.js', () => ({
  isLikelyEntryPoint: () => false,
  isPublicAPI: () => false
}));

vi.mock('#utils/logger.js', () => ({
  createLogger: () => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn()
  })
}));

/**
 * Analyses under test with their required parameters
 */
const ANALYSES = [
  {
    name: 'Hotspots',
    tier: 1,
    fn: findHotspots,
    input: { function_links: [], files: {}, functions: {} },
    requiredFields: ['total', 'functions', 'criticalCount']
  },
  {
    name: 'Orphan Files',
    tier: 1,
    fn: findOrphanFiles,
    input: { files: {}, functions: {}, exportIndex: {} },
    requiredFields: ['total', 'files', 'deadCodeCount']
  },
  {
    name: 'Unused Exports',
    tier: 1,
    fn: findUnusedExports,
    input: { files: {}, functions: {}, function_links: [], exportIndex: {} },
    requiredFields: ['totalUnused', 'byFile', 'impact']
  },
  {
    name: 'Circular Function Dependencies',
    tier: 1,
    fn: findCircularFunctionDeps,
    input: { function_links: [] },
    requiredFields: ['total', 'cycles'],
    optionalParams: [{}] // atomsIndex
  },
  {
    name: 'Circular Imports',
    tier: 2,
    fn: findCircularImports,
    input: { metadata: { cyclesDetected: [] }, files: {} },
    requiredFields: ['total', 'cycles', 'classifications', 'problematicCount', 'validCount'],
    optionalParams: [{}] // atomsIndex
  },
  {
    name: 'Coupling Analysis',
    tier: 2,
    fn: analyzeCoupling,
    input: { files: {} },
    requiredFields: []
  }
];

/**
 * Structure Contract - All analyses must return consistent structure
 */
describe.each(ANALYSES)('Tier $tier - $name: Structure Contract', ({ fn, input, requiredFields }) => {
  it('MUST return an object', async () => {
    const result = await fn(input);
    expect(result).toBeTypeOf('object');
  });

  it('MUST NOT throw on valid input', () => {
    expect(() => fn(input)).not.toThrow();
  });

  if (requiredFields.length > 0) {
    it(`MUST have required fields: ${requiredFields.join(', ')}`, async () => {
      const result = await fn(input);
      for (const field of requiredFields) {
        expect(result).toHaveProperty(field);
      }
    });
  }
});

/**
 * Error Handling Contract - All analyses must handle errors gracefully
 */
describe.each(ANALYSES)('Tier $tier - $name: Error Handling Contract', ({ fn, optionalParams = [] }) => {
  it('MUST NOT throw on null/undefined input', () => {
    expect(() => fn(null)).not.toThrow();
    expect(() => fn(undefined)).not.toThrow();
  });

  it('MUST NOT throw on empty object input', () => {
    expect(() => fn({})).not.toThrow();
  });

  it('MUST return valid object even with missing nested properties', () => {
    const result = fn({ files: null, functions: null });
    expect(result).toBeTypeOf('object');
  });
});

/**
 * Cross-Tier Consistency Contract
 */
describe('Cross-Tier Analysis Consistency', () => {
  it('all Tier 1 analyses should be importable', () => {
    expect(findHotspots).toBeTypeOf('function');
    expect(findOrphanFiles).toBeTypeOf('function');
    expect(findUnusedExports).toBeTypeOf('function');
    expect(findCircularFunctionDeps).toBeTypeOf('function');
  });

  it('all Tier 2 analyses should be importable', () => {
    expect(findCircularImports).toBeTypeOf('function');
    expect(analyzeCoupling).toBeTypeOf('function');
    expect(analyzeReachability).toBeTypeOf('function');
  });

  it('analyses should accept atomsIndex as optional second parameter', async () => {
    // These analyses should work with or without atomsIndex
    const systemMap1 = { function_links: [] };
    const systemMap2 = { metadata: { cyclesDetected: [] }, files: {} };
    
    const result1 = await findCircularFunctionDeps(systemMap1);
    const result2 = await findCircularFunctionDeps(systemMap1, {});
    
    expect(result1).toBeDefined();
    expect(result2).toBeDefined();
  });
});

/**
 * Metric Consistency Contract
 */
describe('Analysis Output Metrics Consistency', () => {
  it('should use consistent naming for count fields', async () => {
    const hotspotResult = await findHotspots({ function_links: [] });
    const orphanResult = await findOrphanFiles({ files: {}, functions: {} });
    
    // Both should have a 'total' field
    expect(hotspotResult).toHaveProperty('total');
    expect(orphanResult).toHaveProperty('total');
  });

  it('should return arrays for collection fields', async () => {
    const hotspotResult = await findHotspots({ function_links: [] });
    const orphanResult = await findOrphanFiles({ files: {}, functions: {} });
    
    expect(Array.isArray(hotspotResult.functions)).toBe(true);
    expect(Array.isArray(orphanResult.files)).toBe(true);
  });
});

/**
 * Performance Contract - Analyses should be fast
 */
describe.each(ANALYSES)('Tier $tier - $name: Performance Contract', ({ fn, input }) => {
  it('should complete in under 100ms for small inputs', async () => {
    const start = performance.now();
    await fn(input);
    const end = performance.now();
    
    expect(end - start).toBeLessThan(100);
  });
});
