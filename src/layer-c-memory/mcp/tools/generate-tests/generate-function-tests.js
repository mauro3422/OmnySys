/**
 * @fileoverview Generate Function Tests
 * 
 * Genera tests para funciones.
 * 
 * @module mcp/tools/generate-tests/generate-function-tests
 */

import { createLogger } from '../../../../utils/logger.js';
import { getAtomDetails } from '#layer-c/query/queries/file-query/index.js';
import { analyzeFunctionForTests } from './test-analyzer.js';
import { generateTestCode } from './code-generator.js';

const logger = createLogger('OmnySys:generate-function-tests');

/**
 * Genera tests para una funcion
 */
export async function generateFunctionTests(filePath, functionName, options, projectPath, cache, context) {
  logger.info(`[GenerateFunctionTests] Generating tests for ${functionName}`);
  
  const atom = await getAtomDetails(projectPath, filePath, functionName, cache);
  
  if (!atom) {
    return {
      error: 'ATOM_NOT_FOUND',
      message: `Function ${functionName} not found in ${filePath}`
    };
  }
  
  const suggestedTests = await analyzeFunctionForTests(atom, projectPath);
  const testCode = generateTestCode(atom, suggestedTests, options);
  
  return {
    success: true,
    file: filePath,
    target: {
      name: functionName,
      type: 'function'
    },
    mode: 'generate',
    generatedCode: testCode,
    testCount: suggestedTests.length,
    note: 'This is the generated test code. Review before applying.'
  };
}

export default {
  generateFunctionTests
};
