import path from 'path';
import { watch } from 'fs';
import { access } from 'fs/promises';
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
        await this.notifyChange(fullPath, changeType, {
          origin: 'filesystem',
          detector: 'fs.watch',
          transport: 'filesystem-watch'
        });
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
export async function notifyChange(filePath, changeType = 'modified', metadata = {}) {
  const relativePath = path.relative(this.rootPath, filePath).replace(/\\/g, '/');
  const surface = this.classifyWatcherSurface(relativePath);
  if (!surface.relevant) {
    return;
  }

  const changeInfo = this.buildWatcherChangeInfo({
    filePath: relativePath,
    fullPath: filePath,
    changeType,
    metadata,
    surface
  });

  this.recordWatcherOrigin(this, changeInfo.origin);
  this.recordWatcherSurface(this, surface);

  if (!changeInfo.queueForAnalysis) {
    this.emitWatcherSurfaceChange(this, changeInfo);
    if (this.options.verbose) {
      logger.debug(`Observed surface: ${relativePath} (${changeType}, surface=${changeInfo.surfaceKind}, origin=${changeInfo.origin})`);
    }
    return;
  }

  if (changeType === 'modified') {
    const skipResult = await this.shouldSkipModifiedWatcherChange(this, filePath, relativePath, {
      verbose: this.options.verbose
    });

    if (skipResult.skip) {
      if (this.options.verbose) {
        logger.debug(`[SKIP] ${relativePath} - ${skipResult.reason}`);
      }
      return;
    }
  }

  this.queueWatcherChange(this, relativePath, changeInfo);

  if (this.options.verbose) {
    logger.debug(`Queued: ${relativePath} (${changeType}, surface=${changeInfo.surfaceKind}, origin=${changeInfo.origin})`);
  }

  this.emit('change:queued', {
    filePath: relativePath,
    type: changeType,
    origin: changeInfo.origin,
    actor: changeInfo.actor,
    detector: changeInfo.detector,
    source: changeInfo.source,
    surface: changeInfo.surfaceKind,
    scope: changeInfo.surfaceScope
  });
}
