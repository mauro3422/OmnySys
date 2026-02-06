/**
 * @fileoverview index.js
 * 
 * Facade del módulo de extractores estáticos
 * Extrae conexiones semánticas usando regex/pattern matching (sin LLM)
 * 
 * ESTRATEGIA: Extraer primero con regex, luego el LLM valida/confirma
 * Esto es más confiable que depender 100% del LLM para descubrir
 * 
 * @module extractors/static
 */

import { extractLocalStorageKeys, extractStorageReads, extractStorageWrites } from './storage-extractor.js';
import { extractEventNames, extractEventListeners, extractEventEmitters } from './events-extractor.js';
import { extractGlobalAccess, extractGlobalReads, extractGlobalWrites } from './globals-extractor.js';
import { detectLocalStorageConnections, sharesStorageKeys, getSharedStorageKeys } from './storage-connections.js';
import { detectEventConnections, sharesEvents, getEventFlow } from './events-connections.js';
import { detectGlobalConnections, sharesGlobalVariables, getSharedGlobalVariables } from './globals-connections.js';
import { ConnectionType } from './constants.js';

// Re-exportar utilidades
export { getLineNumber, isNativeWindowProp } from './utils.js';
export { ConnectionType } from './constants.js';

// Re-exportar extractores individuales
export {
  extractLocalStorageKeys,
  extractStorageReads,
  extractStorageWrites,
  extractEventNames,
  extractEventListeners,
  extractEventEmitters,
  extractGlobalAccess,
  extractGlobalReads,
  extractGlobalWrites
};

// Re-exportar detectores de conexiones
export {
  detectLocalStorageConnections,
  detectEventConnections,
  detectGlobalConnections,
  sharesStorageKeys,
  getSharedStorageKeys,
  sharesEvents,
  getEventFlow,
  sharesGlobalVariables,
  getSharedGlobalVariables
};

/**
 * Analiza un archivo completo y extrae toda la información semántica
 * @param {string} filePath - Ruta del archivo
 * @param {string} code - Código fuente
 * @returns {Object} - Resultados de extracción { filePath, localStorage, events, globals }
 */
export function extractSemanticFromFile(filePath, code) {
  return {
    filePath,
    localStorage: extractLocalStorageKeys(code),
    events: extractEventNames(code),
    globals: extractGlobalAccess(code)
  };
}

/**
 * Detecta todas las conexiones semánticas entre múltiples archivos
 * @param {Object} fileSourceCode - Mapa de filePath -> código fuente
 * @returns {Object} - {localStorageConnections, eventConnections, globalConnections, all, fileResults}
 */
export function detectAllSemanticConnections(fileSourceCode) {
  // Primero, extraer información de cada archivo
  const fileResults = {};
  for (const [filePath, code] of Object.entries(fileSourceCode)) {
    fileResults[filePath] = extractSemanticFromFile(filePath, code);
  }
  
  // Luego, detectar conexiones
  const localStorageConnections = detectLocalStorageConnections(fileResults);
  const eventConnections = detectEventConnections(fileResults);
  const globalConnections = detectGlobalConnections(fileResults);
  
  return {
    localStorageConnections,
    eventConnections,
    globalConnections,
    all: [...localStorageConnections, ...eventConnections, ...globalConnections],
    fileResults
  };
}

/**
 * Extrae información semántica de múltiples archivos
 * @param {Object} fileSourceCode - Mapa de filePath -> código fuente
 * @returns {Object} - Mapa de filePath -> resultados
 */
export function extractAllFromFiles(fileSourceCode) {
  const results = {};
  for (const [filePath, code] of Object.entries(fileSourceCode)) {
    results[filePath] = extractSemanticFromFile(filePath, code);
  }
  return results;
}

/**
 * Detecta solo conexiones de localStorage entre archivos
 * @param {Object} fileSourceCode - Mapa de filePath -> código fuente
 * @returns {Array} - Conexiones de localStorage
 */
export function detectOnlyStorageConnections(fileSourceCode) {
  const fileResults = extractAllFromFiles(fileSourceCode);
  return detectLocalStorageConnections(fileResults);
}

/**
 * Detecta solo conexiones de eventos entre archivos
 * @param {Object} fileSourceCode - Mapa de filePath -> código fuente
 * @returns {Array} - Conexiones de eventos
 */
export function detectOnlyEventConnections(fileSourceCode) {
  const fileResults = extractAllFromFiles(fileSourceCode);
  return detectEventConnections(fileResults);
}

/**
 * Detecta solo conexiones de variables globales entre archivos
 * @param {Object} fileSourceCode - Mapa de filePath -> código fuente
 * @returns {Array} - Conexiones de globales
 */
export function detectOnlyGlobalConnections(fileSourceCode) {
  const fileResults = extractAllFromFiles(fileSourceCode);
  return detectGlobalConnections(fileResults);
}
