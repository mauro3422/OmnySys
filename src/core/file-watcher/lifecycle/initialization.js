import path from 'path';
import { getProjectMetadata } from '../../../layer-c-memory/query/apis/project-api.js';
import { createLogger } from '../../../utils/logger.js';
import { SmartBatchProcessor } from '../batch-processor/index.js';
import { IncrementalAnalyzer } from '../incremental-analyzer.js';

const logger = createLogger('file-watcher');

/**
 * Inicializa el file watcher
 */
export async function initialize() {
  if (this.options.verbose) {
    logger.info('FileWatcher initializing...');
  }

  // Cargar estado actual del proyecto (hashes para dedup)
  await this.loadCurrentState();

  this.isRunning = true;

  if (this.options.verbose) {
    logger.info('FileWatcher ready', {
      debounce: this.options.debounceMs,
      maxConcurrent: this.options.maxConcurrent
    });
  }

  // Iniciar watching del filesystem
  this.startWatching();

  this.emit('ready');
}

/**
 * Carga el estado actual del proyecto
 */
export async function loadCurrentState() {
  try {
    const metadata = await getProjectMetadata(this.rootPath);

    // Cargar hashes de archivos existentes con yield cada 50 archivos
    const entries = Object.entries(metadata.fileIndex || {});
    let count = 0;

    for (const [filePath, fileInfo] of entries) {
      const fullPath = path.join(this.rootPath, filePath);
      const hash = await this._calculateContentHash(fullPath);
      if (hash) {
        this.fileHashes.set(filePath, hash);
      }

      // Yield al event loop cada 50 archivos para no bloquear
      if (++count % 50 === 0) {
        await new Promise(resolve => setImmediate(resolve));
      }
    }

    if (this.options.verbose) {
      logger.info(`Tracking ${this.fileHashes.size} files`);
    }
  } catch (error) {
    if (this.options.verbose) {
      logger.info('No existing analysis found, starting fresh');
    }
  }
}
