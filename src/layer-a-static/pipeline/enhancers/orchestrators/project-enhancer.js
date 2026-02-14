/**
 * @fileoverview Project Enhancer - Orquestador de enhancers a nivel de proyecto
 * 
 * Responsabilidad Única (SRP): Ejecutar enhancers que necesitan contexto completo.
 * 
 * @module pipeline/enhancers/orchestrators
 */

import { createLogger } from '../../../../utils/logger.js';
import { enrichConnections } from '../connection-enricher.js';

const logger = createLogger('OmnySys:pipeline:enhancers:project');

/**
 * Ejecuta enhancers a nivel de proyecto (cross-file)
 * 
 * Este método debe llamarse DESPUÉS de analizar todos los archivos,
 * cuando tenemos el contexto completo del proyecto.
 * 
 * @param {Array} allAtoms - Todos los átomos del proyecto
 * @param {Object} projectMetadata - Metadata del proyecto
 * @returns {Promise<Object>} Conexiones enriquecidas del proyecto
 */
export async function runProjectEnhancers(allAtoms, projectMetadata) {
  logger.info(`Running project-level enhancers for ${allAtoms.length} atoms`);
  
  const startTime = Date.now();
  
  try {
    // Connection Enricher - necesita todos los átomos
    const enrichedConnections = await enrichConnections(allAtoms);
    
    const duration = Date.now() - startTime;
    logger.info(`Project enhancers completed in ${duration}ms`);
    
    return {
      connections: enrichedConnections,
      metadata: {
        enhancedAt: new Date().toISOString(),
        duration,
        atomCount: allAtoms.length
      }
    };
  } catch (error) {
    logger.error('Project enhancers failed:', error);
    // Retornamos estructura vacía para no romper el pipeline
    return {
      connections: { connections: [], conflicts: [], stats: {} },
      metadata: { error: error.message }
    };
  }
}
