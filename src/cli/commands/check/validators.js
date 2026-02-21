/**
 * Input validation utilities for check command
 * @module src/cli/commands/check/validators
 */

/**
 * Validates input parameters
 * @param {string} filePath - File path to check
 * @param {boolean} silent - Silent mode flag
 * @returns {{valid: boolean, error?: string, exitCode?: number}} Validation result
 */
export function validateInputs(filePath, silent) {
  if (!filePath) {
    if (!silent) {
      console.error('\nError: No file specified!');
      console.error('\nUsage: omnysystem check <file-path>');
      console.error('   Example: omnysystem check src/api.js\n');
    }
    return { valid: false, error: 'No file specified', exitCode: 1 };
  }
  return { valid: true };
}
