import path from 'path';
import { stat } from 'fs/promises';
import chokidar from 'chokidar';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('file-watcher');
const STARTUP_NOISE_WINDOW_MS = 1500;

/**
 * Inicia el watching del filesystem usando chokidar (cross-platform reliable)
 * Detecta cambios automaticamente sin depender de notificaciones externas
 */
export function startWatching() {
  if (this.fsWatcher) {
    logger.warn('FileWatcher already watching');
    return;
  }

  try {
    this.watcherStartedAt = Date.now();

    // Detectar platform para ajustes específicos
    const isWindows = process.platform === 'win32';

    // Usar chokidar para monitoreo recursivo confiable en todas las plataformas
    this.fsWatcher = chokidar.watch(this.rootPath, {
      ignored: [
        /[/\\]node_modules[/\\]/,
        /[/\\]\.git[/\\]/,
        /[/\\]__pycache__[/\\]/,
        /[/\\]\.omnysysdata[/\\]/,
        /[/\\]dist[/\\]/,
        /[/\\]coverage[/\\]/,
        /\.log$/,
        /\.tmp$/
      ],
      ignoreInitial: true,
      persistent: true,
      awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 50
      },
      // En Windows, usar polling para detectar deletes confiablemente
      usePolling: isWindows,
      interval: isWindows ? 1000 : 0,
      binaryInterval: isWindows ? 2000 : 0,
      depth: 99,
      ignorePermissionErrors: true
    });

    // Evento: archivo creado
    this.fsWatcher.on('add', async (fullPath) => {
      if (Date.now() - this.watcherStartedAt < STARTUP_NOISE_WINDOW_MS) return;
      await this.notifyChange(fullPath, 'created', {
        origin: 'filesystem',
        detector: 'chokidar',
        transport: 'filesystem-watch'
      });
    });

    // Evento: archivo modificado
    this.fsWatcher.on('change', async (fullPath) => {
      if (Date.now() - this.watcherStartedAt < STARTUP_NOISE_WINDOW_MS) return;
      await this.notifyChange(fullPath, 'modified', {
        origin: 'filesystem',
        detector: 'chokidar',
        transport: 'filesystem-watch'
      });
    });

    // Evento: archivo eliminado
    this.fsWatcher.on('unlink', async (fullPath) => {
      if (Date.now() - this.watcherStartedAt < STARTUP_NOISE_WINDOW_MS) return;
      await this.notifyChange(fullPath, 'deleted', {
        origin: 'filesystem',
        detector: 'chokidar',
        transport: 'filesystem-watch'
      });
    });

    // Evento: directorio creado
    this.fsWatcher.on('addDir', (fullPath) => {
      if (this.options.verbose) {
        logger.debug(`Directory created: ${fullPath}`);
      }
    });

    // Evento: directorio eliminado
    this.fsWatcher.on('unlinkDir', (fullPath) => {
      if (this.options.verbose) {
        logger.debug(`Directory removed: ${fullPath}`);
      }
    });

    // Manejar errores del watcher
    this.fsWatcher.on('error', (error) => {
      logger.error('FileWatcher error:', error);
      this.emit('error', error);
    });

    this.fsWatcher.on('ready', () => {
      if (this.options.verbose) {
        logger.info('Chokidar watcher ready, watching for changes...');
      }
      this.emit('watching:start');
    });
  } catch (error) {
    logger.error('Failed to start file watching:', error);
    this.emit('error', error);
  }
}

/**
 * Detiene el watching del filesystem
 */
export function stopWatching() {
  if (this.fsWatcher) {
    if (typeof this.fsWatcher.close === 'function') {
      this.fsWatcher.close();
    }
    this.fsWatcher = null;
    if (this.options.verbose) {
      logger.info('File watcher stopped');
    }
  }
}

/**
 * Notifica un cambio en un archivo
 * Llama a esta funcion cuando detectes un cambio (fs.watch, etc.)
 */
export async function notifyChange(filePath, changeType = 'modified', metadata = {}) {
  // Para archivos eliminados, no hacer stat (el archivo ya no existe)
  if (changeType === 'deleted') {
    const relativePath = path.relative(this.rootPath, filePath).replace(/\\/g, '/');
    const surface = this.classifyWatcherSurface(relativePath);
    if (!surface.relevant) {
      return;
    }

    const changeInfo = this.buildWatcherChangeInfo({
      filePath: relativePath,
      fullPath: filePath,
      changeType: 'deleted',
      metadata,
      surface
    });

    this.recordWatcherOrigin(this, changeInfo.origin);
    this.recordWatcherSurface(this, surface);
    this.queueWatcherChange(this, relativePath, changeInfo);
    logger.info(`[DELETE QUEUED] ${relativePath}`);
    return;
  }

  // Para archivos existentes, verificar que existan y no sean directorios
  const targetStats = await stat(filePath).catch(() => null);
  if (!targetStats || targetStats.isDirectory()) {
    return;
  }

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
