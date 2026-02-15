/**
 * @fileoverview Tests for scanner.js - File Discovery (Meta-Factory Pattern)
 * 
 * Tests the scanProject and detectProjectInfo functions using standardized contracts.
 * 
 * @module tests/unit/layer-a-analysis/scanner
 */

import { createUtilityTestSuite } from '#test-factories/test-suite-generator';
import { scanProject, detectProjectInfo } from '#layer-a/scanner.js';

/**
 * Meta-Factory Test Suite for scanner.js
 * 
 * Automatically generates:
 * - Structure Contract (exports verification)
 * - Error Handling Contract (null/undefined handling)
 */
createUtilityTestSuite({
  module: 'scanner',
  exports: { scanProject, detectProjectInfo },
  fn: scanProject,
  expectedSafeResult: [],
  specificTests: [
    {
      name: 'exports both scanProject and detectProjectInfo',
      fn: () => {
        expect(typeof scanProject).toBe('function');
        expect(typeof detectProjectInfo).toBe('function');
      }
    },
    {
      name: 'scanProject returns array of file paths',
      fn: async () => {
        // Note: This test requires actual file system
        // In real tests with proper setup, mock fs and fast-glob
        const result = await scanProject('.', { returnAbsolute: false });
        expect(Array.isArray(result)).toBe(true);
      }
    },
    {
      name: 'detectProjectInfo returns project metadata',
      fn: async () => {
        const result = await detectProjectInfo('.');
        expect(result).toBeTypeOf('object');
        expect(result).toHaveProperty('hasPackageJson');
        expect(result).toHaveProperty('hasTsConfig');
        expect(result).toHaveProperty('hasJsConfig');
        expect(result).toHaveProperty('useTypeScript');
      }
    }
  ]
});
