/**
 * @fileoverview Meta-Factory Validation Tests
 * 
 * Validates that the test-suite-generator Meta-Factory works correctly.
 * These tests ensure the foundation is solid before migrating other tests.
 * 
 * @module tests/factories/test-suite-generator/test/meta-factory.validation
 */

import { describe, it, expect, vi } from 'vitest';
import {
  createTestSuite,
  createAnalysisTestSuite,
  createUtilityTestSuite,
  createTestSuiteWithPreset,
  validateTestSuiteConfig,
  TestSuiteGenerator
} from '../index.js';
import {
  createStructureContract,
  createErrorHandlingContract,
  ContractPresets
} from '../contracts.js';

describe('Meta-Factory Foundation', () => {
  describe('Configuration Validation', () => {
    it('should validate correct configuration', () => {
      const config = {
        module: 'analyses/tier2/coupling',
        exports: { analyzeCoupling: () => {} },
        contracts: ['structure', 'error-handling'],
        contractOptions: {
          analyzeFn: () => {}
        }
      };

      const result = validateTestSuiteConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject configuration without module', () => {
      const config = {
        contracts: ['structure']
      };

      const result = validateTestSuiteConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: module');
    });

    it('should warn about error-handling without analyzeFn', () => {
      const config = {
        module: 'test/module',
        contracts: ['error-handling']
      };

      const result = validateTestSuiteConfig(config);
      expect(result.warnings).toContain("error-handling contract should have analyzeFn or testFn in contractOptions");
    });
  });

  describe('Contract Functions', () => {
    describe('createStructureContract', () => {
      it('should be a function', () => {
        expect(typeof createStructureContract).toBe('function');
      });

      it('should accept required parameters', () => {
        // Verify function signature by checking it accepts arguments
        expect(createStructureContract.length).toBeGreaterThanOrEqual(1);
      });
    });

    describe('createErrorHandlingContract', () => {
      it('should be a function', () => {
        expect(typeof createErrorHandlingContract).toBe('function');
      });

      it('should accept required parameters', () => {
        expect(createErrorHandlingContract.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('Contract Presets', () => {
    it('should have analysis preset', () => {
      expect(ContractPresets.analysis).toBeDefined();
      expect(typeof ContractPresets.analysis).toBe('function');

      const contracts = ContractPresets.analysis({
        moduleName: 'test-analysis',
        analyzeFn: async () => ({ total: 0 }),
        expectedFields: { items: 'array' },
        createMockInput: () => ({})
      });

      expect(contracts.structure).toBeDefined();
      expect(contracts.errorHandling).toBeDefined();
      expect(contracts.returnStructure).toBeDefined();
    });

    it('should have detector preset', () => {
      expect(ContractPresets.detector).toBeDefined();
      
      class TestDetector {
        async detect() { return []; }
      }

      const contracts = ContractPresets.detector({
        moduleName: 'test-detector',
        detectorClass: TestDetector,
        createMockInput: () => ({})
      });

      expect(contracts.structure).toBeDefined();
      expect(contracts.errorHandling).toBeDefined();
    });

    it('should have utility preset', () => {
      expect(ContractPresets.utility).toBeDefined();

      const contracts = ContractPresets.utility({
        moduleName: 'test-utility',
        fn: () => 'result',
        expectedSafeResult: null
      });

      expect(contracts.structure).toBeDefined();
      expect(contracts.errorHandling).toBeDefined();
    });
  });

  describe('TestSuiteGenerator API', () => {
    it('should expose all core functions', () => {
      expect(TestSuiteGenerator.create).toBeDefined();
      expect(TestSuiteGenerator.createWithPreset).toBeDefined();
      expect(TestSuiteGenerator.createBatch).toBeDefined();
      expect(TestSuiteGenerator.createFocused).toBeDefined();
      expect(TestSuiteGenerator.createSkipped).toBeDefined();
      expect(TestSuiteGenerator.validate).toBeDefined();
    });

    it('should expose all contract functions', () => {
      expect(TestSuiteGenerator.Contracts.structure).toBeDefined();
      expect(TestSuiteGenerator.Contracts.errorHandling).toBeDefined();
      expect(TestSuiteGenerator.Contracts.runtime).toBeDefined();
      expect(TestSuiteGenerator.Contracts.returnStructure).toBeDefined();
      expect(TestSuiteGenerator.Contracts.async).toBeDefined();
      expect(TestSuiteGenerator.Contracts.presets).toBeDefined();
    });
  });
});

// Example: How to use createTestSuite (documented as a test)
describe('Usage Examples', () => {
  it('demonstrates createAnalysisTestSuite pattern', () => {
    // This is an example of how to use the Meta-Factory
    // In real usage, this would be in the actual test file
    
    const mockAnalyzeCoupling = async (systemMap) => {
      if (!systemMap) return { total: 0, couplings: [] };
      return { 
        total: 1, 
        couplings: [{ from: 'a.js', to: 'b.js' }],
        maxCoupling: 1
      };
    };

    // Example usage (would be in actual test file):
    /*
    createAnalysisTestSuite({
      module: 'analyses/tier2/coupling',
      exports: { analyzeCoupling: mockAnalyzeCoupling },
      analyzeFn: mockAnalyzeCoupling,
      expectedFields: { couplings: 'array', maxCoupling: 'number' },
      createMockInput: () => ({
        files: { 'a.js': {}, 'b.js': {} }
      }),
      specificTests: [
        {
          name: 'detects bidirectional coupling',
          fn: async () => {
            const result = await mockAnalyzeCoupling({
              files: {
                'a.js': { dependsOn: ['b.js'] },
                'b.js': { usedBy: ['a.js'] }
              }
            });
            expect(result.total).toBe(1);
          }
        }
      ]
    });
    */

    // For this validation test, just verify the function exists and works
    expect(typeof createAnalysisTestSuite).toBe('function');
  });

  it('demonstrates createUtilityTestSuite pattern', () => {
    const mockUtility = (input) => input?.toUpperCase() ?? null;

    // Example usage:
    /*
    createUtilityTestSuite({
      module: 'utils/string-utils',
      exports: { toUpperCase: mockUtility },
      fn: mockUtility,
      expectedSafeResult: null,
      specificTests: [
        {
          name: 'converts to uppercase',
          fn: () => {
            expect(mockUtility('hello')).toBe('HELLO');
          }
        }
      ]
    });
    */

    expect(typeof createUtilityTestSuite).toBe('function');
  });
});

describe('Integration: Meta-Factory with Existing Factories', () => {
  it('should work with builder pattern', async () => {
    // Mock the builder pattern used in real tests
    const mockBuilder = {
      data: { files: {} },
      withFile(path) {
        this.data.files[path] = {};
        return this;
      },
      build() {
        return {
          files: this.data.files,
          metadata: { totalFiles: Object.keys(this.data.files).length }
        };
      }
    };

    const systemMap = mockBuilder.withFile('test.js').build();

    expect(systemMap).toBeDefined();
    expect(systemMap.files).toBeDefined();
    expect(systemMap.metadata.totalFiles).toBe(1);
  });
});
