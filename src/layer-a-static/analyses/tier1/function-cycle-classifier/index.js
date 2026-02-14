/**
 * @fileoverview index.js
 * 
 * Function Cycle Classifier - Main entry point (backward compatible)
 * Usando METADATOS REALES del sistema
 * 
 * @module function-cycle-classifier
 */

import { classifyFunctionCycle, classifyAllFunctionCycles } from './cycles/classifier.js';
import { FUNCTION_CYCLE_RULES } from './classifiers/rules.js';

export {
  classifyFunctionCycle,
  classifyAllFunctionCycles,
  FUNCTION_CYCLE_RULES
};

export default { classifyFunctionCycle, classifyAllFunctionCycles };
