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

import {
  detectGodObject as detectGodObjectCanonical,
  detectOrphanModule as detectOrphanModuleCanonical,
  detectArchitecturalPatterns,
  getPatternDescriptions as getPatternDescriptionsCanonical
} from '#shared/architecture-utils.js';

/**
 * Detecta si un archivo es un God Object
 *
 * @param {number} exportCount - Cantidad de exports
 * @param {number} dependentCount - Cantidad de archivos dependientes
 * @returns {boolean}
 */
export function detectGodObject(exportCount, dependentCount) {
  return detectGodObjectCanonical(exportCount, dependentCount);
}

/**
 * Detecta si un archivo es un Orphan Module
 * @param {number} exportCount - Cantidad de exports
 * @param {number} dependentCount - Cantidad de archivos dependientes
 * @returns {boolean}
 */
export function detectOrphanModule(exportCount, dependentCount) {
  return detectOrphanModuleCanonical(exportCount, dependentCount);
}

/**
 * Detecta patrones en metadatos completos
 * @param {object} metadata - Metadatos del archivo
 * @returns {Object} - Patrones detectados
 */
export function detectPatterns(metadata) {
  return detectArchitecturalPatterns(metadata);
}

/**
 * Obtiene descripcion de los patrones detectados
 * @param {object} patterns - Resultado de detectPatterns
 * @returns {string[]}
 */
export function getPatternDescriptions(patterns) {
  return getPatternDescriptionsCanonical(patterns);
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
