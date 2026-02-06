/**
 * @fileoverview change-processor.js
 * 
 * Servicio: Procesa cambios individuales con retry
 * 
 * @module batch-processor/change-processor
 */

import { Events } from './constants.js';

/**
 * Procesa un cambio individual
 * @param {FileChange} change - Cambio a procesar
 * @param {Batch} batch - Batch al que pertenece
 * @param {Object} context - Contexto del procesador
 * @param {Function} context.processFn - Función de procesamiento
 * @param {EventEmitter} context.emitter - Emitter para eventos
 * @returns {Promise<void>}
 */
export async function processChange(change, batch, context) {
  const { processFn, emitter } = context;
  
  emitter.emit(Events.CHANGE_PROCESSING, change, batch);

  try {
    // Ejecutar procesamiento
    if (processFn) {
      await processFn(change, batch);
    }

    emitter.emit(Events.CHANGE_COMPLETED, change, batch);
  } catch (error) {
    emitter.emit(Events.CHANGE_ERROR, change, error, batch);

    // Intentar retry si es posible
    if (change.canRetry()) {
      change.incrementRetry();
      await processChange(change, batch, context);
    } else {
      throw error;
    }
  }
}

/**
 * Procesa un batch completo
 * @param {Batch} batch - Batch a procesar
 * @param {Object} context - Contexto del procesador
 * @param {Function} context.processFn - Función de procesamiento
 * @param {EventEmitter} context.emitter - Emitter para eventos
 * @returns {Promise<void>}
 */
export async function processBatch(batch, context) {
  const changes = batch.getTopologicalOrder();

  for (const change of changes) {
    await processChange(change, batch, context);
  }
}
