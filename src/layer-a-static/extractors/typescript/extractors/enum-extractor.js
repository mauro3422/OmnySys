/**
 * @fileoverview enum-extractor.js
 * 
 * Extracción de enums TypeScript
 * 
 * @module extractors/typescript/extractors/enum-extractor
 */

import { TS_PATTERNS, TSConstructType } from '../constants.js';

/**
 * Extrae enums del código
 * @param {string} code - Código fuente
 * @returns {Array<object>}
 */
export function extractEnums(code) {
  const enums = [];
  let match;

  while ((match = TS_PATTERNS.enum.exec(code)) !== null) {
    enums.push({
      type: TSConstructType.ENUM,
      name: match[1],
      position: match.index
    });
  }

  return enums;
}
