/**
 * @fileoverview interface-extractor.js
 * 
 * Extracción de interfaces TypeScript
 * 
 * @module extractors/typescript/extractors/interface-extractor
 */

import { TS_PATTERNS, TSConstructType } from '../constants.js';

/**
 * Extrae interfaces del código
 * @param {string} code - Código fuente
 * @returns {Array<object>}
 */
export function extractInterfaces(code) {
  const interfaces = [];
  let match;

  while ((match = TS_PATTERNS.interface.exec(code)) !== null) {
    interfaces.push({
      type: TSConstructType.INTERFACE,
      name: match[1],
      position: match.index
    });
  }

  return interfaces;
}
