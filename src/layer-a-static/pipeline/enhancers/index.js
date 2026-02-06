/**
 * @fileoverview index.js
 * 
 * Facade del pipeline de enriquecimiento
 * 
 * @module pipeline/enhancers
 */

import { enhanceConnections } from './phases/connection-enhancer.js';
import { enhanceMetadata } from './phases/metadata-enhancer.js';

export { enhanceConnections };
export { enhanceMetadata };

/**
 * Pipeline de enriquecimiento completo
 * @param {object} staticResults - Resultados estáticos
 * @returns {Promise<object>} - Resultados enriquecidos
 */
export async function enhanceSystemMap(staticResults) {
  try {
    // Fase 1: Enriquecer conexiones
    if (typeof enhanceConnections === 'function') {
      await enhanceConnections(staticResults);
    }
    
    // Fase 2: Enriquecer metadata
    if (typeof enhanceMetadata === 'function') {
      enhanceMetadata(staticResults);
    }
  } catch (error) {
    // Si el enriquecimiento falla, continuar con los datos básicos
    console.warn('Warning: Enhancement failed, using basic data:', error.message);
  }
  
  return staticResults;
}

export default { enhanceSystemMap };
