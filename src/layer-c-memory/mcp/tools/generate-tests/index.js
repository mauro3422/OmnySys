/**
 * @fileoverview generate-tests Tool
 * 
 * MCP Tool: generate_tests
 * Genera tests automaticamente basado en el analisis de la funcion.
 * Usa el grafo de conocimiento del sistema para crear tests relevantes
 * usando metadata rica: dataFlow, errorFlow, archetype, asyncAnalysis, etc.
 * 
 * @module mcp/tools/generate-tests
 */

import { createLogger } from '../../../../utils/logger.js';
import { getAtomDetails } from '#layer-c/query/queries/file-query/index.js';
import { validate_imports } from '../validate-imports.js';
import { analyzeFunctionForTests } from './test-analyzer.js';
import { generateTestCode } from './code-generator.js';
import { calculateRiskScore, generateRecommendations, getTestPriority } from './recommendations.js';

const logger = createLogger('OmnySys:generate-tests');

/**
 * Tool: generate_tests
 * Genera tests automaticamente para una funcion
 */
export async function generate_tests(args, context) {
  const { filePath, functionName, options = {} } = args;
  const { projectPath, cache } = context;
  const { validateImports = true } = options;
  
  logger.info(`[Tool] generate_tests("${filePath}::${functionName}")`);
  
  if (!filePath || !functionName) {
    return {
      error: 'Missing required parameters: filePath, functionName',
      example: 'generate_tests({ filePath: "src/utils/math.js", functionName: "add" })'
    };
  }
  
  try {
    const atom = await getAtomDetails(projectPath, filePath, functionName, cache);
    
    if (!atom) {
      return {
        error: 'ATOM_NOT_FOUND',
        message: `Function ${functionName} not found in ${filePath}`,
        suggestion: 'Verify the function exists and is exported'
      };
    }
    
    const suggestedTests = await analyzeFunctionForTests(atom, projectPath);
    const testCode = generateTestCode(atom, suggestedTests, options);
    const recommendations = generateRecommendations(atom, suggestedTests);
    const riskScore = calculateRiskScore(atom);
    
    // Validar imports del archivo fuente
    let importValidation = null;
    if (validateImports) {
      importValidation = await validate_imports(
        { filePath, checkFileExistence: true, checkBroken: true },
        context
      );
    }
    
    const metrics = buildMetrics(atom, suggestedTests, riskScore);
    const functionInfo = buildFunctionInfo(atom);
    const testResults = buildTestResults(suggestedTests);
    
    const result = {
      success: true,
      function: functionInfo,
      suggestedTests: testResults,
      generatedCode: testCode,
      metrics,
      recommendations
    };
    
    // Agregar warnings de imports si hay problemas
    if (importValidation && importValidation.files?.length > 0) {
      result.importWarnings = importValidation.files.map(f => ({
        file: f.file,
        issues: f.issues?.slice(0, 3)
      }));
      result.recommendations.unshift('⚠️ Source file has import issues - fix before testing');
    }
    
    return result;
    
  } catch (error) {
    logger.error(`[Tool] generate_tests failed: ${error.message}`);
    return {
      error: error.message,
      file: filePath,
      function: functionName
    };
  }
}

/**
 * Construye el objeto de métricas
 */
function buildMetrics(atom, tests, riskScore) {
  return {
    complexity: atom.complexity,
    archetype: atom.archetype?.type,
    currentCoverage: atom.hasTests ? 'partial' : 'none',
    suggestedTestsCount: tests.length,
    inputCount: atom.dataFlow?.inputs?.length || 0,
    outputCount: atom.dataFlow?.outputs?.length || 0,
    throwCount: atom.errorFlow?.throws?.length || 0,
    asyncRisk: atom.asyncAnalysis?.flowAnalysis?.overallRisk || 'none',
    riskScore
  };
}

/**
 * Construye el objeto de información de la función
 */
function buildFunctionInfo(atom) {
  return {
    name: atom.name,
    file: atom.filePath,
    complexity: atom.complexity,
    archetype: atom.archetype?.type,
    isAsync: atom.isAsync,
    hasSideEffects: atom.hasSideEffects,
    hasErrorHandling: atom.quality?.hasErrorHandling,
    inputs: atom.dataFlow?.inputs?.map(i => ({ name: i.name, type: i.type })),
    outputs: atom.dataFlow?.outputs?.length || 0,
    throws: atom.errorFlow?.throws?.map(t => ({ type: t.type, condition: t.condition })),
    internalCalls: atom.callGraph?.callsList
      ?.filter(c => c.type !== 'native')
      .map(c => c.name)
  };
}

/**
 * Construye el array de tests sugeridos
 */
function buildTestResults(tests) {
  return tests.map((test, index) => ({
    id: index + 1,
    name: test.name,
    type: test.type,
    description: test.description,
    priority: test.priority || getTestPriority(test),
    inputs: test.inputs,
    assertion: test.assertion,
    throwInfo: test.throwInfo,
    internalCalls: test.internalCalls,
    asyncWarning: test.asyncWarning
  }));
}

export default { generate_tests };

export { generate_batch_tests } from './batch-generator.js';
