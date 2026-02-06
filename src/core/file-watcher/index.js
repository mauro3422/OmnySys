import path from 'path';
import { EventEmitter } from 'events';

import * as lifecycle from './lifecycle.js';
import * as handlers from './handlers.js';
import * as analyze from './analyze.js';
import * as helpers from './helpers.js';

class FileWatcher extends EventEmitter {
  constructor(rootPath, options = {}) {
    super();
    this.rootPath = rootPath;
    this.dataPath = path.join(rootPath, '.omnysysdata');

    // Opciones
    this.options = {
      debounceMs: options.debounceMs || 500,      // Tiempo de espera para agrupar cambios
      batchDelayMs: options.batchDelayMs || 1000, // Tiempo entre batches
      maxConcurrent: options.maxConcurrent || 3,  // Máximo análisis concurrentes
      verbose: options.verbose || false,
      ...options
    };

    // Estado interno
    this.pendingChanges = new Map();   // Cambios pendientes: filePath -> { type, timestamp }
    this.processingFiles = new Set();  // Archivos actualmente en análisis
    this.fileHashes = new Map();       // Cache de hashes: filePath -> hash
    this.isRunning = false;
    this.processingInterval = null;

    // Estadísticas
    this.stats = {
      totalChanges: 0,
      processedChanges: 0,
      failedChanges: 0,
      lastProcessedAt: null
    };
  }
}

Object.assign(
  FileWatcher.prototype,
  lifecycle,
  handlers,
  analyze,
  helpers
);

export { FileWatcher };
export default FileWatcher;
