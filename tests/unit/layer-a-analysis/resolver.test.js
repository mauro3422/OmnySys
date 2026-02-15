/**
 * @fileoverview Tests for resolver.js - Dependency Resolution (Meta-Factory Pattern)
 * 
 * Tests the resolveImport, resolveImports, and getResolutionConfig functions.
 * 
 * @module tests/unit/layer-a-analysis/resolver
 */

import { createUtilityTestSuite } from '#test-factories/test-suite-generator';
import { resolveImport, resolveImports, getResolutionConfig } from '#layer-a/resolver.js';

/**
 * Meta-Factory Test Suite for resolver.js
 * 
 * Automatically generates:
 * - Structure Contract (exports verification)
 * - Error Handling Contract (null/undefined handling)
 */
createUtilityTestSuite({
  module: 'resolver',
  exports: { resolveImport, resolveImports, getResolutionConfig },
  fn: resolveImport,
  expectedSafeResult: null,
  specificTests: [
    {
      name: 'exports all three functions',
      fn: () => {
        expect(typeof resolveImport).toBe('function');
        expect(typeof resolveImports).toBe('function');
        expect(typeof getResolutionConfig).toBe('function');
      }
    },
    {
      name: 'resolveImport resolves external modules',
      fn: async () => {
        const result = await resolveImport('react', 'src/index.js', '/project');
        
        expect(result).toBeTypeOf('object');
        expect(result).toHaveProperty('type');
        expect(result).toHaveProperty('resolved');
        expect(result).toHaveProperty('reason');
        expect(result.type).toBe('external');
      }
    },
    {
      name: 'resolveImports handles multiple imports',
      fn: async () => {
        const imports = ['./utils', 'react'];
        const results = await resolveImports(imports, 'src/index.js', '/project');
        
        expect(Array.isArray(results)).toBe(true);
        expect(results).toHaveLength(2);
        expect(results[0]).toHaveProperty('type');
        expect(results[1]).toHaveProperty('type');
      }
    },
    {
      name: 'getResolutionConfig returns config object',
      fn: async () => {
        const config = await getResolutionConfig('/project');
        
        expect(config).toBeTypeOf('object');
        expect(config).toHaveProperty('projectRoot');
        expect(config).toHaveProperty('supportedExtensions');
        expect(config).toHaveProperty('aliases');
      }
    }
  ]
});
