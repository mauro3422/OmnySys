/**
 * @fileoverview Cycle Classifier
 * 
 * Main classification logic for function cycles
 * 
 * @module function-cycle-classifier/classifier
 */

import { createLogger } from '../../../../utils/logger.js';
import { FUNCTION_CYCLE_RULES } from './rules/index.js';

const logger = createLogger('OmnySys:function-cycle:classifier');

/**
 * Sort matches by severity
 * @param {Array} matches - Rule matches
 * @returns {Array} Sorted matches
 */
function sortBySeverity(matches) {
  const order = { ERROR: 0, WARNING: 1, INFO: 2 };
  return matches.sort((a, b) => order[a.severity] - order[b.severity]);
}

/**
 * Find matching rules for a cycle
 * @param {Array} cycle - Function IDs
 * @param {Object} metadata - Function metadata
 * @returns {Array} Matching rules
 */
function findMatchingRules(cycle, metadata) {
  return FUNCTION_CYCLE_RULES
    .filter(rule => {
      try {
        return rule.condition(cycle, metadata);
      } catch (error) {
        logger.debug(`Error en regla ${rule.id}:`, error.message);
        return false;
      }
    })
    .sort((a, b) => {
      const order = { ERROR: 0, WARNING: 1, INFO: 2 };
      return order[a.severity] - order[b.severity];
    });
}

/**
 * Classify a single function cycle
 * @param {Array} cycle - Function IDs in cycle
 * @param {Object} metadata - Function metadata map
 * @returns {Object} Classification result
 */
export function classifyCycle(cycle, metadata) {
  const matches = findMatchingRules(cycle, metadata);
  
  if (matches.length === 0) {
    return {
      cycle,
      severity: 'WARNING',
      category: 'UNKNOWN',
      explanation: 'Ciclo de funciones sin patrón reconocido',
      autoIgnore: false,
      metadata
    };
  }
  
  const primary = matches[0];
  return {
    cycle,
    severity: primary.severity,
    category: primary.category,
    explanation: primary.explanation,
    autoIgnore: primary.autoIgnore,
    suggestion: primary.suggestion,
    ruleId: primary.id,
    metadata,
    allMatches: matches
  };
}

/**
 * Classify multiple cycles
 * @param {Array} cycles - Array of cycles
 * @param {Array} classifications - Classifications
 * @returns {Object} Aggregated results
 */
export function aggregateClassifications(cycles, classifications) {
  const validCount = classifications.filter(c => 
    c.category === 'VALID_PATTERN' || c.autoIgnore
  ).length;
  
  const problematicCount = classifications.filter(c =>
    c.category === 'CRITICAL_ISSUE' || c.category === 'REQUIRES_REVIEW'
  ).length;
  
  return {
    total: cycles.length,
    valid: validCount,
    problematic: problematicCount,
    classifications,
    ignoredCycles: classifications
      .filter(c => c.autoIgnore)
      .map(c => c.cycle),
    reportedCycles: classifications
      .filter(c => !c.autoIgnore)
      .map(c => c.cycle)
  };
}
