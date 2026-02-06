/**
 * @fileoverview batch-processor-init.js
 * 
 * Inicialización del Batch Processor
 * 
 * @module unified-server/initialization/batch-processor-init
 */

import path from 'path';
import { BatchProcessor } from '../../batch-processor/index.js';

/**
 * Calcula prioridad basada en el tipo de cambio
 * @param {Object} change - Cambio detectado
 * @returns {string} - Prioridad (critical, high, medium, low)
 */
export function calculateChangePriority(change) {
  if (change.changeType === 'deleted') return 'critical';
  if (change.changeType === 'created') return 'high';
  
  if (change.priority >= 4) return 'critical';
  if (change.priority === 3) return 'high';
  if (change.priority === 2) return 'medium';
  return 'low';
}

/**
 * Inicializa Batch Processor para cambios concurrentes
 * @param {Object} context - { queue, wsManager, processNextFn }
 * @returns {Promise<BatchProcessor>}
 */
export async function initializeBatchProcessor(context) {
  const { queue, wsManager, processNextFn, isRunningRef, currentJobRef } = context;
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 5: Batch Processor Initialization');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const batchProcessor = new BatchProcessor({
    maxBatchSize: 20,
    batchTimeoutMs: 1000,
    maxConcurrent: 3,
    processChange: async (change) => {
      const priority = calculateChangePriority(change);
      const position = queue.enqueue(change.filePath, priority);
      
      console.log(`📥 BatchProcessor → Queue: ${path.basename(change.filePath)} [${priority}] at position ${position}`);
      
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
    console.log(`✅ Batch ${batch.id} completed: ${batch.changes.size} changes processed`);
    
    wsManager?.broadcast({
      type: 'batch:completed',
      batchId: batch.id,
      stats: batch.getStats(),
      timestamp: Date.now()
    });
  });

  batchProcessor.on('batch:failed', (batch, error) => {
    console.error(`❌ Batch ${batch.id} failed:`, error.message);
    
    wsManager?.broadcast({
      type: 'batch:failed',
      batchId: batch.id,
      error: error.message,
      timestamp: Date.now()
    });
  });

  batchProcessor.start();
  console.log('  ✓ Batch Processor ready (connected to AnalysisQueue)\n');
  
  return batchProcessor;
}
