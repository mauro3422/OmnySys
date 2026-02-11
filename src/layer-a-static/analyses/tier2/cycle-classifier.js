/
 * Cycle Classifier - Orquestador molecular
 * 
 * Usa cycle-metadata y cycle-rules para clasificar ciclos.
 * Mantiene API backwards compatible.
 * 
 * @module cycle-classifier
 */

import { createLogger } from '../../../utils/logger.js';
import { extractCycleMetadata, deriveCycleProperties } from './cycle-metadata.js';
import { evaluateRules } from './cycle-rules.js';

const logger = createLogger('OmnySys:cycle-classifier');

export function classifyCycle(cycle, atomsIndex) {
  try {
    const metadata = extractCycleMetadata(cycle, atomsIndex);
    const derived = deriveCycleProperties(metadata);
    const matches = evaluateRules(derived);
    
    if (matches.length === 0) {
      return {
        cycle,
        severity: 'WARNING',
        category: 'UNKNOWN',
        explanation: 'Ciclo sin patrón reconocido',
        autoIgnore: false,
        derived
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
      derived,
      allMatches: matches
    };
  } catch (error) {
    logger.error('Error clasificando ciclo:', error);
    return {
      cycle,
      severity: 'WARNING',
      category: 'ERROR',
      explanation: 'Error en clasificación',
      autoIgnore: false
    };
  }
}

export function findCircularImports(systemMap, atomsIndex = {}) {
  const cycles = systemMap.metadata?.cyclesDetected || [];
  
  if (cycles.length === 0) {
    return {
      total: 0,
      cycles: [],
      classifications: [],
      problematicCount: 0,
      validCount: 0
    };
  }
  
  const classifications = cycles.map(cycle => classifyCycle(cycle, atomsIndex));
  
  const problematicCount = classifications.filter(c => 
    c.category === 'COUPLING_ISSUE' || c.category === 'CRITICAL_ISSUE'
  ).length;
  
  const validCount = classifications.filter(c =>
    c.category === 'VALID_ARCHITECTURE' || c.autoIgnore
  ).length;
  
  return {
    total: cycles.length,
    cycles,
    classifications,
    problematicCount,
    validCount,
    circularPairs: classifications
      .filter(c => c.severity !== 'INFO')
      .map(c => c.cycle.join(' -> ')),
    recommendation: problematicCount > 0 
      ? `${problematicCount} ciclos problemáticos detectados`
      : 'Todos los ciclos son válidos arquitectónicamente'
  };
}

export { extractCycleMetadata, deriveCycleProperties } from './cycle-metadata.js';
export { CYCLE_RULES, evaluateRules } from './cycle-rules.js';

export default { findCircularImports, classifyCycle };
