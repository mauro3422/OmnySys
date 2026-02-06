/**
 * @fileoverview selector-connections.js
 * 
 * Detecta conexiones por selector compartido (mismo state path)
 * 
 * @module extractors/state-management/connections/selector-connections
 */

import { ConnectionType, DEFAULT_CONFIDENCE } from '../constants.js';

/**
 * Detecta conexiones por selector compartido
 * @param {Object} fileResults - Mapa de filePath -> analysis
 * @returns {Array} - Conexiones detectadas
 */
export function detectSelectorConnections(fileResults) {
  const connections = [];
  
  // Indexar paths de estado usados
  const pathIndex = new Map(); // path -> [{file, selector}]
  
  for (const [filePath, analysis] of Object.entries(fileResults)) {
    const redux = analysis.redux || {};
    
    for (const selector of redux.selectors || []) {
      for (const path of selector.paths || []) {
        if (!pathIndex.has(path)) {
          pathIndex.set(path, []);
        }
        pathIndex.get(path).push({ file: filePath, selector });
      }
    }
  }
  
  // Crear conexiones entre archivos que usan el mismo path
  for (const [path, usages] of pathIndex.entries()) {
    if (usages.length > 1) {
      for (let i = 0; i < usages.length; i++) {
        for (let j = i + 1; j < usages.length; j++) {
          connections.push({
            id: `selector_${path}_${usages[i].file}_to_${usages[j].file}`,
            sourceFile: usages[i].file,
            targetFile: usages[j].file,
            type: ConnectionType.SHARED_SELECTOR,
            via: 'redux',
            statePath: path,
            confidence: DEFAULT_CONFIDENCE.selector,
            detectedBy: 'redux-extractor',
            reason: `Both use selector accessing state.${path}`
          });
        }
      }
    }
  }
  
  return connections;
}

/**
 * Indexa paths de estado por archivo
 * @param {Object} fileResults - Mapa de filePath -> analysis
 * @returns {Map} - path -> archivos que lo usan
 */
export function indexStatePaths(fileResults) {
  const pathIndex = new Map();
  
  for (const [filePath, analysis] of Object.entries(fileResults)) {
    const redux = analysis.redux || {};
    
    for (const selector of redux.selectors || []) {
      for (const path of selector.paths || []) {
        if (!pathIndex.has(path)) {
          pathIndex.set(path, []);
        }
        pathIndex.get(path).push(filePath);
      }
    }
  }
  
  return pathIndex;
}

/**
 * Obtiene archivos que comparten un path de estado específico
 * @param {Object} fileResults - Mapa de filePath -> analysis
 * @param {string} statePath - Path a buscar
 * @returns {string[]} - Archivos que usan el path
 */
export function getFilesUsingPath(fileResults, statePath) {
  const files = [];
  
  for (const [filePath, analysis] of Object.entries(fileResults)) {
    const redux = analysis.redux || {};
    
    for (const selector of redux.selectors || []) {
      if (selector.paths?.includes(statePath)) {
        files.push(filePath);
        break;
      }
    }
  }
  
  return files;
}
