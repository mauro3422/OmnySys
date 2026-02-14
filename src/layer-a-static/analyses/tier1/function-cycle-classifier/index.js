/**
 * @fileoverview Function Cycle Classifier - Main Entry Point
 * 
 * Using REAL METADATA from the atomic system.
 * NO assumptions about non-existent fields.
 * 
 * Refactored following SOLID principles:
 * - SRP: Each rule has single responsibility
 * - OCP: Easy to add new classification rules
 * - DIP: Depends on rule abstractions
 * 
 * @module function-cycle-classifier
 */

import { createLogger } from '../../../../utils/logger.js';
import { extractCycleMetadata } from './extractors/metadata-extractor.js';
import { classifyCycle, aggregateClassifications } from './classifier.js';

const logger = createLogger('OmnySys:function-cycle');

/**
 * Classify a single function cycle
 * @param {Array} cycle - Function IDs in cycle
 * @param {Object} atomsIndex - Index of atoms by file
 * @returns {Object} Classification result
 */
export function classifyFunctionCycle(cycle, atomsIndex) {
  try {
    const metadata = extractCycleMetadata(cycle, atomsIndex);
    return classifyCycle(cycle, metadata);
  } catch (error) {
    logger.error('Error clasificando ciclo de funciones:', error);
    return {
      cycle,
      severity: 'WARNING',
      category: 'ERROR',
      explanation: 'Error en clasificación',
      autoIgnore: false
    };
  }
}

/**
 * Classify all function cycles
 * @param {Array} cycles - Array of function cycles
 * @param {Object} atomsIndex - Index of atoms by file
 * @returns {Object} Aggregated classification results
 */
export function classifyAllFunctionCycles(cycles, atomsIndex) {
  if (!cycles || cycles.length === 0) {
    return {
      total: 0,
      valid: 0,
      problematic: 0,
      classifications: []
    };
  }
  
  const classifications = cycles.map(cycle => 
    classifyFunctionCycle(cycle, atomsIndex)
  );
  
  return aggregateClassifications(cycles, classifications);
}

// Re-export rules for extensibility
export { FUNCTION_CYCLE_RULES } from './rules/index.js';
export { extractFunctionMetadata } from './extractors/metadata-extractor.js';

// Default export
export default {
  classifyFunctionCycle,
  classifyAllFunctionCycles
};
