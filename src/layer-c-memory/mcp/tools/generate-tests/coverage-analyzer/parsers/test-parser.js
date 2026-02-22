/**
 * @fileoverview Test Parser - Parsea tests existentes desde contenido de archivo
 */

import { extractTestContent } from './content-extractor.js';

/**
 * Parsea tests existentes desde el contenido del archivo
 * @param {string} testContent - Contenido del archivo de test
 * @returns {Array} - Array de tests parseados
 */
export function parseExistingTests(testContent) {
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
