import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('file-watcher');

/**
 * Detiene el file watcher
 */
export async function stop() {
  this.isRunning = false;

  // Detener fs.watch
  if (this.fsWatcher) {
    this.fsWatcher.close();
    this.fsWatcher = null;
    
    if (this.options.verbose) {
      logger.info('Filesystem watcher stopped');
    }
  }

  if (this.processingInterval) {
    clearInterval(this.processingInterval);
    this.processingInterval = null;
  }

  // Procesar últimos cambios pendientes si hay batch processor
  if (this.batchProcessor && this.options.useSmartBatch) {
    const pendingCount = this.batchProcessor.getBufferedCount();
    if (pendingCount > 0) {
      if (this.options.verbose) {
        logger.info(`Processing ${pendingCount} pending changes before stop...`);
      }
      await this._processWithBatchProcessor();
    }
    
    // Limpiar batch processor
    this.batchProcessor.clear();
  }
  
  // Limpiar incremental analyzer
  if (this.incrementalAnalyzer) {
    this.incrementalAnalyzer.clear();
  }

  // Esperar a que terminen procesos pendientes
  if (this.processingFiles.size > 0) {
    if (this.options.verbose) {
      logger.info(`Waiting for ${this.processingFiles.size} analyses to complete...`);
    }

    const maxWait = 10000; // 10 segundos máximo
    const start = Date.now();

    while (this.processingFiles.size > 0 && Date.now() - start < maxWait) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  this.emit('stopped');

  if (this.options.verbose) {
    logger.info('FileWatcher stopped');
  }
}
