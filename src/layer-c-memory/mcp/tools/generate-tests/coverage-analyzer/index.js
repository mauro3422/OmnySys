/**
 * @fileoverview Coverage Analyzer Index - Main Entry Point
 *
 * Analiza tests existentes y detecta:
 * - Qué funciones/clases están testeadas
 * - Qué casos faltan (happy path, errors, branches, etc.)
 * - Qué tests están obsoletos (el código cambió)
 * - Qué tests son duplicados
 *
 * @module mcp/tools/generate-tests/coverage-analyzer
 */

import { createLogger } from '../../../../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';
import { parseExistingTests } from './parsers/index.js';
import { detectTestedEntities, detectObsoleteTests, detectDuplicateTests } from './detectors/index.js';
import { analyzeEntityCoverage } from './analyzers/index.js';
import { generateRecommendations, compareWithGeneratedTests } from './reporters/index.js';

const logger = createLogger('OmnySys:test-coverage-analyzer');

/**
 * Analiza un archivo de test y detecta gaps de cobertura
 * @param {string} testFilePath - Ruta del archivo de test
 * @param {string} projectPath - Ruta del proyecto
 * @returns {Object} - Resultado del análisis
 */
export async function analyzeTestCoverage(testFilePath, projectPath) {
  logger.info(`[CoverageAnalyzer] Analyzing test file: ${testFilePath}`);

  try {
    // Leer archivo de test
    const fullPath = projectPath ? path.join(projectPath, testFilePath) : testFilePath;
    const testContent = await fs.readFile(fullPath, 'utf-8');

    // Parsear tests existentes
    const existingTests = parseExistingTests(testContent);

    // Detectar qué está siendo testeado
    const testedEntities = detectTestedEntities(testContent);

    // Para cada entidad testeada, analizar qué falta
    const coverageGaps = [];
    for (const entity of testedEntities) {
      const gaps = await analyzeEntityCoverage(entity, existingTests, projectPath);
      if (gaps.missingTests.length > 0) {
        coverageGaps.push(gaps);
      }
    }

    // Detectar tests obsoletos
    const obsoleteTests = detectObsoleteTests(existingTests, projectPath);

    // Detectar tests duplicados
    const duplicateTests = detectDuplicateTests(existingTests);

    return {
      success: true,
      testFile: testFilePath,
      summary: {
        totalTests: existingTests.length,
        testedEntities: testedEntities.length,
        coverageGaps: coverageGaps.length,
        obsoleteTests: obsoleteTests.length,
        duplicateTests: duplicateTests.length
      },
      entities: testedEntities,
      gaps: coverageGaps,
      obsolete: obsoleteTests,
      duplicates: duplicateTests,
      recommendations: generateRecommendations(coverageGaps, obsoleteTests, duplicateTests)
    };

  } catch (error) {
    logger.error(`[CoverageAnalyzer] Failed: ${error.message}`);
    return {
      success: false,
      error: error.message,
      testFile: testFilePath
    };
  }
}

export { compareWithGeneratedTests } from './reporters/index.js';

export default {
  analyzeTestCoverage,
  compareWithGeneratedTests
};
