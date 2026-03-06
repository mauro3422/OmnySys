/**
 * @fileoverview File Analysis
 *
 * Analiza archivos para detectar funciones/clases testeables.
 *
 * @module mcp/tools/generate-tests/analyze-for-tests/file-analysis
 */

import { createLogger } from '../../../../../utils/logger.js';
import { analyzeClass } from './class-analysis.js';
import { analyzeFunction } from './function-analysis.js';

const logger = createLogger('OmnySys:analyze-for-tests:file');

function collectExportedClasses(sourceCode) {
  const classMatches = [...sourceCode.matchAll(/export\s+class\s+(\w+)/g)];
  return classMatches.map((match) => ({
    name: match[1],
    type: 'class',
    line: sourceCode.substring(0, match.index).split('\n').length
  }));
}

function collectExportedFunctions(sourceCode) {
  const functionMatches = [...sourceCode.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)];
  return functionMatches.map((match) => ({
    name: match[1],
    type: 'function',
    line: sourceCode.substring(0, match.index).split('\n').length
  }));
}

async function readSourceCode(filePath, projectPath) {
  const fs = await import('fs/promises');
  const path = await import('path');
  const fullPath = projectPath ? path.join(projectPath, filePath) : filePath;
  return fs.readFile(fullPath, 'utf-8');
}

/**
 * Analiza archivo para detectar funciones/clases testeables
 */
export async function analyzeForTests(filePath, targetName, targetType, projectPath, cache, context, validateImports) {
  logger.info(`[AnalyzeForTests] Analyzing: ${filePath}`);

  try {
    const sourceCode = await readSourceCode(filePath, projectPath);
    const classes = collectExportedClasses(sourceCode);
    const functions = collectExportedFunctions(sourceCode);

    if (targetName) {
      const targetClass = classes.find((item) => item.name === targetName);
      if (targetClass) {
        return await analyzeClass(filePath, targetName, sourceCode, projectPath, context, validateImports);
      }

      const targetFunction = functions.find((item) => item.name === targetName);
      if (targetFunction) {
        return await analyzeFunction(filePath, targetName, projectPath, cache, context, validateImports);
      }

      return {
        error: 'TARGET_NOT_FOUND',
        message: `${targetName} not found in ${filePath}`,
        availableClasses: classes.map((item) => item.name),
        availableFunctions: functions.map((item) => item.name)
      };
    }

    return {
      success: true,
      file: filePath,
      mode: 'analysis',
      summary: {
        totalClasses: classes.length,
        totalFunctions: functions.length,
        totalTargets: classes.length + functions.length
      },
      classes: await Promise.all(classes.map(async (item) => {
        const classAnalysis = await analyzeClass(filePath, item.name, sourceCode, projectPath, context, false);
        return {
          name: item.name,
          line: item.line,
          canGenerateTests: classAnalysis.analysis?.canGenerate || false,
          estimatedTests: classAnalysis.analysis?.estimatedTestCount || 0,
          detectedPattern: classAnalysis.analysis?.detectedPattern || 'standard'
        };
      })),
      functions: functions.map((item) => ({
        name: item.name,
        line: item.line,
        canGenerateTests: true,
        estimatedTests: 'unknown - use analyze mode with functionName'
      })),
      recommendation: classes.length > 0
        ? `Found ${classes.length} classes and ${functions.length} functions. Use targetName to analyze specific target.`
        : `Found ${functions.length} functions. Use functionName to analyze specific target.`
    };
  } catch (error) {
    logger.error(`[AnalyzeForTests] Failed for ${filePath}: ${error.message}`);
    return {
      error: 'FILE_ANALYSIS_FAILED',
      message: error.message,
      file: filePath
    };
  }
}
