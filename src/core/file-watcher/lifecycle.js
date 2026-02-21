import path from 'path';
import { watch } from 'fs';

import { getProjectMetadata } from '../../layer-c-memory/query/apis/project-api.js';
import { createLogger } from '../../utils/logger.js';
import { SmartBatchProcessor } from './batch-processor/index.js';
import { IncrementalAnalyzer } from './incremental-analyzer.js';

const logger = createLogger('file-watcher');

/**
 * Inicializa el file watcher
 */
export async function initialize() {
  if (this.options.verbose) {
    logger.info('FileWatcher initializing...');
  }

  // Inicializar SmartBatchProcessor si está habilitado
  if (this.options.useSmartBatch) {
    this.batchProcessor = new SmartBatchProcessor({
      debounceMs: this.options.debounceMs,
      maxConcurrent: this.options.maxConcurrent,
      verbose: this.options.verbose
    });
    
    // Configurar callback para procesar batches
    this.batchProcessor.onProcessBatch = async (changes) => {
      await this._processBatchChanges(changes);
    };
    
    if (this.options.verbose) {
      logger.info('✅ SmartBatchProcessor initialized');
    }
  }
  
  // Inicializar IncrementalAnalyzer
  this.incrementalAnalyzer = new IncrementalAnalyzer(
    this.cacheInvalidator?.cache,
    this.rootPath
  );

  // Cargar estado actual del proyecto
  await this.loadCurrentState();

  // Iniciar procesamiento periódico
  this.isRunning = true;
  this.processingInterval = setInterval(() => this.processPendingChanges(), this.options.batchDelayMs);

  if (this.options.verbose) {
    logger.info('FileWatcher ready', {
      debounce: this.options.debounceMs,
      batchDelay: this.options.batchDelayMs,
      maxConcurrent: this.options.maxConcurrent,
      smartBatch: this.options.useSmartBatch
    });
  }

  // Iniciar watching del filesystem
  this.startWatching();

  this.emit('ready');
}

/**
 * Inicia el watching del filesystem usando fs.watch
 * Detecta cambios automáticamente sin depender de notificaciones externas
 */
export function startWatching() {
  if (this.fsWatcher) {
    logger.warn('FileWatcher already watching');
    return;
  }

  try {
    // Usar fs.watch para monitorear recursivamente
    this.fsWatcher = watch(
      this.rootPath,
      { recursive: true },
      (eventType, filename) => {
        // Ignorar si no hay filename o está vacío
        if (!filename) return;
        
        // Convertir a path relativo
        const fullPath = path.join(this.rootPath, filename);
        
        // Determinar tipo de cambio
        // 'rename' = archivo creado o eliminado
        // 'change' = archivo modificado
        const changeType = eventType === 'rename' 
          ? 'created'  // fs.watch reporta 'rename' para nuevos archivos
          : 'modified';
        
        // Notificar el cambio
        this.notifyChange(fullPath, changeType);
      }
    );

    if (this.options.verbose) {
      logger.info('🔍 Watching filesystem for changes...');
    }

    // Manejar errores del watcher
    this.fsWatcher.on('error', (error) => {
      logger.error('FileWatcher error:', error);
      this.emit('error', error);
    });

    this.emit('watching:start');

  } catch (error) {
    logger.error('Failed to start file watching:', error);
    this.emit('error', error);
  }
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

/**
 * Notifica un cambio en un archivo
 * Llama a esta función cuando detectes un cambio (fs.watch, etc.)
 */
export async function notifyChange(filePath, changeType = 'modified') {
  const relativePath = path.relative(this.rootPath, filePath).replace(/\\/g, '/');

  // Ignorar archivos que no son JS/TS
  if (!this.isRelevantFile(relativePath)) {
    return;
  }

  // Ignorar cambios en node_modules, .git, etc.
  if (this.shouldIgnore(relativePath)) {
    return;
  }

  // Agregar a pendientes con timestamp
  const timestamp = Date.now();
  const changeInfo = {
    type: changeType,
    timestamp,
    fullPath: filePath
  };
  
  this.pendingChanges.set(relativePath, changeInfo);
  
  // También registrar en SmartBatchProcessor si está activo
  if (this.batchProcessor && this.options.useSmartBatch) {
    this.batchProcessor.addChange(relativePath, changeInfo);
  }

  this.stats.totalChanges++;

  if (this.options.verbose) {
    logger.debug(`Queued: ${relativePath} (${changeType})`);
  }

  this.emit('change:queued', { filePath: relativePath, type: changeType });
}

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
 * Procesa cambios usando el SmartBatchProcessor
 */
export async function _processWithBatchProcessor() {
  // Agregar cambios pendientes al batch processor
  for (const [filePath, changeInfo] of this.pendingChanges) {
    this.batchProcessor.addChange(filePath, changeInfo);
    this.pendingChanges.delete(filePath);
  }
  
  // Verificar si hay cambios listos
  if (!this.batchProcessor.hasReadyChanges()) {
    return;
  }
  
  // Procesar batch
  const result = await this.batchProcessor.processBatch(
    async (change) => this.processChange(change)
  );
  
  // Actualizar estadísticas
  this.stats.batchesProcessed++;
  this.stats.avgBatchSize = this.batchProcessor.getStats().avgBatchSize;
  
  if (result.processed > 0 && this.options.verbose) {
    logger.info(`📦 Batch completado: ${result.processed} archivos procesados`);
  }
}

/**
 * Procesa un batch de cambios (usado por el SmartBatchProcessor)
 */
export async function _processBatchChanges(changes) {
  // Usar el analizador incremental si está disponible
  if (this.incrementalAnalyzer) {
    const result = await this.incrementalAnalyzer.processBatch(changes);
    
    // Emitir eventos por cada cambio procesado
    for (const changeResult of result.results) {
      if (changeResult.success) {
        this.emit(`file:${changeResult.changeType}`, { 
          filePath: changeResult.filePath,
          result: changeResult
        });
      }
    }
    
    return result;
  }
  
  // Fallback: procesar uno por uno
  for (const change of changes) {
    await this.processChange(change);
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
