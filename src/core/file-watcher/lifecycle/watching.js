import path from 'path';
import { watch } from 'fs';
import { access, stat } from 'fs/promises';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('file-watcher');
const STARTUP_NOISE_WINDOW_MS = 1500;

/**
 * Inicia el watching del filesystem usando fs.watch
 * Detecta cambios automaticamente sin depender de notificaciones externas
 */
export function startWatching() {
  if (this.fsWatcher) {
    logger.warn('FileWatcher already watching');
    return;
  }

  try {
    this.watcherStartedAt = Date.now();

    // Usar fs.watch para monitorear recursivamente
    this.fsWatcher = watch(
      this.rootPath,
      { recursive: true },
      async (eventType, filename) => {
        // Ignorar si no hay filename o esta vacio
        if (!filename) return;

        // Windows puede emitir bursts espurios al adjuntar el watcher.
        if (Date.now() - this.watcherStartedAt < STARTUP_NOISE_WINDOW_MS) {
          this.startupNoiseSuppressed = (this.startupNoiseSuppressed || 0) + 1;
          if (this.options.verbose) {
            logger.debug(`Ignoring startup watcher noise: ${filename}`);
          }
          return;
        }

        // Convertir a path relativo
        const fullPath = path.join(this.rootPath, filename);

        // Determinar tipo de cambio
        // 'rename' = archivo creado o eliminado (hay que verificar si existe)
        // 'change' = archivo modificado
        let changeType;
        if (eventType === 'rename') {
          try {
            await access(fullPath);
            changeType = 'created';
          } catch {
            changeType = 'deleted';
          }

          // Para archivos creados, verificar si es modificacion (ya existia)
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
      logger.info('Watching filesystem for changes...');
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
 * Llama a esta funcion cuando detectes un cambio (fs.watch, etc.)
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

  if (changeType === 'modified') {
    try {
      const currentStats = await stat(filePath);
      const previousStats = this.fileStats?.get(relativePath);

      if (
        previousStats &&
        previousStats.mtimeMs === currentStats.mtimeMs &&
        previousStats.size === currentStats.size
      ) {
        if (this.options.verbose) {
          logger.debug(`[SKIP] ${relativePath} - file stats unchanged`);
        }
        return;
      }

      const nextHash = await this._calculateContentHash(filePath);
      const previousHash = this.fileHashes?.get(relativePath);

      if (nextHash && previousHash && nextHash === previousHash) {
        this.fileStats?.set(relativePath, {
          mtimeMs: currentStats.mtimeMs,
          size: currentStats.size
        });
        if (this.options.verbose) {
          logger.debug(`[SKIP] ${relativePath} - content unchanged before queue`);
        }
        return;
      }
    } catch {
      // Si el archivo desaparece en medio del evento, el lifecycle lo resolvera.
    }
  }

  // Agregar a pendientes con timestamp
  const timestamp = Date.now();
  const changeInfo = {
    type: changeType,
    timestamp,
    fullPath: filePath
  };

  this.pendingChanges.set(relativePath, changeInfo);

  // Tambien registrar en SmartBatchProcessor si esta activo
  if (this.batchProcessor && this.options.useSmartBatch) {
    this.batchProcessor.addChange(relativePath, changeInfo);
  }

  this.stats.totalChanges++;

  if (this.options.verbose) {
    logger.debug(`Queued: ${relativePath} (${changeType})`);
  }

  this.emit('change:queued', { filePath: relativePath, type: changeType });
}
