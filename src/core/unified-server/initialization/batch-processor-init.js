/**
 * @fileoverview batch-processor-init.js
 * 
 * Inicialización del Batch Processor
 * 
 * @module unified-server/initialization/batch-processor-init
 */

import { BatchProcessor, calculatePriority } from '../../batch-processor/index.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:batch:processor:init');

/**
 * Inicializa Batch Processor para cambios concurrentes
 * @param {Object} context - { queue, wsManager, processNextFn }
 * @returns {Promise<BatchProcessor>}
 */
export async function initializeBatchProcessor(context) {
  const { queue, wsManager, processNextFn, isRunningRef, currentJobRef } = context;
  
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('STEP 5: Batch Processor Initialization');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const batchProcessor = new BatchProcessor({
    maxBatchSize: 20,
    batchTimeoutMs: 1000,
    maxConcurrent: 3,
    processChange: async (change) => {
      const priority = calculatePriority(change.filePath, change.changeType);
      const position = queue.enqueue(change.filePath, priority);
      
      logger.info(`📥 BatchProcessor → Queue: ${path.basename(change.filePath)} [${priority}] at position ${position}`);
      
      // Iniciar procesamiento si estamos idle
      if (!currentJobRef.current && isRunningRef.current) {
        processNextFn();
      }
      
      // Notificar a clientes WebSocket
      wsManager?.broadcast({
        type: 'file:queued',
        filePath: change.filePath,
        changeType: change.changeType,
        priority,
        position,
        timestamp: Date.now()
      });
    }
  });

  // Escuchar eventos del batch processor
  batchProcessor.on('batch:completed', (batch) => {
    logger.info(`✅ Batch ${batch.id} completed: ${batch.changes.size} changes processed`);
    
    wsManager?.broadcast({
      type: 'batch:completed',
      batchId: batch.id,
      stats: batch.getStats(),
      timestamp: Date.now()
    });
  });

  batchProcessor.on('batch:failed', (batch, error) => {
    logger.error(`❌ Batch ${batch.id} failed:`, error.message);
    
    wsManager?.broadcast({
      type: 'batch:failed',
      batchId: batch.id,
      error: error.message,
      timestamp: Date.now()
    });
  });

  batchProcessor.start();
  logger.info('  ✓ Batch Processor ready (connected to AnalysisQueue)\n');
  
  return batchProcessor;
}
