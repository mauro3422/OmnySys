/**
 * @fileoverview Test Comparator
 * 
 * Compara tests existentes con tests generados.
 * 
 * @module mcp/tools/generate-tests/test-comparator
 */

import { createLogger } from '../../../../utils/logger.js';
import { normalizeTestName } from './test-parser.js';

const logger = createLogger('OmnySys:test-comparator');

/**
 * Compara tests existentes con generados
 */
export function compareTests(existingTests, generatedTests) {
  logger.debug('[TestComparator] Comparing tests');
  
  const comparison = {
    matching: [],
    obsolete: [],
    missing: [],
    duplicates: []
  };
  
  const existingNames = new Map();
  const generatedNames = new Map();
  
  // Indexar tests existentes
  existingTests.forEach((test, index) => {
    const normalized = normalizeTestName(test.name);
    if (existingNames.has(normalized)) {
      comparison.duplicates.push({
        name: test.name,
        firstIndex: existingNames.get(normalized),
        duplicateIndex: index
      });
    } else {
      existingNames.set(normalized, index);
    }
  });
  
  // Indexar tests generados
  generatedTests.forEach((test, index) => {
    const normalized = normalizeTestName(test.name);
    generatedNames.set(normalized, index);
  });
  
  // Encontrar matches y obsoletos
  existingNames.forEach((index, normalizedName) => {
    if (generatedNames.has(normalizedName)) {
      comparison.matching.push({
        name: existingTests[index].name,
        existingIndex: index,
        generatedIndex: generatedNames.get(normalizedName)
      });
    } else {
      comparison.obsolete.push({
        name: existingTests[index].name,
        index: index,
        reason: 'No matching generated test - code may have changed'
      });
    }
  });
  
  // Encontrar tests faltantes
  generatedNames.forEach((index, normalizedName) => {
    if (!existingNames.has(normalizedName)) {
      comparison.missing.push({
        name: generatedTests[index].name,
        index: index,
        type: generatedTests[index].type
      });
    }
  });
  
  return comparison;
}

/**
 * Calcula estadísticas de comparación
 */
export function calculateComparisonStats(comparison, existingTests, generatedTests) {
  return {
    existingTestCount: existingTests.length,
    generatedTestCount: generatedTests.length,
    matchingTests: comparison.matching.length,
    obsoleteTests: comparison.obsolete.length,
    missingTests: comparison.missing.length,
    duplicateTests: comparison.duplicates.length,
    coverage: existingTests.length > 0 
      ? Math.round((comparison.matching.length / existingTests.length) * 100)
      : 0
  };
}

export default {
  compareTests,
  calculateComparisonStats
};
