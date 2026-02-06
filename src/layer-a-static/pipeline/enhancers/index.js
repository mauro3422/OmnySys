/**
 * @fileoverview index.js
 * 
 * Facade del pipeline de enriquecimiento
 * 
 * @module pipeline/enhancers
 */

export { enhanceConnections } from './phases/connection-enhancer.js';
export { enhanceMetadata } from './phases/metadata-enhancer.js';

/**
 * Pipeline de enriquecimiento completo
 * @param {object} staticResults - Resultados estáticos
 * @returns {Promise<object>} - Resultados enriquecidos
 */
export async function enhanceSystemMap(staticResults) {
  // Fase 1: Enriquecer conexiones
  await enhanceConnections(staticResults);
  
  // Fase 2: Enriquecer metadata
  enhanceMetadata(staticResults);
  
  return staticResults;
}

export default { enhanceSystemMap };
