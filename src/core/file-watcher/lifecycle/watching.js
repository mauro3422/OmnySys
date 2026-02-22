import path from 'path';
import { watch } from 'fs';
import { access } from 'fs/promises';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('file-watcher');

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
      async (eventType, filename) => {
        // Ignorar si no hay filename o está vacío
        if (!filename) return;
        
        // Convertir a path relativo
        const fullPath = path.join(this.rootPath, filename);
        
        // Determinar tipo de cambio
        // 'rename' = archivo creado o eliminado (hay que verificar si existe)
        // 'change' = archivo modificado
        let changeType;
        if (eventType === 'rename') {
          // fs.watch reporta 'rename' tanto para crear como eliminar
          // Verificamos si el archivo existe para determinar cuál ocurrió
          try {
            await access(fullPath);
            changeType = 'created';  // Archivo existe → fue creado
          } catch {
            changeType = 'deleted';  // Archivo no existe → fue eliminado
          }
          
          // Para archivos creados, verificar si es modificación (ya existía)
          if (changeType === 'created' && this.fileHashes.has(filename)) {
            changeType = 'modified';
          }
        } else {
          changeType = 'modified';
        }
        
        // Notificar el cambio
        await this.notifyChange(fullPath, changeType);
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
