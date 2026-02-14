/**
 * @fileoverview classifier.js
 * 
 * Cycle classification logic
 * 
 * @module function-cycle-classifier/cycles/classifier
 */

import { createLogger } from '../../../../utils/logger.js';
import { FUNCTION_CYCLE_RULES } from '../classifiers/rules.js';
import { buildMetadataIndex } from '../utils/metadata.js';

const logger = createLogger('OmnySys:function-cycle');

const SEVERITY_ORDER = { ERROR: 0, WARNING: 1, INFO: 2 };

/**
 * Clasifica un ciclo de funciones
 */
export function classifyFunctionCycle(cycle, atomsIndex) {
  try {
    const metadata = buildMetadataIndex(cycle, atomsIndex);
    
    const matches = FUNCTION_CYCLE_RULES
      .filter(rule => {
        try {
          return rule.condition(cycle, metadata);
        } catch (error) {
          logger.debug(`Error en regla ${rule.id}:`, error.message);
          return false;
        }
      })
      .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
    
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
 * Clasifica todos los ciclos de funciones
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
