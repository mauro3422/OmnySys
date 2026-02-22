/**
 * @fileoverview write-queue-utils.js
 * 
 * Barrel export para el sistema de cola de escritura.
 * Re-exporta WriteQueue y BatchWriter con singleton por defecto.
 * 
 * @module layer-c-memory/storage/atoms/write-queue-utils
 */

export { WriteQueue, getWriteQueue, resetWriteQueue } from './write-queue.js';
export { DebouncedBatchWriter, getBatchWriter, resetBatchWriter } from './debounced-batch-writer.js';
export { 
  gracefulWriteFile, 
  gracefulReadFile, 
  gracefulMkdir, 
  gracefulReaddir,
  writeJSON, 
  readJSON,
  getWriteStats,
  resetWriteStats 
} from './graceful-write.js';

import { getWriteQueue } from './write-queue.js';
import { getBatchWriter } from './debounced-batch-writer.js';

export function getSystemStatus() {
  const queue = getWriteQueue();
  const batch = getBatchWriter();
  
  return {
    queue: queue.status,
    batch: batch.status,
    timestamp: new Date().toISOString()
  };
}

export async function drainAll() {
  const batch = getBatchWriter();
  const queue = getWriteQueue();
  
  await batch.drain();
  await queue.onIdle();
}

export async function resetAll() {
  const { resetBatchWriter } = await import('./debounced-batch-writer.js');
  const { resetWriteQueue } = await import('./write-queue.js');
  
  resetBatchWriter();
  resetWriteQueue();
}
