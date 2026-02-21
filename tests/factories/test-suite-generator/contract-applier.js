/**
 * @fileoverview contract-applier.js
 * 
 * Aplica contratos de testing a los suites de pruebas.
 * 
 * @module tests/factories/test-suite-generator/contract-applier
 */

import {
  createStructureContract,
  createErrorHandlingContract,
  createRuntimeContract,
  createReturnStructureContract,
  createAsyncContract
} from './contracts.js';

/**
 * Applies a single contract to the test suite
 * 
 * @private
 * @param {string} contractName - Name of the contract to apply
 * @param {string} modulePath - Path to the module
 * @param {Object} exports - Module exports
 * @param {Object} options - Contract options
 */
export function applyContract(contractName, modulePath, exports, options) {
  const moduleName = modulePath.split('/').pop();

  switch (contractName) {
    case 'structure':
      createStructureContract({
        moduleName,
        exports,
        exportNames: options.exportNames || [moduleName]
      });
      break;

    case 'error-handling':
      if (!options.analyzeFn && !options.testFn) {
        console.warn(`[TestSuiteGenerator] error-handling contract requires 'analyzeFn' or 'testFn' for ${modulePath}`);
        break;
      }
      createErrorHandlingContract({
        moduleName,
        testFn: options.analyzeFn || options.testFn,
        options: {
          async: options.async !== false,
          expectedSafeResult: options.expectedSafeResult ?? { total: 0 }
        }
      });
      break;

    case 'runtime':
      createRuntimeContract({
        modulePath: `${modulePath}.js`,
        expectedError: options.expectedRuntimeError
      });
      break;

    case 'return-structure':
      if (!options.analyzeFn && !options.testFn) {
        console.warn(`[TestSuiteGenerator] return-structure contract requires 'analyzeFn' or 'testFn' for ${modulePath}`);
        break;
      }
      createReturnStructureContract({
        moduleName,
        testFn: options.analyzeFn || options.testFn,
        expectedStructure: options.expectedFields || { total: 'number' },
        createValidInput: options.createMockInput
      });
      break;

    case 'async':
      if (!options.analyzeFn && !options.testFn && !options.asyncFn) {
        console.warn(`[TestSuiteGenerator] async contract requires 'analyzeFn', 'testFn', or 'asyncFn' for ${modulePath}`);
        break;
      }
      createAsyncContract({
        moduleName,
        asyncFn: options.asyncFn || options.analyzeFn || options.testFn
      });
      break;

    default:
      console.warn(`[TestSuiteGenerator] Unknown contract: ${contractName}`);
  }
}
