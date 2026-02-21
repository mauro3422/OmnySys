/**
 * @fileoverview Test Coverage Analyzer
 * 
 * Analiza tests existentes y detecta:
 * - Qué funciones/clases están testeadas
 * - Qué casos faltan (happy path, errors, branches, etc.)
 * - Qué tests están obsoletos (el código cambió)
 * - Qué tests son duplicados
 * 
 * @module mcp/tools/generate-tests/test-coverage-analyzer
 */

import { createLogger } from '../../../../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';

const logger = createLogger('OmnySys:test-coverage-analyzer');

/**
 * Analiza un archivo de test y detecta gaps de cobertura
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

/**
 * Parsea tests existentes desde el contenido del archivo
 */
function parseExistingTests(testContent) {
  const tests = [];
  
  // Detectar describe blocks
  const describeRegex = /describe\(['"](.+?)['"],\s*\(\s*\)\s*=>\s*\{/g;
  let match;
  while ((match = describeRegex.exec(testContent)) !== null) {
    tests.push({
      type: 'describe',
      name: match[1],
      index: match.index,
      tests: []
    });
  }
  
  // Detectar it/test blocks
  const itRegex = /(?:it|test)\(['"](.+?)['"],\s*(?:async\s*)?\(\s*\)\s*=>\s*\{/g;
  while ((match = itRegex.exec(testContent)) !== null) {
    // Encontrar a qué describe pertenece
    const parentDescribe = tests
      .filter(t => t.type === 'describe' && t.index < match.index)
      .pop();
    
    const testInfo = {
      type: 'test',
      name: match[1],
      index: match.index,
      content: extractTestContent(testContent, match.index)
    };
    
    if (parentDescribe) {
      parentDescribe.tests.push(testInfo);
    } else {
      tests.push(testInfo);
    }
  }
  
  return tests;
}

/**
 * Extrae el contenido de un test
 */
function extractTestContent(content, startIndex) {
  let braceCount = 0;
  let inTest = false;
  let endIndex = startIndex;
  
  for (let i = startIndex; i < content.length; i++) {
    if (content[i] === '{') {
      braceCount++;
      inTest = true;
    } else if (content[i] === '}') {
      braceCount--;
      if (inTest && braceCount === 0) {
        endIndex = i + 1;
        break;
      }
    }
  }
  
  return content.substring(startIndex, endIndex);
}

/**
 * Detecta qué entidades (funciones/clases) están siendo testeadas
 */
function detectTestedEntities(testContent) {
  const entities = [];
  
  // Detectar imports de funciones/clases
  const importRegex = /import\s+\{?\s*([^}]+)\}?\s+from\s+['"]([^'"]+)['"];?/g;
  let match;
  while ((match = importRegex.exec(testContent)) !== null) {
    const imports = match[1].split(',').map(s => s.trim());
    const source = match[2];
    
    imports.forEach(imp => {
      // Limpiar alias (as)
      const name = imp.replace(/\s+as\s+.+/, '').trim();
      entities.push({
        name,
        source,
        type: detectEntityType(testContent, name)
      });
    });
  }
  
  return entities;
}

/**
 * Detecta el tipo de entidad basado en el contexto del test
 */
function detectEntityType(testContent, name) {
  // Buscar new Name() para detectar clases (sin regex dinámico)
  if (testContent.includes(`new ${name}(`)) {
    return 'class';
  }
  
  // Buscar Name.method() para detectar métodos estáticos (sin regex dinámico)
  if (testContent.includes(`${name}.`)) {
    return 'class';
  }
  
  return 'function';
}

/**
 * Analiza qué tests faltan para una entidad
 */
async function analyzeEntityCoverage(entity, existingTests, projectPath) {
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

/**
 * Categoriza un test basado en su nombre
 */
function categorizeTest(testName, testedCases) {
  const lower = testName.toLowerCase();
  
  if (lower.includes('should return') || lower.includes('should create') || lower.includes('happy')) {
    testedCases.add('happy-path');
  }
  
  if (lower.includes('error') || lower.includes('throw') || lower.includes('exception') || lower.includes('fail')) {
    testedCases.add('error');
  }
  
  if (lower.includes('edge') || lower.includes('boundary') || lower.includes('limit')) {
    testedCases.add('edge-case');
  }
  
  if (lower.includes('null') || lower.includes('undefined')) {
    testedCases.add('null');
  }
  
  if (lower.includes('async') || lower.includes('await') || lower.includes('promise')) {
    testedCases.add('async');
  }
}

/**
 * Detecta tests obsoletos (que referencian código que ya no existe)
 */
function detectObsoleteTests(existingTests, projectPath) {
  const obsolete = [];
  
  // TODO: Implementar verificación contra el código fuente actual
  // Esto requeriría:
  // 1. Extraer qué funciones/clases se importan en el test
  // 2. Verificar que existan en el código fuente
  // 3. Marcar como obsoleto si no existen
  
  return obsolete;
}

/**
 * Detecta tests duplicados
 */
function detectDuplicateTests(existingTests) {
  const duplicates = [];
  const seen = new Map();
  
  existingTests.forEach(test => {
    if (test.type === 'test') {
      const normalized = test.name.toLowerCase().replace(/\s+/g, ' ').trim();
      
      if (seen.has(normalized)) {
        duplicates.push({
          name: test.name,
          firstOccurrence: seen.get(normalized),
          duplicate: test
        });
      } else {
        seen.set(normalized, test);
      }
    }
    
    // Revisar tests dentro de describes
    if (test.type === 'describe' && test.tests) {
      test.tests.forEach(t => {
        const normalized = t.name.toLowerCase().replace(/\s+/g, ' ').trim();
        
        if (seen.has(normalized)) {
          duplicates.push({
            name: t.name,
            firstOccurrence: seen.get(normalized),
            duplicate: t
          });
        } else {
          seen.set(normalized, t);
        }
      });
    }
  });
  
  return duplicates;
}

/**
 * Genera recomendaciones basadas en el análisis
 */
function generateRecommendations(coverageGaps, obsoleteTests, duplicateTests) {
  const recommendations = [];
  
  if (coverageGaps.length > 0) {
    recommendations.push(`🔍 ${coverageGaps.length} entidades tienen gaps de cobertura`);
    
    coverageGaps.forEach(gap => {
      if (gap.missingTests.length > 0) {
        recommendations.push(
          `  - ${gap.entity}: Falta ${gap.missingTests.map(m => m.type).join(', ')}`
        );
      }
    });
  }
  
  if (obsoleteTests.length > 0) {
    recommendations.push(`⚠️ ${obsoleteTests.length} tests parecen estar obsoletos`);
  }
  
  if (duplicateTests.length > 0) {
    recommendations.push(`♊ ${duplicateTests.length} tests duplicados detectados`);
  }
  
  if (recommendations.length === 0) {
    recommendations.push('✅ No se detectaron problemas de cobertura');
  }
  
  return recommendations;
}

/**
 * Compara tests existentes con código generado para detectar divergencias
 */
export function compareWithGeneratedTests(existingTests, generatedTests) {
  const comparison = {
    matching: [],
    missingInExisting: [],
    extraInExisting: []
  };
  
  const existingNames = new Set(
    existingTests
      .filter(t => t.type === 'test')
      .map(t => t.name.toLowerCase())
  );
  
  const generatedNames = new Set(
    generatedTests.map(t => t.name.toLowerCase())
  );
  
  // Encontrar tests que coinciden
  existingNames.forEach(name => {
    if (generatedNames.has(name)) {
      comparison.matching.push(name);
    } else {
      comparison.extraInExisting.push(name);
    }
  });
  
  // Encontrar tests faltantes
  generatedNames.forEach(name => {
    if (!existingNames.has(name)) {
      comparison.missingInExisting.push(name);
    }
  });
  
  return comparison;
}

export default {
  analyzeTestCoverage,
  compareWithGeneratedTests
};
