/**
 * @fileoverview Test Recommender
 * 
 * Genera recomendaciones de acción para tests.
 * 
 * @module mcp/tools/generate-tests/test-recommender
 */

import { createLogger } from '../../../../utils/logger.js';
import { groupByType } from './test-parser.js';

const logger = createLogger('OmnySys:test-recommender');

/**
 * Genera recomendaciones de acción
 */
export function generateActionRecommendations(comparison, existingTests, generatedTests, sourceFile) {
  logger.debug('[TestRecommender] Generating recommendations');
  
  const recommendations = [];
  
  // 1. Si hay muchos tests obsoletos, recomendar regenerar todo
  const obsoleteRatio = comparison.obsolete.length / (existingTests.length || 1);
  if (obsoleteRatio > 0.5) {
    recommendations.push({
      action: 'REGENERATE',
      priority: 'high',
      reason: `${Math.round(obsoleteRatio * 100)}% of tests are obsolete`,
      details: `Delete existing tests and regenerate from scratch. ${comparison.obsolete.length} tests no longer match the code.`,
      obsoleteTests: comparison.obsolete.map(t => t.name)
    });
  }
  
  // 2. Si hay tests duplicados, recomendar limpiar
  if (comparison.duplicates.length > 0) {
    recommendations.push({
      action: 'CLEANUP',
      priority: 'medium',
      reason: `${comparison.duplicates.length} duplicate tests found`,
      details: 'Remove duplicate tests to improve maintainability',
      duplicates: comparison.duplicates
    });
  }
  
  // 3. Si faltan tests, recomendar agregar
  if (comparison.missing.length > 0) {
    const missingByType = groupByType(comparison.missing);
    recommendations.push({
      action: 'ADD',
      priority: 'high',
      reason: `${comparison.missing.length} tests are missing`,
      details: `Add missing tests: ${Object.entries(missingByType).map(([type, count]) => `${count} ${type}`).join(', ')}`,
      missingTests: comparison.missing.map(t => ({ name: t.name, type: t.type }))
    });
  }
  
  // 4. Si todo está bien, recomendar mantener
  if (recommendations.length === 0) {
    recommendations.push({
      action: 'KEEP',
      priority: 'low',
      reason: 'Tests are up to date',
      details: `All ${existingTests.length} tests match the generated pattern`
    });
  }
  
  // 5. Recomendar mover si la ubicación no es la correcta
  if (sourceFile.includes('tests/factories/') && !sourceFile.includes('tests/unit/')) {
    recommendations.push({
      action: 'MOVE',
      priority: 'medium',
      reason: 'Test location does not follow project conventions',
      details: 'Move tests from tests/factories/ to tests/unit/factories/',
      from: sourceFile,
      to: sourceFile.replace('tests/factories/', 'tests/unit/factories/')
    });
  }
  
  return recommendations;
}

/**
 * Determina la mejor acción basada en las recomendaciones
 */
export function determineBestAction(recommendations) {
  const priorityOrder = ['REGENERATE', 'CREATE', 'ADD', 'MOVE', 'CLEANUP', 'KEEP'];
  
  for (const action of priorityOrder) {
    const rec = recommendations.find(r => r.action === action);
    if (rec && rec.priority === 'high') {
      return action;
    }
  }
  
  for (const action of priorityOrder) {
    const rec = recommendations.find(r => r.action === action);
    if (rec) {
      return action;
    }
  }
  
  return 'KEEP';
}

/**
 * Encuentra el archivo de test correspondiente a un archivo fuente
 */
export function findTestFile(sourceFilePath) {
  // Si ya es un test, retornar el mismo
  if (sourceFilePath.endsWith('.test.js')) {
    return sourceFilePath;
  }
  
  // Convertir path de fuente a path de test
  const testPath = sourceFilePath
    .replace(/^src\//, 'tests/unit/')
    .replace(/^tests\/factories\//, 'tests/unit/factories/')
    .replace(/\.js$/, '.test.js');
  
  return testPath;
}

export default {
  generateActionRecommendations,
  determineBestAction,
  findTestFile
};
