/**
 * @fileoverview Batch Processor - Procesamiento batch de peticiones LLM
 * 
 * Responsabilidad Única (SRP): Procesar múltiples peticiones LLM en batch.
 * 
 * @module llm-service/batch
 */

import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:services:llm:batch');

/**
 * Resultado de procesamiento batch
 * @typedef {Object} BatchResult
 * @property {Array} results - Resultados de cada petición
 * @property {number} successful - Cantidad de peticiones exitosas
 * @property {number} failed - Cantidad de peticiones fallidas
 * @property {number} duration - Duración total en ms
 */

/**
 * Procesa múltiples peticiones en batch
 * 
 * @param {Array<{prompt: string, options?: object}>} requests - Peticiones a procesar
 * @param {Function} analyzeFn - Función de análisis individual
 * @param {Object} options - Opciones de procesamiento
 * @param {number} options.concurrency - Concurrencia (default: 1)
 * @returns {Promise<BatchResult>} Resultados del procesamiento
 */
export async function processBatch(requests, analyzeFn, options = {}) {
  const startTime = Date.now();
  const concurrency = options.concurrency || 1;
  
  logger.info(`🔄 Processing batch of ${requests.length} requests (concurrency: ${concurrency})`);
  
  let successful = 0;
  let failed = 0;
  
  let results;
  if (concurrency === 1) {
    results = await processSequential(requests, analyzeFn, () => successful++, () => failed++);
  } else {
    results = await processConcurrent(requests, analyzeFn, concurrency, () => successful++, () => failed++);
  }
  
  const duration = Date.now() - startTime;
  
  logger.info(`✅ Batch completed: ${successful} successful, ${failed} failed (${duration}ms)`);
  
  return {
    results,
    successful,
    failed,
    duration
  };
}

/**
 * Procesa peticiones secuencialmente
 * @private
 */
async function processSequential(requests, analyzeFn, onSuccess, onFailure) {
  const results = [];
  
  for (const request of requests) {
    try {
      const result = await analyzeFn(request.prompt, request.options);
      results.push(result);
      onSuccess();
    } catch (error) {
      results.push({ error: error.message });
      onFailure();
    }
  }
  
  return results;
}

/**
 * Procesa peticiones concurrentemente
 * @private
 */
async function processConcurrent(requests, analyzeFn, concurrency, onSuccess, onFailure) {
  const results = [];
  const chunks = chunkArray(requests, concurrency);
  
  for (const chunk of chunks) {
    const chunkResults = await Promise.all(
      chunk.map(req => 
        analyzeFn(req.prompt, req.options)
          .then(result => {
            onSuccess();
            return result;
          })
          .catch(err => {
            onFailure();
            return { error: err.message };
          })
      )
    );
    results.push(...chunkResults);
  }
  
  return results;
}

/**
 * Divide un array en chunks
 * @param {Array} array - Array a dividir
 * @param {number} chunkSize - Tamaño de cada chunk
 * @returns {Array<Array>} Array de chunks
 */
export function chunkArray(array, chunkSize) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Calcula el tamaño óptimo de chunk basado en el número de requests
 * @param {number} totalRequests - Total de peticiones
 * @param {number} maxConcurrency - Concurrencia máxima deseada
 * @returns {number} Tamaño óptimo de chunk
 */
export function calculateOptimalChunkSize(totalRequests, maxConcurrency) {
  if (totalRequests <= maxConcurrency) {
    return totalRequests;
  }
  
  // Distribuir uniformemente
  const numChunks = Math.ceil(totalRequests / maxConcurrency);
  return Math.ceil(totalRequests / numChunks);
}
