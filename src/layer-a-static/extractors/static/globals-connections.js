/**
 * @fileoverview globals-connections.js
 * 
 * Detecta conexiones entre archivos basadas en variables globales compartidas
 * 
 * @module extractors/static/globals-connections
 */

import { ConnectionType, DEFAULT_CONFIDENCE } from './constants.js';

/**
 * Detecta conexiones entre archivos basadas en variables globales compartidas
 * @param {Object} fileResults - Mapa de filePath -> {localStorage, events, globals}
 * @returns {Array} - Conexiones detectadas
 */
export function detectGlobalConnections(fileResults) {
  const connections = [];
  const files = Object.entries(fileResults);
  
  for (let i = 0; i < files.length; i++) {
    const [fileA, resultsA] = files[i];
    const globalsA = resultsA.globals || { all: [] };
    
    for (let j = i + 1; j < files.length; j++) {
      const [fileB, resultsB] = files[j];
      const globalsB = resultsB.globals || { all: [] };
      
      // Buscar propiedades comunes
      const propsA = new Set(globalsA.all.map(g => g.property));
      const propsB = globalsB.all.map(g => g.property);
      const commonProps = propsB.filter(p => propsA.has(p));
      
      if (commonProps.length > 0) {
        // Determinar dirección de la conexión
        const writesA = globalsA.writes.map(w => w.property);
        const readsA = globalsA.reads.map(r => r.property);
        const writesB = globalsB.writes.map(w => w.property);
        const readsB = globalsB.reads.map(r => r.property);
        
        for (const prop of commonProps) {
          const direction = [];
          if (writesA.includes(prop)) direction.push(`${fileA} → writes`);
          if (readsA.includes(prop)) direction.push(`${fileA} → reads`);
          if (writesB.includes(prop)) direction.push(`${fileB} → writes`);
          if (readsB.includes(prop)) direction.push(`${fileB} → reads`);
          
          connections.push({
            id: `global_${prop}_${fileA}_to_${fileB}`,
            sourceFile: fileA,
            targetFile: fileB,
            type: ConnectionType.GLOBAL_VARIABLE,
            via: 'global',
            property: prop,
            direction: direction.join(', '),
            confidence: DEFAULT_CONFIDENCE,
            detectedBy: 'static-extractor',
            reason: `Both files use global variable '${prop}'`
          });
        }
      }
    }
  }
  
  return connections;
}

/**
 * Verifica si dos archivos comparten variables globales
 * @param {Object} globalsA - Resultados de globales del archivo A
 * @param {Object} globalsB - Resultados de globales del archivo B
 * @returns {boolean}
 */
export function sharesGlobalVariables(globalsA, globalsB) {
  if (!globalsA?.all?.length || !globalsB?.all?.length) return false;
  
  const propsA = new Set(globalsA.all.map(g => g.property));
  const propsB = globalsB.all.map(g => g.property);
  
  return propsB.some(p => propsA.has(p));
}

/**
 * Obtiene las propiedades globales compartidas entre dos archivos
 * @param {Object} globalsA - Resultados de globales del archivo A
 * @param {Object} globalsB - Resultados de globales del archivo B
 * @returns {string[]} - Propiedades comunes
 */
export function getSharedGlobalVariables(globalsA, globalsB) {
  if (!globalsA?.all?.length || !globalsB?.all?.length) return [];
  
  const propsA = new Set(globalsA.all.map(g => g.property));
  const propsB = globalsB.all.map(g => g.property);
  
  return propsB.filter(p => propsA.has(p));
}
