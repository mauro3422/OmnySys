/**
 * @fileoverview architectural-patterns.js
 *
 * Deteccion de patrones arquitectonicos (God Object, Orphan Module)
 *
 * REGLA: Los detectores aqui son para patrones ARQUITECTONICOS que afectan
 * CONEXIONES entre archivos. Un God Object es un nodo hipercentralizado en el
 * grafo (muchos dependents). Un Orphan Module es un nodo desconectado (exports
 * sin dependents). Ambos son patrones del GRAFO de dependencias, no de calidad
 * de codigo. No agregar detectores que no describan relaciones entre archivos.
 *
 * @module metadata-contract/detectors/architectural-patterns
 */

import { ARCHITECTURAL_THRESHOLDS } from '../constants.js';

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
  // Ej: 3 exports pero 10 dependents -> ratio 3.3 > 3 -> God Object
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

/**
 * Detecta si un archivo es un Facade (re-exporta mucho, define poco)
 * @param {object} metadata - Metadatos del archivo
 * @returns {boolean}
 */
export function detectFacade(metadata) {
  const reExportCount = metadata.reExportCount || 0;
  const functionCount = metadata.functionCount || 0;
  const exportCount = metadata.exportCount || 0;
  const isIndex = (metadata.filePath || '').endsWith('index.js') ||
                  (metadata.filePath || '').endsWith('index.ts');
  return reExportCount >= 3 || (isIndex && functionCount <= 1 && exportCount >= 3);
}

/**
 * Detecta si un archivo es un Config Hub (exporta config consumida por muchos)
 * @param {object} metadata - Metadatos del archivo
 * @returns {boolean}
 */
export function detectConfigHub(metadata) {
  const exportCount = metadata.exportCount || 0;
  const dependentCount = (metadata.dependentCount || 0) + (metadata.semanticDependentCount || 0);
  const functionCount = metadata.functionCount || 0;
  return exportCount >= 5 && dependentCount >= 5 && functionCount <= 2;
}

/**
 * Detecta si un archivo es un Entry Point (importa mucho, nadie lo importa)
 * @param {object} metadata - Metadatos del archivo
 * @returns {boolean}
 */
export function detectEntryPoint(metadata) {
  const importCount = metadata.importCount || 0;
  const dependentCount = (metadata.dependentCount || 0) + (metadata.semanticDependentCount || 0);
  return importCount >= 5 && dependentCount === 0;
}
