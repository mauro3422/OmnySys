/**
 * @fileoverview Smart Test Generator
 * 
 * Generador inteligente de tests que usa el grafo de conocimiento
 * del sistema para crear tests que siguen las convenciones del proyecto.
 * 
 * @module mcp/tools/generate-tests/smart-test-generator
 */

import { createLogger } from '../../../../utils/logger.js';
import { determineImportPath, suggestTestLocation } from './smart-test-generator/import-resolver.js';
import { filterValidMethods } from './smart-test-generator/method-filter.js';
import { generateTestFileHeader, generateDescribeBlock } from './smart-test-generator/header-generator.js';
import { generateConstructorTests } from './smart-test-generator/constructor-tests.js';
import { generateBuilderMethodsTests } from './smart-test-generator/builder-tests.js';
import { generateBuildMethodTests } from './smart-test-generator/build-tests.js';
import { generateChainingTests } from './smart-test-generator/chaining-tests.js';
import { generateImmutabilityTests } from './smart-test-generator/immutability-tests.js';
import { generateStaticFactoryTests } from './smart-test-generator/static-tests.js';
import { countTests, generateRecommendations } from './smart-test-generator/test-helpers.js';

const logger = createLogger('OmnySys:smart-test-generator');

/**
 * Genera código de test inteligente para una clase
 * @param {Object} classInfo - Class metadata
 * @param {string} filePath - Source file path
 * @param {string} projectPath - Project root path
 * @param {Object} impactMap - Impact map data
 * @param {Object} options - Generation options
 * @returns {Object} - Generated test info
 */
export async function generateSmartClassTests(classInfo, filePath, projectPath, impactMap, options = {}) {
  const { 
    includeChainingTests = true, 
    includeImmutabilityTests = true,
    maxTests = 50
  } = options;
  
  const className = classInfo.name;
  
  logger.info(`[SmartGenerator] Generating smart tests for ${className}`);
  
  const importInfo = determineImportPath(filePath, className, projectPath);
  const validMethods = filterValidMethods(classInfo.methods || [], className, impactMap);
  const validStaticMethods = filterValidMethods(classInfo.staticMethods || [], className, impactMap);
  const testLocation = suggestTestLocation(filePath, className, projectPath);
  
  const builderMethods = validMethods.filter(m => m.name.startsWith('with')).slice(0, 10);
  const hasBuildMethod = validMethods.some(m => m.name === 'build');
  
  let code = generateTestFileHeader(importInfo, className);
  
  code += generateDescribeBlock(className, () => {
    let testCode = '';
    
    testCode += generateConstructorTests(className);
    
    if (builderMethods.length > 0) {
      testCode += generateBuilderMethodsTests(builderMethods, className);
    }
    
    if (hasBuildMethod) {
      testCode += generateBuildMethodTests(className);
    }
    
    if (includeChainingTests && builderMethods.length > 0) {
      testCode += generateChainingTests(builderMethods.slice(0, 5), className);
    }
    
    if (includeImmutabilityTests && hasBuildMethod) {
      testCode += generateImmutabilityTests(className);
    }
    
    if (validStaticMethods.length > 0) {
      testCode += generateStaticFactoryTests(validStaticMethods.slice(0, 5), className);
    }
    
    return testCode;
  });
  
  return {
    code,
    testLocation,
    importInfo,
    metrics: {
      totalTests: countTests(code),
      constructorTests: 1,
      builderMethodTests: builderMethods.length,
      chainingTests: includeChainingTests && builderMethods.length > 0 ? 1 : 0,
      immutabilityTests: includeImmutabilityTests && hasBuildMethod ? 2 : 0,
      staticTests: Math.min(validStaticMethods.length, 5)
    },
    recommendations: generateRecommendations(validMethods, validStaticMethods, className)
  };
}

export default {
  generateSmartClassTests
};
