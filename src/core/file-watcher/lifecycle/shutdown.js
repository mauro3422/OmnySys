import { createLogger } from '../../../utils/logger.js';
import { closeIfPresent } from '../../../shared/lifecycle/shutdown-helpers.js';

const logger = createLogger('file-watcher');

/**
 * Detiene el file watcher
 */
export async function stop() {
  this.isRunning = false;
  const logVerbose = (message) => {
    if (this.options.verbose) {
      logger.info(message);
    }
  };
  try {
    // Detener chokidar watcher
    if (this.fsWatcher) {
      if (typeof this.fsWatcher.close === 'function') {
        await this.fsWatcher.close();
      }
      this.fsWatcher = null;

      logVerbose('Chokidar filesystem watcher stopped');
    }

    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    if (this.orphanCheckInterval) {
      clearInterval(this.orphanCheckInterval);
      this.orphanCheckInterval = null;
    }

    // Procesar últimos cambios pendientes si hay batch processor
    if (this.batchProcessor && this.options.useSmartBatch) {
      const pendingCount = this.batchProcessor.getBufferedCount();
      if (pendingCount > 0) {
        logVerbose(`Processing ${pendingCount} pending changes before stop...`);
        await this._processWithBatchProcessor();
      }
      
      // Limpiar batch processor
      await closeIfPresent(this.batchProcessor, 'resetBuffer');
    }

    // Limpiar incremental analyzer
    if (this.incrementalAnalyzer) {
      await closeIfPresent(this.incrementalAnalyzer, 'clear');
    }

    // Esperar a que terminen procesos pendientes
    if (this.processingFiles.size > 0) {
      logVerbose(`Waiting for ${this.processingFiles.size} analyses to complete...`);

      const maxWait = 10000; // 10 segundos máximo
      const start = Date.now();

      while (this.processingFiles.size > 0 && Date.now() - start < maxWait) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  } finally {
    this.emit('stopped');

    logVerbose('FileWatcher stopped');
  }
}
