/**
 * @fileoverview Analyze for Tests
 * 
 * Analiza archivos para detectar funciones/clases testeables.
 * 
 * @module mcp/tools/generate-tests/analyze-for-tests
 */

import { createLogger } from '../../../../utils/logger.js';
import { get_impact_map } from '../impact-map.js';
import { extractClassMethods, isBuilderPattern, analyzeClassForTests } from './class-analyzer.js';
import { getAtomDetails } from '#layer-c/query/queries/file-query/index.js';
import { analyzeFunctionForTests } from './test-analyzer.js';
import { analyzeExistingTests, findTestFile } from './test-analyzer-existing.js';
import { validate_imports } from '../validate-imports.js';

const logger = createLogger('OmnySys:analyze-for-tests');

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

/**
 * Analiza una clase especifica
 */
export async function analyzeClass(filePath, className, sourceCode, projectPath, context, validateImports) {
  // Obtener impact map para validar métodos reales
  let impactMap = null;
  try {
    impactMap = await get_impact_map({ filePath }, context);
  } catch (e) {
    logger.warn(`Could not get impact map for ${filePath}: ${e.message}`);
  }
  
  const { methods, staticMethods } = extractClassMethods(sourceCode, className);
  
  // Filtrar métodos válidos usando impact map
  const validMethods = impactMap 
    ? methods.filter(m => impactMap.definitions?.some(d => d.name === `${className}.${m.name}`))
    : methods;
  
  const classInfo = {
    name: className,
    file: filePath,
    methods: validMethods,
    staticMethods,
    isBuilder: isBuilderPattern({ methods: validMethods })
  };
  
  const suggestedTests = await analyzeClassForTests(classInfo, projectPath);
  
  // Calcular estimaciones realistas
  const constructorTests = 1;
  const builderMethodTests = Math.min(validMethods.filter(m => m.name.startsWith('with')).length, 10);
  const buildTests = validMethods.some(m => m.name === 'build') ? 2 : 0;
  const staticTests = Math.min(staticMethods.length, 5);
  const chainingTests = builderMethodTests > 0 ? 1 : 0;
  const immutabilityTests = buildTests > 0 ? 2 : 0;
  
  const estimatedTotal = constructorTests + builderMethodTests + buildTests + staticTests + chainingTests + immutabilityTests;
  
  // Buscar y analizar tests existentes
  const testFilePath = findTestFile(filePath);
  let existingTestsAnalysis = null;
  try {
    existingTestsAnalysis = await analyzeExistingTests(
      filePath, 
      testFilePath, 
      projectPath, 
      suggestedTests
    );
  } catch (e) {
    logger.warn(`Could not analyze existing tests: ${e.message}`);
  }
  
  let importValidation = null;
  if (validateImports) {
    importValidation = await validate_imports(
      { filePath, checkFileExistence: true, checkBroken: true },
      context
    );
  }
  
  const result = {
    success: true,
    file: filePath,
    target: {
      name: className,
      type: 'class',
      detectedPattern: classInfo.isBuilder ? 'builder' : 'standard'
    },
    analysis: {
      canGenerate: true,
      estimatedTestCount: estimatedTotal,
      detectedPattern: classInfo.isBuilder ? 'builder' : 'standard',
      methodCount: methods.length,
      staticMethodCount: staticMethods.length,
      builderMethods: methods.filter(m => m.name.startsWith('with')).length,
      hasBuildMethod: methods.some(m => m.name === 'build'),
      testTypesAvailable: [
        'constructor',
        ...(classInfo.isBuilder ? ['builder-methods', 'chaining', 'immutability'] : []),
        ...(staticMethods.length > 0 ? ['static-factory'] : [])
      ]
    },
    suggestedTests: suggestedTests.slice(0, 10).map((t, i) => ({
      id: i + 1,
      name: t.name,
      type: t.type,
      priority: t.priority,
      method: t.method
    })),
    nextSteps: {
      toGenerateCode: `generate_tests({ filePath: "${filePath}", className: "${className}", options: { action: "generate" } })`,
      toSeeAllTests: `generate_tests({ filePath: "${filePath}", className: "${className}", options: { action: "generate" } }) // Returns ${estimatedTotal} tests`
    },
    warnings: importValidation?.files?.length > 0 
      ? ['Source file has import issues'] 
      : []
  };
  
  // Agregar análisis de tests existentes si está disponible
  if (existingTestsAnalysis?.success) {
    result.existingTests = {
      testFile: existingTestsAnalysis.testFile,
      analysis: existingTestsAnalysis.analysis,
      recommendations: existingTestsAnalysis.recommendations,
      recommendedAction: existingTestsAnalysis.action
    };
    
    // Agregar warning si hay acción recomendada importante
    if (existingTestsAnalysis.action === 'REGENERATE') {
      result.warnings.unshift(`⚠️ RECOMMENDED: ${existingTestsAnalysis.recommendations[0].reason}. ${existingTestsAnalysis.recommendations[0].details}`);
    }
  }
  
  return result;
}

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

export default {
  analyzeForTests,
  analyzeClass,
  analyzeFunction
};