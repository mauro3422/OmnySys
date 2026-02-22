/**
 * @fileoverview Function Analysis
 * 
 * Analiza funciones para generación de tests.
 * 
 * @module mcp/tools/generate-tests/analyze-for-tests/function-analysis
 */

import { createLogger } from '../../../../../utils/logger.js';
import { getAtomDetails } from '#layer-c/query/queries/file-query/index.js';
import { analyzeFunctionForTests } from '../test-analyzer.js';
import { validate_imports } from '../../validate-imports.js';

const logger = createLogger('OmnySys:analyze-for-tests:function');

/**
 * Analiza una funcion especifica
 */
export async function analyzeFunction(filePath, functionName, projectPath, cache, context, validateImports) {
  const atom = await getAtomDetails(projectPath, filePath, functionName, cache);
  
  if (!atom) {
    return {
      error: 'ATOM_NOT_FOUND',
      message: `Function ${functionName} not found in ${filePath}`
    };
  }
  
  const suggestedTests = await analyzeFunctionForTests(atom, projectPath);
  
  let importValidation = null;
  if (validateImports) {
    importValidation = await validate_imports(
      { filePath, checkFileExistence: true, checkBroken: true },
      context
    );
  }
  
  return {
    success: true,
    file: filePath,
    target: {
      name: functionName,
      type: 'function'
    },
    analysis: {
      canGenerate: true,
      estimatedTestCount: suggestedTests.length,
      complexity: atom.complexity,
      archetype: atom.archetype?.type,
      isAsync: atom.isAsync,
      hasSideEffects: atom.hasSideEffects,
      hasErrorHandling: atom.quality?.hasErrorHandling,
      inputCount: atom.dataFlow?.inputs?.length || 0,
      outputCount: atom.dataFlow?.outputs?.length || 0,
      throwCount: atom.errorFlow?.throws?.length || 0,
      testTypesAvailable: [
        'happy-path',
        ...(atom.errorFlow?.throws?.length > 0 ? ['error-throw'] : []),
        'edge-case',
        ...(atom.hasSideEffects ? ['side-effects'] : [])
      ]
    },
    suggestedTests: suggestedTests.slice(0, 10).map((t, i) => ({
      id: i + 1,
      name: t.name,
      type: t.type,
      priority: t.priority
    })),
    nextSteps: {
      toGenerateCode: `generate_tests({ filePath: "${filePath}", functionName: "${functionName}", options: { action: "generate" } })`,
      toSeeAllTests: `generate_tests({ filePath: "${filePath}", functionName: "${functionName}", options: { action: "generate" } }) // Returns ${suggestedTests.length} tests`
    },
    warnings: importValidation?.files?.length > 0 
      ? ['Source file has import issues'] 
      : []
  };
}
