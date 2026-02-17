/**
 * @fileoverview index.js
 * 
 * Facade del módulo de state management (Redux + React Context)
 * 
 * @module extractors/state-management
 */

// Constantes
export { 
  ReduxType, 
  ContextType, 
  ConnectionType, 
  REDUX_PATTERNS, 
  CONTEXT_PATTERNS,
  DEFAULT_CONFIDENCE 
} from './constants.js';

// Utilidades
export { getLineNumber, extractStatePaths, truncate, createResult } from './utils.js';

// Redux extractors - import for local use and re-export
import { extractRedux, extractSelectors, extractActions, extractReducers, extractStores, extractThunks } from './redux/redux-extractor.js';
export { extractRedux, extractSelectors, extractActions, extractReducers, extractStores, extractThunks };
export { detectUseSelectors, detectConnectHOC, detectMapStateFunctions, detectAllSelectors } from './redux/selector-detector.js';
export { detectSlices, detectStores, detectSlicesAndStores } from './redux/slice-detector.js';
export { detectUseDispatch, detectAsyncThunks, detectDispatchCalls, detectAllActions } from './redux/thunk-detector.js';

// Context extractors - import for local use and re-export
import { extractContext, extractContexts, extractProviders, extractConsumers } from './context/context-extractor.js';
export { extractContext, extractContexts, extractProviders, extractConsumers };
export { detectContextCreations, detectProviders, detectAllProviders } from './context/provider-detector.js';
export { detectUseContext, detectContextConsumers, detectUseContextNew, detectAllConsumers } from './context/consumer-detector.js';

// Connections - import for local use and re-export
import { detectSelectorConnections, indexStatePaths, getFilesUsingPath } from './connections/selector-connections.js';
import { detectContextConnections, indexContextProviders, indexContextConsumers, getAllContextNames } from './connections/context-connections.js';
import { detectStoreStructure, getSlicesByFile, getAllSliceNames, getStoreStats } from './connections/store-structure.js';
export { detectSelectorConnections, indexStatePaths, getFilesUsingPath };
export { detectContextConnections, indexContextProviders, indexContextConsumers, getAllContextNames };
export { detectStoreStructure, getSlicesByFile, getAllSliceNames, getStoreStats };

/**
 * Extrae análisis completo de Redux/Context de un archivo
 * @param {string} filePath - Ruta del archivo
 * @param {string} code - Código fuente
 * @returns {Object} - Análisis completo
 */
export function extractReduxContextFromFile(filePath, code) {
  return {
    filePath,
    redux: extractRedux(code),
    context: extractContext(code),
    timestamp: new Date().toISOString()
  };
}

// 🆕 NUEVO: Wrappers simplificados para comprehensive-extractor
// Las funciones extractRedux y extractContext ya están importadas arriba

export function extractReduxSlices(code) {
  const result = extractRedux(code);
  return result.slices || [];
}

export function extractReduxThunks(code) {
  const result = extractRedux(code);
  return result.thunks || [];
}

export function extractReduxSelectors(code) {
  const result = extractRedux(code);
  return result.selectors || [];
}

export function extractContextProviders(code) {
  const result = extractContext(code);
  return result.providers || [];
}

export function extractContextConsumers(code) {
  const result = extractContext(code);
  return result.consumers || [];
}

export function extractStoreStructure(code) {
  const result = extractRedux(code);
  return {
    stores: result.stores || [],
    slices: result.slices || [],
    hasStore: (result.stores || []).length > 0
  };
}

export function extractSelectorConnections(code, allFiles = {}) {
  const result = extractRedux(code);
  const connections = [];
  for (const selector of result.selectors || []) {
    for (const path of selector.paths || []) {
      connections.push({
        selector: selector.body?.slice(0, 50) || 'unknown',
        statePath: path,
        line: selector.line
      });
    }
  }
  return connections;
}

export function extractContextConnections(code, allFiles = {}) {
  const result = extractContext(code);
  return {
    provides: result.providers?.map(p => p.contextName) || [],
    consumes: result.consumers?.map(c => c.contextName) || []
  };
}

/**
 * Detecta todas las conexiones Redux/Context
 * @param {Object} fileSourceCode - Mapa de filePath -> código
 * @returns {Object} - Conexiones detectadas
 */
export function detectAllReduxContextConnections(fileSourceCode) {
  const fileResults = {};
  
  for (const [filePath, code] of Object.entries(fileSourceCode)) {
    fileResults[filePath] = extractReduxContextFromFile(filePath, code);
  }
  
  const selectorConnections = detectSelectorConnections(fileResults);
  const contextConnections = detectContextConnections(fileResults);
  const storeStructure = detectStoreStructure(fileResults);
  
  return {
    connections: [...selectorConnections, ...contextConnections],
    storeStructure,
    fileResults,
    byType: {
      selector: selectorConnections,
      context: contextConnections
    }
  };
}

/**
 * Extrae análisis de múltiples archivos
 * @param {Object} fileSourceCode - Mapa de filePath -> código
 * @returns {Object} - fileResults
 */
export function analyzeFiles(fileSourceCode) {
  const fileResults = {};
  
  for (const [filePath, code] of Object.entries(fileSourceCode)) {
    fileResults[filePath] = extractReduxContextFromFile(filePath, code);
  }
  
  return fileResults;
}

/**
 * Detecta solo conexiones de Redux (selectores compartidos)
 * @param {Object} fileSourceCode - Mapa de filePath -> código
 * @returns {Array} - Conexiones de Redux
 */
export function detectOnlyReduxConnections(fileSourceCode) {
  const fileResults = analyzeFiles(fileSourceCode);
  return detectSelectorConnections(fileResults);
}

/**
 * Detecta solo conexiones de Context (provider -> consumer)
 * @param {Object} fileSourceCode - Mapa de filePath -> código
 * @returns {Array} - Conexiones de Context
 */
export function detectOnlyContextConnections(fileSourceCode) {
  const fileResults = analyzeFiles(fileSourceCode);
  return detectContextConnections(fileResults);
}
