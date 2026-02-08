/**
 * @fileoverview architecture-utils.js
 * 
 * SSOT - Detección de patrones arquitectónicos
 * Compartido entre layer-a-static y layer-b-semantic
 * 
 * Resuelve dependencia circular: layer-a usaba layer-b para estas funciones
 * 
 * @module shared/architecture-utils
 */

import { ARCHITECTURAL_THRESHOLDS } from '../layer-b-semantic/metadata-contract/constants.js';

/**
 * Detecta si un archivo es un God Object
 * 
 * Un God Object es un archivo que es "el centro" del sistema:
 * - Tiene muchos exports y muchos dependents (criterio clásico)
 * - O tiene MUY altos dependents (>= 10) sin importar exports
 * - O tiene un ratio de acoplamiento extremo (dependents >= 3 * exports)
 * 
 * @param {number} exportCount - Cantidad de exports
 * @param {number} dependentCount - Cantidad de archivos dependientes
 * @returns {boolean}
 */
export function detectGodObject(exportCount, dependentCount) {
  const { MIN_EXPORTS, MIN_DEPENDENTS, HIGH_DEPENDENTS, COUPLING_RATIO } = ARCHITECTURAL_THRESHOLDS.GOD_OBJECT;
  
  const exports = exportCount || 0;
  const dependents = dependentCount || 0;
  
  // Criterio 1: Clásico - muchos exports + muchos dependents
  const hasManyExports = exports >= MIN_EXPORTS;
  const hasManyDependents = dependents >= MIN_DEPENDENTS;
  const classicGodObject = hasManyExports && hasManyDependents;
  
  // Criterio 2: Muy alto acoplamiento (incluso con pocos exports)
  const hasVeryManyDependents = dependents >= HIGH_DEPENDENTS;
  
  // Criterio 3: Ratio de acoplamiento extremo
  const hasExtremeCoupling = exports > 0 && dependents >= (exports * COUPLING_RATIO);
  
  return classicGodObject || hasVeryManyDependents || hasExtremeCoupling;
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
export function detectArchitecturalPatterns(metadata) {
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
