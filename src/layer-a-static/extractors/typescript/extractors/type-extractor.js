/**
 * @fileoverview type-extractor.js
 * 
 * Extracción de type aliases TypeScript
 * 
 * @module extractors/typescript/extractors/type-extractor
 */

import { TS_PATTERNS, TSConstructType } from '../constants.js';

/**
 * Extrae type aliases del código
 * @param {string} code - Código fuente
 * @returns {Array<object>}
 */
export function extractTypes(code) {
  const types = [];
  let match;

  while ((match = TS_PATTERNS.type.exec(code)) !== null) {
    types.push({
      type: TSConstructType.TYPE,
      name: match[1],
      position: match.index
    });
  }

  return types;
}
