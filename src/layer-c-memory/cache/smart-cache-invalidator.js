/**
 * @fileoverview smart-cache-invalidator.js
 *
 * Sistema de invalidación selectiva de caché.
 * Solo invalida las entradas de caché que dependen de los campos específicos
 * que cambiaron en un átomo, en lugar de invalidar todo el caché.
 *
 * @module layer-c-memory/cache/smart-cache-invalidator
 */

import { getCacheManager } from '#core/cache/singleton.js';
import { createLogger } from '#utils/logger.js';

const logger = createLogger('OmnySys:smart-cache');

/**
 * Mapeo de campos de átomos a herramientas MCP que los utilizan
 * Esto permite invalidar solo las cachés afectadas
 */
const FIELD_TO_TOOLS_MAP = {
  // Campos de metadata básica
  'archetype': ['detect_patterns', 'get_health_metrics', 'get_atom_schema'],
  'purpose': ['detect_patterns', 'find_dead_code', 'get_function_details'],
  'complexity': ['detect_patterns', 'suggest_refactoring', 'get_health_metrics'],
  'linesOfCode': ['detect_patterns', 'architectural_debt', 'get_health_metrics'],
  
  // Campos de grafo de llamadas
  'calledBy': ['get_call_graph', 'get_impact_map', 'detect_race_conditions'],
  'calls': ['get_call_graph', 'explain_value_flow', 'simulate_data_journey'],
  
  // Campos de análisis avanzado
  'isAsync': ['get_async_analysis', 'detect_race_conditions'],
  'hasErrorHandling': ['detect_race_conditions', 'get_async_analysis'],
  'hasSideEffects': ['detect_race_conditions', 'explain_value_flow'],
  
  // Campos de calidad
  'quality': ['get_health_metrics', 'suggest_refactoring'],
  'dna': ['detect_patterns', 'get_atom_schema'],
  
  // Campos de tests
  'isTestCallback': ['detect_patterns', 'get_health_metrics'],
  'testCallbackType': ['detect_patterns', 'get_health_metrics'],
  
  // Campos de conexiones
  'externalCalls': ['detect_race_conditions', 'get_risk_assessment'],
  'networkEndpoints': ['detect_race_conditions', 'get_risk_assessment'],
  
  // Campos de flujo de datos
  'dataFlow': ['explain_value_flow', 'trace_variable_impact'],
  'inputs': ['explain_value_flow'],
  'outputs': ['explain_value_flow']
};

/**
 * Determina qué cachés deben invalidarse basado en campos cambiados
 * @param {Array<string>} changedFields - Campos que cambiaron
 * @returns {Array<string>} Lista de cachés a invalidar
 */
export function getAffectedCaches(changedFields) {
  const cachesToInvalidate = new Set();
  
  for (const field of changedFields) {
    const affectedTools = FIELD_TO_TOOLS_MAP[field];
    if (affectedTools) {
      affectedTools.forEach(tool => cachesToInvalidate.add(tool));
    }
  }
  
  // Siempre invalidar el caché general de átomos
  cachesToInvalidate.add('atoms');
  
  return Array.from(cachesToInvalidate);
}

/**
 * Invalida cachés de forma selectiva basada en campos modificados
 * 
 * @param {string} atomId - ID del átomo modificado
 * @param {Array<string>} changedFields - Campos que cambiaron
 * @param {Object} cacheManager - Instancia del cache manager (opcional)
 */
export async function invalidateAtomCaches(atomId, changedFields, cacheManager = null) {
  if (!changedFields || changedFields.length === 0) {
    return { invalidated: [], skipped: true };
  }
  
  const affectedCaches = getAffectedCaches(changedFields);
  const results = {
    atomId,
    invalidated: [],
    fields: changedFields,
    timestamp: Date.now()
  };
  
  try {
    // Obtener cache manager si no se proporcionó
    const cache = cacheManager || getCacheManager();
    
    for (const cacheName of affectedCaches) {
      try {
        // Invalidar entrada específica del átomo en el caché
        const cacheKey = `${cacheName}:${atomId}`;
        await cache.invalidate?.(cacheKey);
        
        // También invalidar cachés de patrones que incluyan este átomo
        await cache.invalidatePattern?.(atomId);
        
        results.invalidated.push(cacheName);
      } catch (err) {
        logger.debug(`Could not invalidate cache ${cacheName}:`, err.message);
      }
    }
    
    logger.debug(`🗑️ Invalidated caches for ${atomId}:`, results.invalidated.join(', '));
    
  } catch (error) {
    logger.warn('Failed to invalidate caches:', error.message);
  }
  
  return results;
}

/**
 * Invalida múltiples átomos de forma batch
 * 
 * @param {Array<Object>} atomUpdates - Array de {atomId, changedFields}
 * @returns {Promise<Array>} Resultados de invalidación
 */
export async function invalidateMultipleAtoms(atomUpdates) {
  const results = [];
  
  for (const update of atomUpdates) {
    const result = await invalidateAtomCaches(update.atomId, update.changedFields);
    results.push(result);
  }
  
  return results;
}

/**
 * Obtiene estadísticas de qué cachés serían afectados por un cambio
 * Útil para debugging y optimización
 * 
 * @param {Array<string>} changedFields - Campos que cambiaron
 * @returns {Object} Estadísticas
 */
export function getInvalidationStats(changedFields) {
  const affectedCaches = getAffectedCaches(changedFields);
  
  return {
    fieldsChanged: changedFields.length,
    cachesAffected: affectedCaches.length,
    caches: affectedCaches,
    efficiency: changedFields.length > 0 
      ? (1 - (affectedCaches.length / Object.keys(FIELD_TO_TOOLS_MAP).length))
      : 1
  };
}
