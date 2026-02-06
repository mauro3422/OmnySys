/**
 * @fileoverview standard-builder.js
 * 
 * Construcción de metadatos estándar
 * 
 * @module metadata-contract/builders/standard-builder
 */

import { ARRAY_LIMITS, TYPESCRIPT_EXTENSIONS } from '../constants.js';

/**
 * Construye metadatos estándar a partir de datos de Layer A
 * @param {Object} fileAnalysis - Análisis del archivo desde Layer A
 * @param {string} filePath - Ruta del archivo
 * @param {Object} semanticAnalysis - Análisis semántico estático
 * @returns {Object} - Metadatos estandarizados
 */
export function buildStandardMetadata(fileAnalysis, filePath, semanticAnalysis = {}) {
  const exports = extractExports(fileAnalysis);
  const usedBy = fileAnalysis.usedBy || [];
  const imports = fileAnalysis.imports || [];
  const functions = fileAnalysis.functions || [];

  // Extraer datos semánticos
  const localStorageKeys = extractLocalStorageKeys(semanticAnalysis);
  const eventNames = extractEventNames(semanticAnalysis);

  return {
    // Campos base
    filePath,
    exportCount: exports.length,
    dependentCount: usedBy.length,
    importCount: imports.length,
    functionCount: functions.length,

    // Arrays limitados
    exports: limitArray(exports, ARRAY_LIMITS.EXPORTS),
    dependents: limitArray(usedBy, ARRAY_LIMITS.DEPENDENTS),

    // Flags de características
    hasDynamicImports: detectDynamicImports(semanticAnalysis),
    hasTypeScript: isTypeScript(filePath),
    hasCSSInJS: false,
    hasLocalStorage: localStorageKeys.length > 0,
    hasEventListeners: eventNames.length > 0,
    hasGlobalAccess: semanticAnalysis.sideEffects?.hasGlobalAccess || false,
    hasAsyncPatterns: false,
    hasJSDoc: false,

    // Datos específicos
    localStorageKeys,
    eventNames,
    envVars: [],

    // Flags adicionales
    hasRuntimeContracts: false,
    hasErrorHandling: false,
    hasBuildTimeDeps: false,
    hasSingletonPattern: false
  };
}

/**
 * Extrae exports del análisis
 * @private
 */
function extractExports(fileAnalysis) {
  return (fileAnalysis.exports || [])
    .map(e => typeof e === 'string' ? e : e.name)
    .filter(Boolean);
}

/**
 * Extrae localStorage keys
 * @private
 */
function extractLocalStorageKeys(semanticAnalysis) {
  return (semanticAnalysis.sharedState?.writes || [])
    .filter(w => typeof w === 'string')
    .slice(0, ARRAY_LIMITS.LOCAL_STORAGE_KEYS);
}

/**
 * Extrae event names
 * @private
 */
function extractEventNames(semanticAnalysis) {
  const emitters = semanticAnalysis.eventPatterns?.eventEmitters || [];
  const listeners = semanticAnalysis.eventPatterns?.eventListeners || [];
  
  return [...emitters, ...listeners]
    .map(e => typeof e === 'string' ? e : e.eventName)
    .filter(Boolean)
    .slice(0, ARRAY_LIMITS.EVENT_NAMES);
}

/**
 * Detecta si usa imports dinámicos
 * @private
 */
function detectDynamicImports(semanticAnalysis) {
  return semanticAnalysis.sideEffects?.usesDynamicImport || false;
}

/**
 * Verifica si es TypeScript
 * @private
 */
function isTypeScript(filePath) {
  return TYPESCRIPT_EXTENSIONS.some(ext => filePath.endsWith(ext));
}

/**
 * Limita un array a un tamaño máximo
 * @private
 */
function limitArray(arr, limit) {
  return arr.slice(0, limit);
}
