/**
 * @fileoverview architectural-patterns.js
 * 
 * Detección de patrones arquitectónicos (God Object, Orphan Module)
 * 
 * @module metadata-contract/detectors/architectural-patterns
 */

import { ARCHITECTURAL_THRESHOLDS } from '../constants.js';

/**
 * Detecta si un archivo es un God Object
 * @param {number} exportCount - Cantidad de exports
 * @param {number} dependentCount - Cantidad de archivos dependientes
 * @returns {boolean}
 */
export function detectGodObject(exportCount, dependentCount) {
  const { MIN_EXPORTS, MIN_DEPENDENTS, HIGH_DEPENDENTS } = ARCHITECTURAL_THRESHOLDS.GOD_OBJECT;
  
  const hasManyExports = (exportCount || 0) >= MIN_EXPORTS;
  const hasManyDependents = (dependentCount || 0) >= MIN_DEPENDENTS;
  const hasVeryManyDependents = (dependentCount || 0) >= HIGH_DEPENDENTS;
  
  return (hasManyExports && hasManyDependents) || hasVeryManyDependents;
}

/**
 * Detecta si un archivo es un Orphan Module
 * @param {number} exportCount - Cantidad de exports
 * @param {number} dependentCount - Cantidad de archivos dependientes
 * @returns {boolean}
 */
export function detectOrphanModule(exportCount, dependentCount) {
  const { MAX_DEPENDENTS, MIN_EXPORTS } = ARCHITECTURAL_THRESHOLDS.ORPHAN_MODULE;
  
  const hasNoDependents = (dependentCount || 0) <= MAX_DEPENDENTS;
  const hasExports = (exportCount || 0) >= MIN_EXPORTS;
  
  return hasNoDependents && hasExports;
}

/**
 * Detecta patrones en metadatos completos
 * @param {object} metadata - Metadatos del archivo
 * @returns {Object} - Patrones detectados
 */
export function detectPatterns(metadata) {
  return {
    isGodObject: detectGodObject(metadata.exportCount, metadata.dependentCount),
    isOrphanModule: detectOrphanModule(metadata.exportCount, metadata.dependentCount),
    hasHighCoupling: metadata.dependentCount > 10,
    hasManyExports: metadata.exportCount > 5
  };
}

/**
 * Obtiene descripción de los patrones detectados
 * @param {object} patterns - Resultado de detectPatterns
 * @returns {string[]}
 */
export function getPatternDescriptions(patterns) {
  const descriptions = [];
  
  if (patterns.isGodObject) {
    descriptions.push('God Object: High coupling and many exports');
  }
  if (patterns.isOrphanModule) {
    descriptions.push('Orphan Module: Has exports but no dependents');
  }
  if (patterns.hasHighCoupling) {
    descriptions.push('High Coupling: Many files depend on this');
  }
  if (patterns.hasManyExports) {
    descriptions.push('Many Exports: Consider splitting this module');
  }
  
  return descriptions;
}
