/**
 * @fileoverview index.js
 * 
 * Re-export de utilidades
 * 
 * @module validators/utils
 */

export {
  isLocalStorageMethod,
  isDOMMethod,
  isGenericPlaceholder,
  isJavaScriptCode,
  isGenericPath,
  looksLikeValidPath,
  normalizeGlobalName,
  extractVariableName
} from './pattern-checkers.js';

export {
  calculateDynamicTimeout,
  calculateBatchTimeout
} from './timeout-calculator.js';
