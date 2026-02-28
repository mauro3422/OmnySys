/**
 * @fileoverview Class Analysis
 * 
 * Analiza clases para generación de tests.
 * 
 * @module mcp/tools/generate-tests/analyze-for-tests/class-analysis
 */

import { createLogger } from '../../../../../utils/logger.js';
import { getFileDependents } from '../../../../query/apis/file-api.js';
import { extractClassMethods, isBuilderPattern, analyzeClassForTests } from '../class-analyzer.js';
import { analyzeExistingTests, findTestFile } from '../test-analyzer-existing.js';
import { validate_imports } from '../../validate-imports.js';

const logger = createLogger('OmnySys:analyze-for-tests:class');

/**
 * Analiza una clase especifica
 */
export async function analyzeClass(filePath, className, sourceCode, projectPath, context, validateImports) {
  // Obtener file dependents map para validar métodos reales y grado de uso
  let fileDependents = [];
  try {
    fileDependents = await getFileDependents(projectPath, filePath);
  } catch (e) {
    logger.warn(`Could not get dependents map for ${filePath}: ${e.message}`);
  }

  const { methods, staticMethods } = extractClassMethods(sourceCode, className);

  // Como impactMap analizaba definiciones dentro del archivo y usos, podemos basarnos en
  // si un método es público / documentado, o simplemente incluir todos mientras ajustamos AST.
  const validMethods = methods;

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
