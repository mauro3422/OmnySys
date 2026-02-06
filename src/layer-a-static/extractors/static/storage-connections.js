/**
 * @fileoverview storage-connections.js
 * 
 * Detecta conexiones entre archivos basadas en localStorage compartido
 * 
 * @module extractors/static/storage-connections
 */

import { ConnectionType, DEFAULT_CONFIDENCE } from './constants.js';

/**
 * Detecta conexiones entre archivos basadas en localStorage/sessionStorage compartido
 * @param {Object} fileResults - Mapa de filePath -> {localStorage, events, globals}
 * @returns {Array} - Conexiones detectadas
 */
export function detectLocalStorageConnections(fileResults) {
  const connections = [];
  const files = Object.entries(fileResults);
  
  for (let i = 0; i < files.length; i++) {
    const [fileA, resultsA] = files[i];
    const storageA = resultsA.localStorage || { all: [] };
    
    for (let j = i + 1; j < files.length; j++) {
      const [fileB, resultsB] = files[j];
      const storageB = resultsB.localStorage || { all: [] };
      
      // Buscar keys comunes
      const keysA = new Set(storageA.all.map(s => s.key));
      const keysB = storageB.all.map(s => s.key);
      const commonKeys = keysB.filter(k => keysA.has(k));
      
      if (commonKeys.length > 0) {
        // Determinar dirección de la conexión
        const writesA = storageA.writes.map(w => w.key);
        const readsA = storageA.reads.map(r => r.key);
        const writesB = storageB.writes.map(w => w.key);
        const readsB = storageB.reads.map(r => r.key);
        
        for (const key of commonKeys) {
          const direction = [];
          if (writesA.includes(key)) direction.push(`${fileA} → writes`);
          if (readsA.includes(key)) direction.push(`${fileA} → reads`);
          if (writesB.includes(key)) direction.push(`${fileB} → writes`);
          if (readsB.includes(key)) direction.push(`${fileB} → reads`);
          
          connections.push({
            id: `localStorage_${key}_${fileA}_to_${fileB}`,
            sourceFile: fileA,
            targetFile: fileB,
            type: ConnectionType.LOCAL_STORAGE,
            via: 'localStorage',
            key: key,
            direction: direction.join(', '),
            confidence: DEFAULT_CONFIDENCE,
            detectedBy: 'static-extractor',
            reason: `Both files use localStorage key '${key}'`
          });
        }
      }
    }
  }
  
  return connections;
}

/**
 * Verifica si dos archivos comparten keys de localStorage
 * @param {Object} storageA - Resultados de localStorage del archivo A
 * @param {Object} storageB - Resultados de localStorage del archivo B
 * @returns {boolean}
 */
export function sharesStorageKeys(storageA, storageB) {
  if (!storageA?.all?.length || !storageB?.all?.length) return false;
  
  const keysA = new Set(storageA.all.map(s => s.key));
  const keysB = storageB.all.map(s => s.key);
  
  return keysB.some(k => keysA.has(k));
}

/**
 * Obtiene las keys compartidas entre dos archivos
 * @param {Object} storageA - Resultados de localStorage del archivo A
 * @param {Object} storageB - Resultados de localStorage del archivo B
 * @returns {string[]} - Keys comunes
 */
export function getSharedStorageKeys(storageA, storageB) {
  if (!storageA?.all?.length || !storageB?.all?.length) return [];
  
  const keysA = new Set(storageA.all.map(s => s.key));
  const keysB = storageB.all.map(s => s.key);
  
  return keysB.filter(k => keysA.has(k));
}
