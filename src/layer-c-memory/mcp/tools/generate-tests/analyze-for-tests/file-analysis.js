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

/**
 * Analiza archivo para detectar funciones/clases testeables
 */
export async function analyzeForTests(filePath, targetName, targetType, projectPath, cache, context, validateImports) {
  logger.info(`[AnalyzeForTests] Analyzing: ${filePath}`);
  
  // Leer archivo para detectar clases y funciones
  const fs = await import('fs/promises');
  const path = await import('path');
  const fullPath = projectPath ? path.join(projectPath, filePath) : filePath;
  const sourceCode = await fs.readFile(fullPath, 'utf-8');
  
  // Detectar clases
  const classMatches = [...sourceCode.matchAll(/export\s+class\s+(\w+)/g)];
  const classes = classMatches.map(m => ({
    name: m[1],
    type: 'class',
    line: sourceCode.substring(0, m.index).split('\n').length
  }));
  
  // Detectar funciones exportadas
  const functionMatches = [...sourceCode.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)];
  const functions = functionMatches.map(m => ({
    name: m[1],
    type: 'function',
    line: sourceCode.substring(0, m.index).split('\n').length
  }));
  
  // Si hay target especifico, analizar solo ese
  if (targetName) {
    const targetClass = classes.find(c => c.name === targetName);
    if (targetClass) {
      return await analyzeClass(filePath, targetName, sourceCode, projectPath, context, validateImports);
    }
    
    const targetFunction = functions.find(f => f.name === targetName);
    if (targetFunction) {
      return await analyzeFunction(filePath, targetName, projectPath, cache, context, validateImports);
    }
    
    return {
      error: 'TARGET_NOT_FOUND',
      message: `${targetName} not found in ${filePath}`,
      availableClasses: classes.map(c => c.name),
      availableFunctions: functions.map(f => f.name)
    };
  }
  
  // Analisis completo del archivo
  const analysis = {
    success: true,
    file: filePath,
    mode: 'analysis',
    summary: {
      totalClasses: classes.length,
      totalFunctions: functions.length,
      totalTargets: classes.length + functions.length
    },
    classes: await Promise.all(classes.map(async c => {
      const classAnalysis = await analyzeClass(filePath, c.name, sourceCode, projectPath, context, false);
      return {
        name: c.name,
        line: c.line,
        canGenerateTests: classAnalysis.analysis?.canGenerate || false,
        estimatedTests: classAnalysis.analysis?.estimatedTestCount || 0,
        detectedPattern: classAnalysis.analysis?.detectedPattern || 'standard'
      };
    })),
    functions: functions.map(f => ({
      name: f.name,
      line: f.line,
      canGenerateTests: true,
      estimatedTests: 'unknown - use analyze mode with functionName'
    })),
    recommendation: classes.length > 0 
      ? `Found ${classes.length} classes and ${functions.length} functions. Use targetName to analyze specific target.`
      : `Found ${functions.length} functions. Use functionName to analyze specific target.`
  };
  
  return analysis;
}
