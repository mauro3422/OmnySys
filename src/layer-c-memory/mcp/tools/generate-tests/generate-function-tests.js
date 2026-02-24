/**
 * @fileoverview Generate Function Tests
 * 
 * Genera tests para funciones.
 * 
 * @module mcp/tools/generate-tests/generate-function-tests
 */

import fs from 'fs/promises';
import path from 'path';
import { createLogger } from '../../../../utils/logger.js';
import { getAtomDetails } from '#layer-c/query/queries/file-query/index.js';
import { analyzeFunctionForTests } from './test-analyzer.js';
import { generateTestCode } from './code-generator.js';

const logger = createLogger('OmnySys:generate-function-tests');

/**
 * Genera tests para una funcion
 */
export async function generateFunctionTests(filePath, functionName, options = {}, projectPath, cache, context) {
  const { write = false, outputPath = 'tests/generated' } = options;
  
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
  
  let wroteFile = null;
  
  if (write && testCode) {
    try {
      const testDir = path.join(projectPath, outputPath, filePath.replace('src/', '').replace('.js', ''));
      await fs.mkdir(testDir, { recursive: true });
      
      const testFileName = functionName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase() + '.test.js';
      const testFilePath = path.join(testDir, testFileName);
      
      await fs.writeFile(testFilePath, testCode, 'utf-8');
      wroteFile = testFilePath;
      
      logger.info(`[GenerateFunctionTests] Wrote test to ${testFilePath}`);
    } catch (writeError) {
      logger.error(`[GenerateFunctionTests] Failed to write test: ${writeError.message}`);
    }
  }
  
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
    wroteFile,
    note: write ? 'Test file written to disk.' : 'This is the generated test code. Review before applying.'
  };
}

export default {
  generateFunctionTests
};
