/**
 * @fileoverview test-helpers.js
 * 
 * Helpers para tests y validación de configuración.
 * 
 * @module tests/factories/test-suite-generator/test-helpers
 */

/**
 * Utility function to run a test with automatic cleanup
 * 
 * @param {Function} testFn - Test function to run
 * @param {Function} cleanupFn - Cleanup function to run after test
 * @param {Object} context - Test context
 */
export async function runTestWithCleanup(testFn, cleanupFn, context = {}) {
  try {
    await testFn(context);
  } finally {
    await cleanupFn(context);
  }
}

/**
 * Validates that a test suite configuration is valid
 * 
 * @param {TestSuiteConfig} config - Configuration to validate
 * @returns {Object} Validation result
 */
export function validateTestSuiteConfig(config) {
  const errors = [];
  const warnings = [];

  if (!config.module) {
    errors.push('Missing required field: module');
  }

  if (config.contracts) {
    const validContracts = ['structure', 'error-handling', 'runtime', 'return-structure', 'async'];
    for (const contract of config.contracts) {
      if (!validContracts.includes(contract)) {
        errors.push(`Invalid contract: ${contract}. Valid: ${validContracts.join(', ')}`);
      }
    }

    if (config.contracts.includes('error-handling') && !config.contractOptions?.analyzeFn && !config.contractOptions?.testFn) {
      warnings.push('error-handling contract should have analyzeFn or testFn in contractOptions');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
