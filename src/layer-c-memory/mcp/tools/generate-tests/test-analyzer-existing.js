/**
 * @fileoverview Test Analyzer for Existing Tests
 * 
 * Analiza tests existentes y compara con el código actual.
 * Este módulo orquesta los sub-módulos: test-parser, test-comparator, test-recommender
 * 
 * @module mcp/tools/generate-tests/test-analyzer-existing
 */

import { createLogger } from '../../../../utils/logger.js';
import { parseExistingTests } from './test-parser.js';
import { compareTests, calculateComparisonStats } from './test-comparator.js';
import { generateActionRecommendations, determineBestAction, findTestFile } from './test-recommender.js';
import fs from 'fs/promises';
import path from 'path';

const logger = createLogger('OmnySys:test-analyzer-existing');

/**
 * Analiza tests existentes y genera recomendaciones
 */
export async function analyzeExistingTests(sourceFilePath, testFilePath, projectPath, generatedTests) {
  logger.info(`[TestAnalyzer] Analyzing existing tests: ${testFilePath}`);
  
  try {
    // Leer archivo de test existente
    const testContent = await fs.readFile(
      path.join(projectPath, testFilePath), 
      'utf-8'
    );
    
    // Parsear tests existentes
    const existingTests = parseExistingTests(testContent);
    
    // Comparar con tests generados
    const comparison = compareTests(existingTests, generatedTests);
    
    // Generar recomendaciones
    const recommendations = generateActionRecommendations(
      comparison, 
      existingTests, 
      generatedTests,
      sourceFilePath
    );
    
    return {
      success: true,
      sourceFile: sourceFilePath,
      testFile: testFilePath,
      analysis: calculateComparisonStats(comparison, existingTests, generatedTests),
      comparison,
      recommendations,
      action: determineBestAction(recommendations)
    };
    
  } catch (error) {
    // Si no existe el archivo de test
    if (error.code === 'ENOENT') {
      return {
        success: true,
        sourceFile: sourceFilePath,
        testFile: testFilePath,
        analysis: {
          existingTestCount: 0,
          generatedTestCount: generatedTests.length,
          matchingTests: 0,
          obsoleteTests: 0,
          missingTests: generatedTests.length,
          duplicateTests: 0,
          coverage: 0
        },
        recommendations: [{
          action: 'CREATE',
          priority: 'high',
          reason: 'No existing test file found',
          details: `Create new test file at ${testFilePath}`
        }],
        action: 'CREATE'
      };
    }
    
    logger.error(`[TestAnalyzer] Failed: ${error.message}`);
    return {
      success: false,
      error: error.message,
      sourceFile: sourceFilePath,
      testFile: testFilePath
    };
  }
}

export { findTestFile };

export default {
  analyzeExistingTests,
  findTestFile
};
