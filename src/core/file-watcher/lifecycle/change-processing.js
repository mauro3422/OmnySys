import { createLogger } from '../../../utils/logger.js';
import { persistWatcherIssue, clearWatcherIssue } from '../watcher-issue-persistence.js';

const logger = createLogger('file-watcher');

async function persistWatcherRuntimeError(projectPath, filePath, error, context = {}) {
  const message = `Runtime error while processing change: ${error?.message || String(error)}`;
  return persistWatcherIssue(projectPath, filePath, 'watcher_runtime_error', 'high', message, context);
}

async function clearWatcherRuntimeError(projectPath, filePath) {
  return clearWatcherIssue(projectPath, filePath, 'watcher_runtime_error');
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

    // 🧠 SEMANTIC INVALIDATION: Si cambia un detector o regla, refrescar patrones globalmente
    if (this._isPatternLogicFile(filePath)) {
      this._triggerGlobalPatternRefresh();
    }

    await clearWatcherRuntimeError(this.rootPath, filePath);
    this.stats.processedChanges++;
    this.stats.lastProcessedAt = new Date().toISOString();
  } catch (error) {
    logger.error(`Error processing ${filePath}:`, error);
    await persistWatcherRuntimeError(this.rootPath, filePath, error, {
      changeType: type
    });
    this.stats.failedChanges++;
    this.emit('change:error', { filePath, error: error.message });
  } finally {
    this.processingFiles.delete(filePath);
  }
}

/**
 * Verifica si un archivo contiene lógica de detección de patrones
 * @private
 */
export function _isPatternLogicFile(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  return (
    normalized.includes('src/layer-a-static/pattern-detection/') ||
    normalized.includes('src/layer-a-static/race-detector/') ||
    normalized.includes('src/layer-a-static/parser/extractors/sql-analyzer')
  );
}

/**
 * Lanza un refresh global de patrones en segundo plano
 * @private
 */
export async function _triggerGlobalPatternRefresh() {
  logger.info('🧠 Detector logic change detected. Triggering GLOBAL pattern refresh...');

  try {
    // Importación dinámica para evitar dependencias circulares pesadas en el arranque
    const { refreshPatterns } = await import('../../../layer-a-static/indexer.js');

    // Ejecutar en segundo plano (sin await para no bloquear el watcher)
    refreshPatterns(this.rootPath, this.options.verbose).catch(err => {
      logger.error('❌ Background pattern refresh failed:', err);
    });
  } catch (error) {
    logger.error('❌ Failed to load refreshPatterns for semantic invalidation:', error);
  }
}
