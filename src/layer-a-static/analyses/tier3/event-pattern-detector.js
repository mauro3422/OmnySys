/**
 * @fileoverview event-pattern-detector.js
 *
 * Detecta patrones de eventos (listeners, emitters) en código fuente.
 * Stub funcional - implementación completa pendiente.
 *
 * @module layer-a-static/analyses/tier3/event-pattern-detector
 * @phase Layer A (Static Extraction)
 * @status STUB - returns safe empty defaults
 */

import { createLogger } from '../../../utils/logger.js';
import { detectEventPatterns as modularDetectEventPatterns } from './event-detector/detector.js';

const logger = createLogger('OmnySys:event:detector');

/**
 * Detecta patrones de eventos en código fuente usando el detector modular basado en Tree-sitter
 * @param {string} code - Código fuente a analizar
 * @param {string} filePath - Path del archivo (para contexto)
 * @returns {Promise<{ eventListeners: Array, eventEmitters: Array }>}
 */
export async function detectEventPatterns(code, filePath) {
  try {
    return await modularDetectEventPatterns(code, filePath);
  } catch (error) {
    logger.warn(`⚠️ Error detecting events in ${filePath}:`, error.message);
    return { eventListeners: [], eventEmitters: [] };
  }
}

/**
 * Genera conexiones de eventos entre archivos del proyecto.
 * @param {Object} fileEventDataMap - Mapa { filePath: { eventListeners, eventEmitters } }
 * @returns {Array<{ from: string, to: string, event: string, type: string }>}
 */
export function generateEventConnections(fileEventDataMap) {
  if (!fileEventDataMap || typeof fileEventDataMap !== 'object') {
    return [];
  }

  const connections = [];

  // Construir índice: event → emitters
  const emitterIndex = {};
  for (const [filePath, data] of Object.entries(fileEventDataMap)) {
    for (const emitter of (data.eventEmitters || [])) {
      if (!emitterIndex[emitter.event]) {
        emitterIndex[emitter.event] = [];
      }
      emitterIndex[emitter.event].push(filePath);
    }
  }

  // Conectar listeners con emitters del mismo evento
  for (const [filePath, data] of Object.entries(fileEventDataMap)) {
    for (const listener of (data.eventListeners || [])) {
      const emitters = emitterIndex[listener.event] || [];
      for (const emitterFile of emitters) {
        if (emitterFile !== filePath) {
          connections.push({
            from: emitterFile,
            to: filePath,
            event: listener.event,
            type: 'event-connection'
          });
        }
      }
    }
  }

  return connections;
}
