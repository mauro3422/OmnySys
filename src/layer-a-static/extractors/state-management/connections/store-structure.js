/**
 * @fileoverview store-structure.js
 * 
 * Detecta estructura del store (reducers/slices)
 * 
 * @module extractors/state-management/connections/store-structure
 */

/**
 * Detecta estructura del store (reducers)
 * @param {Object} fileResults - Mapa de filePath -> analysis
 * @returns {Object} - Estructura del store detectada
 */
export function detectStoreStructure(fileResults) {
  const slices = [];
  
  for (const [filePath, analysis] of Object.entries(fileResults)) {
    const redux = analysis.redux || {};
    
    for (const reducer of redux.reducers || []) {
      slices.push({
        name: reducer.name,
        file: filePath,
        line: reducer.line
      });
    }
  }
  
  return {
    sliceCount: slices.length,
    slices,
    likelyStateKeys: slices.map(s => s.name.toLowerCase())
  };
}

/**
 * Obtiene slices por archivo
 * @param {Object} fileResults - Mapa de filePath -> analysis
 * @returns {Map} - filePath -> slices
 */
export function getSlicesByFile(fileResults) {
  const result = new Map();
  
  for (const [filePath, analysis] of Object.entries(fileResults)) {
    const redux = analysis.redux || {};
    if (redux.reducers?.length > 0) {
      result.set(filePath, redux.reducers);
    }
  }
  
  return result;
}

/**
 * Obtiene nombres de todos los slices
 * @param {Object} fileResults - Mapa de filePath -> analysis
 * @returns {string[]} - Nombres de slices
 */
export function getAllSliceNames(fileResults) {
  const names = new Set();
  
  for (const analysis of Object.values(fileResults)) {
    const redux = analysis.redux || {};
    for (const reducer of redux.reducers || []) {
      names.add(reducer.name);
    }
  }
  
  return Array.from(names);
}

/**
 * Obtiene estadísticas del store
 * @param {Object} fileResults - Mapa de filePath -> analysis
 * @returns {Object} - Estadísticas
 */
export function getStoreStats(fileResults) {
  const structure = detectStoreStructure(fileResults);
  const totalStores = Object.values(fileResults).filter(
    a => a.redux?.stores?.length > 0
  ).length;
  
  return {
    totalSlices: structure.sliceCount,
    totalStores,
    sliceNames: structure.slices.map(s => s.name),
    likelyStateKeys: structure.likelyStateKeys
  };
}
