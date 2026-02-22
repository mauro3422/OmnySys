import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('file-watcher');

/**
 * Procesa cambios pendientes
 * Usa SmartBatchProcessor si está disponible
 */
export async function processPendingChanges() {
  if (!this.isRunning) {
    return;
  }
  
  // Si tenemos SmartBatchProcessor activo, usarlo
  if (this.batchProcessor && this.options.useSmartBatch) {
    await this._processWithBatchProcessor();
    return;
  }
  
  // Fallback al comportamiento original
  if (this.pendingChanges.size === 0) {
    return;
  }

  // Aplicar debounce: solo procesar cambios que pasaron el tiempo de debounce
  const now = Date.now();
  const readyToProcess = [];

  for (const [filePath, changeInfo] of this.pendingChanges) {
    if (now - changeInfo.timestamp >= this.options.debounceMs) {
      readyToProcess.push({ filePath, ...changeInfo });
    }
  }

  if (readyToProcess.length === 0) {
    return;
  }

  // Limitar concurrencia
  const toProcess = readyToProcess.slice(0, this.options.maxConcurrent);

  if (this.options.verbose) {
    logger.info(`Processing ${toProcess.length} changes (${this.pendingChanges.size} pending)`);
  }

  // Procesar en paralelo
  await Promise.all(toProcess.map(change => this.processChange(change)));

  // Limpiar procesados de pendientes
  for (const change of toProcess) {
    this.pendingChanges.delete(change.filePath);
  }
}

/**
 * Procesa un cambio individual
 */
export async function processChange(change) {
  const { filePath, type, fullPath } = change;

  // Evitar procesar el mismo archivo concurrentemente
  if (this.processingFiles.has(filePath)) {
    if (this.options.verbose) {
      logger.debug(`${filePath} - already processing`);
    }
    return;
  }

  this.processingFiles.add(filePath);

  try {
    switch (type) {
      case 'created':
        await this.handleFileCreated(filePath, fullPath);
        break;
      case 'modified':
        await this.handleFileModified(filePath, fullPath);
        break;
      case 'deleted':
        await this.handleFileDeleted(filePath);
        break;
      default:
        logger.warn(`Unknown change type: ${type}`);
    }

    this.stats.processedChanges++;
    this.stats.lastProcessedAt = new Date().toISOString();
  } catch (error) {
    logger.error(`Error processing ${filePath}:`, error);
    this.stats.failedChanges++;
    this.emit('change:error', { filePath, error: error.message });
  } finally {
    this.processingFiles.delete(filePath);
  }
}
