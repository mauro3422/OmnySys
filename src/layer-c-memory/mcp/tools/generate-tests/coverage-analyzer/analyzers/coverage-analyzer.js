/**
 * @fileoverview Coverage Analyzer - Analiza cobertura de entidades
 */

import { categorizeTest } from './test-categorizer.js';

/**
 * Analiza qué tests faltan para una entidad
 * @param {Object} entity - Entidad a analizar
 * @param {Array} existingTests - Tests existentes
 * @param {string} projectPath - Ruta del proyecto
 * @returns {Object} - Resultado del análisis de cobertura
 */
export async function analyzeEntityCoverage(entity, existingTests, projectPath) {
  const testedCases = new Set();
  
  // Buscar tests relacionados con esta entidad
  existingTests.forEach(test => {
    if (test.type === 'describe' && test.name.includes(entity.name)) {
      test.tests.forEach(t => {
        categorizeTest(t.name, testedCases);
      });
    } else if (test.type === 'test' && test.name.toLowerCase().includes(entity.name.toLowerCase())) {
      categorizeTest(test.name, testedCases);
    }
  });
  
  // Determinar qué casos faltan
  const missingTests = [];
  
  if (!testedCases.has('happy-path')) {
    missingTests.push({
      type: 'happy-path',
      description: 'Caso exitoso básico',
      priority: 'high'
    });
  }
  
  if (!testedCases.has('error')) {
    missingTests.push({
      type: 'error',
      description: 'Manejo de errores',
      priority: 'high'
    });
  }
  
  if (!testedCases.has('edge-case')) {
    missingTests.push({
      type: 'edge-case',
      description: 'Casos límite',
      priority: 'medium'
    });
  }
  
  if (!testedCases.has('null')) {
    missingTests.push({
      type: 'null-undefined',
      description: 'Inputs null/undefined',
      priority: 'medium'
    });
  }
  
  return {
    entity: entity.name,
    entityType: entity.type,
    testedCases: Array.from(testedCases),
    missingTests,
    coverage: {
      total: 4, // happy-path, error, edge-case, null
      covered: testedCases.size,
      percentage: Math.round((testedCases.size / 4) * 100)
    }
  };
}