/**
 * @fileoverview File Enhancer - Orquestador de enhancers a nivel de archivo
 * 
 * Responsabilidad Única (SRP): Ejecutar enhancers en secuencia para un archivo.
 * 
 * @module pipeline/enhancers/orchestrators
 */

import { createLogger } from '../../../../utils/logger.js';
import { enhanceMetadata } from '../metadata-enhancer.js';

const logger = createLogger('OmnySys:pipeline:enhancers:file');

/**
 * Ejecuta todos los enhancers en secuencia para un archivo
 * 
 * @param {Object} context - Contexto del pipeline
 * @param {Array} context.atoms - Átomos extraídos
 * @param {string} context.filePath - Ruta del archivo
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
