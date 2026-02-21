/**
 * @fileoverview Test Parser
 * 
 * Parsea tests existentes desde archivos de test.
 * 
 * @module mcp/tools/generate-tests/test-parser
 */

import { createLogger } from '../../../../utils/logger.js';

const logger = createLogger('OmnySys:test-parser');

/**
 * Parsea tests existentes desde el contenido del archivo
 */
export function parseExistingTests(testContent) {
  logger.debug('[TestParser] Parsing existing tests');
  
  const tests = [];
  
  // Detectar it/test blocks
  const itRegex = /it\(['"](.+?)['"],\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{/g;
  let match;
  while ((match = itRegex.exec(testContent)) !== null) {
    tests.push({
      name: match[1],
      index: match.index,
      type: categorizeTest(match[1])
    });
  }
  
  return tests;
}

/**
 * Categoriza un test basado en su nombre
 */
export function categorizeTest(testName) {
  const lower = testName.toLowerCase();
  
  if (lower.includes('constructor') || lower.includes('create instance')) {
    return 'constructor';
  }
  if (lower.includes('should set') || lower.includes('should configure')) {
    return 'builder-method';
  }
  if (lower.includes('build')) {
    return 'build';
  }
  if (lower.includes('chain')) {
    return 'chaining';
  }
  if (lower.includes('mutat') || lower.includes('immutable')) {
    return 'immutability';
  }
  if (lower.includes('static') || lower.includes('factory')) {
    return 'static-factory';
  }
  
  return 'other';
}

/**
 * Normaliza nombre de test para comparación
 */
export function normalizeTestName(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/should /g, '')
    .replace(/configure /g, 'set ')
    .replace(/create instance via /g, '')
    .trim();
}

/**
 * Agrupa tests por tipo
 */
export function groupByType(tests) {
  const groups = {};
  tests.forEach(test => {
    const type = test.type || 'other';
    groups[type] = (groups[type] || 0) + 1;
  });
  return groups;
}

export default {
  parseExistingTests,
  categorizeTest,
  normalizeTestName,
  groupByType
};
