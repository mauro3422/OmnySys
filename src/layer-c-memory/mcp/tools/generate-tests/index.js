/**
 * @fileoverview generate-tests Tool
 * 
 * MCP Tool: generate_tests
 * Analiza funciones/clases y sugiere tests. 
 * Modo analisis por defecto. Usar action: "generate" para ver codigo.
 * 
 * @module mcp/tools/generate-tests
 */

import { createLogger } from '../../../../utils/logger.js';
import { analyzeForTests, analyzeClass, analyzeFunction } from './analyze-for-tests.js';
import { generateClassTests } from './generate-class-tests.js';
import { generateFunctionTests } from './generate-function-tests.js';

const logger = createLogger('OmnySys:generate-tests');

/**
 * Tool: generate_tests
 * Analiza funciones/clases y sugiere tests. 
 * Modo analisis por defecto. Usar action: "generate" para ver codigo.
 */
export async function generate_tests(args, context) {
  const { filePath, functionName, className, options = {} } = args;
  const { projectPath, cache } = context;
  const { action = "analyze", validateImports = true } = options;
  
  // Determinar target
  const targetName = functionName || className;
  const targetType = className ? "class" : (functionName ? "function" : "auto");
  
  logger.info(`[Tool] generate_tests("${filePath}::${targetName}" mode: ${action})`);
  
  if (!filePath) {
    return {
      error: 'Missing required parameter: filePath',
      example: 'generate_tests({ filePath: "src/utils/math.js", functionName: "add" })'
    };
  }
  
  try {
    // MODO ANALISIS (default)
    if (action === "analyze") {
      return await analyzeForTests(filePath, targetName, targetType, projectPath, cache, context, validateImports);
    }
    
    // MODO GENERACION
    if (action === "generate") {
      if (className) {
        return await generateClassTests(filePath, className, options, projectPath, context);
      } else if (functionName) {
        return await generateFunctionTests(filePath, functionName, options, projectPath, cache, context);
      } else {
        return {
          error: 'Must specify functionName or className for generation',
          suggestion: 'Use analyze mode first to see available targets'
        };
      }
    }
    
    return {
      error: `Unknown action: ${action}`,
      validActions: ["analyze", "generate"]
    };
    
  } catch (error) {
    logger.error(`[Tool] generate_tests failed: ${error.message}`);
    return {
      error: error.message,
      file: filePath,
      target: targetName
    };
  }
}

export default { generate_tests };

export { generate_batch_tests } from './batch-generator.js';
