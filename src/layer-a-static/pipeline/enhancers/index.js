/**
 * @fileoverview Pipeline Enhancers - Post-procesamiento de metadatos
 * 
 * Los enhancers corren DESPUÉS de la extracción básica y enriquecen
 * los metadatos con conexiones adicionales, validaciones, etc.
 * 
 * No modifican la estructura base de los átomos, solo agregan campos adicionales
 * que las herramientas MCP pueden consumir opcionalmente.
 * 
 * @module pipeline/enhancers
 */

import { createLogger } from '../../../utils/logger.js';
import { enrichConnections } from './connection-enricher.js';
import { enhanceMetadata } from './metadata-enhancer.js';

const logger = createLogger('OmnySys:pipeline:enhancers');

/**
 * Ejecuta todos los enhancers en secuencia
 * 
 * @param {Object} context - Contexto del pipeline
 * @param {Array} context.atoms - Átomos extraídos
 * @returns {Promise<Object>} Contexto enriquecido
 */
export async function runEnhancers(context) {
  const { atoms, filePath } = context;
  
  if (!atoms || atoms.length === 0) {
    return context;
  }
  
  logger.debug(`Running enhancers for ${atoms.length} atoms in ${filePath}`);
  
  try {
    // 1. Enhancer de metadata (validación, cálculos adicionales)
    context = await enhanceMetadata(context);
    
    // 2. Connection Enricher (cross-reference, conexiones enriquecidas)
    // NOTA: Este es un enhancer a nivel de proyecto, no por archivo
    // Se ejecuta en una fase posterior del pipeline
    
    logger.debug('Enhancers completed successfully');
  } catch (error) {
    logger.warn('Enhancers failed (non-critical):', error.message);
    // No fallamos el pipeline, solo logueamos
  }
  
  return context;
}

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

// Exportar enhancers individuales para uso selectivo
export { enrichConnections } from './connection-enricher.js';
export { enhanceMetadata } from './metadata-enhancer.js';
