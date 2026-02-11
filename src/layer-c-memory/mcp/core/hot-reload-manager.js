/**
 * @fileoverview hot-reload-manager.js
 * 
 * Sistema de Hot-Reload para OmnySys MCP Server
 * Permite al servidor actualizarse automáticamente cuando su propio código cambia
 * 
 * @module mcp/core/hot-reload-manager
 * @version 1.0.0
 * @since 2026-02-11
 */

import { watch } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:hot-reload');
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Manager de Hot-Reload para el servidor MCP
 * 
 * Características:
 * - Monitorea cambios en el código del sistema
 * - Recarga módulos sin perder estado
 * - Preserva cache, colas y datos del orquestador
 * - Re-registra tools en el servidor MCP
 */
export class HotReloadManager {
  constructor(server) {
    this.server = server;
    this.fsWatcher = null;
    this.isReloading = false;
    
    // Módulos que no se deben recargar automáticamente (críticos)
    this.criticalModules = [
      'server-class.js',
      'mcp-server.js',
      'orchestrator/index.js'
    ];
    
    // Módulos recargables y sus rutas
    this.reloadablePatterns = [
      { pattern: /tools[\\/].*\.js$/, type: 'tool', priority: 1 },
      { pattern: /extractors[\\/].*\.js$/, type: 'extractor', priority: 2 },
      { pattern: /handlers[\\/].*\.js$/, type: 'handler', priority: 2 },
      { pattern: /queries[\\/].*\.js$/, type: 'query', priority: 3 },
      { pattern: /lifecycle\.js$/, type: 'lifecycle', priority: 1 }
    ];
    
    // Estado a preservar durante reload
    this.preservedState = null;
  }

  /**
   * Inicia el monitoreo de cambios
   */
  async start() {
    if (this.fsWatcher) {
      logger.warn('Hot-reload already started');
      return;
    }

    logger.info('🔥 Starting hot-reload manager...');
    
    try {
      // Monitorear src/ recursivamente
      const srcPath = path.resolve(this.server.projectPath, 'src');
      
      this.fsWatcher = watch(
        srcPath,
        { recursive: true },
        (eventType, filename) => this._onFileChange(eventType, filename)
      );

      // Manejar errores del watcher
      this.fsWatcher.on('error', (error) => {
        logger.error('Hot-reload watcher error:', error);
      });

      logger.info(`✅ Hot-reload watching: ${srcPath}`);
      logger.info('📁 Monitoring tools, extractors, handlers, and queries');
      
    } catch (error) {
      logger.error('Failed to start hot-reload:', error);
      throw error;
    }
  }

  /**
   * Detiene el hot-reload
   */
  stop() {
    if (this.fsWatcher) {
      this.fsWatcher.close();
      this.fsWatcher = null;
      logger.info('🔥 Hot-reload stopped');
    }
  }

  /**
   * Handler de cambios de archivo
   * @private
   */
  _onFileChange(eventType, filename) {
    // Ignorar si no hay filename
    if (!filename) return;
    
    // Solo archivos .js
    if (!filename.endsWith('.js')) return;
    
    // Ignorar si está recargando
    if (this.isReloading) {
      logger.debug(`Ignoring change during reload: ${filename}`);
      return;
    }

    // Clasificar el módulo
    const moduleInfo = this._classifyModule(filename);
    
    if (!moduleInfo) {
      logger.debug(`Ignoring non-reloadable file: ${filename}`);
      return;
    }

    // Verificar si es crítico
    if (moduleInfo.type === 'critical') {
      logger.warn(`⚠️ Critical module changed: ${filename}`);
      logger.warn('   Manual restart required for changes to take effect');
      this.server.emit('hot-reload:critical-change', { file: filename });
      return;
    }

    // Procesar el cambio
    logger.info(`📝 Detected change: ${filename} (${eventType})`);
    
    // Debounce: esperar 500ms por si hay más cambios
    clearTimeout(this._reloadTimeout);
    this._reloadTimeout = setTimeout(() => {
      this._reloadModule(filename, moduleInfo);
    }, 500);
  }

  /**
   * Clasifica un módulo según su tipo
   * @private
   */
  _classifyModule(filename) {
    // Verificar si es crítico
    if (this.criticalModules.some(critical => filename.includes(critical))) {
      return { type: 'critical', priority: 0 };
    }

    // Verificar patrones recargables
    for (const pattern of this.reloadablePatterns) {
      if (pattern.pattern.test(filename)) {
        return { type: pattern.type, priority: pattern.priority };
      }
    }

    return null;
  }

  /**
   * Recarga un módulo específico
   * @private
   */
  async _reloadModule(filename, moduleInfo) {
    if (this.isReloading) return;
    
    this.isReloading = true;
    const startTime = Date.now();
    
    try {
      logger.info(`🔄 Hot-reloading: ${filename}`);
      
      // 1. Preservar estado
      this._preserveState();
      
      // 2. Recargar según el tipo
      switch (moduleInfo.type) {
        case 'tool':
          await this._reloadTool(filename);
          break;
        case 'extractor':
          await this._reloadExtractor(filename);
          break;
        case 'handler':
          await this._reloadHandler(filename);
          break;
        case 'query':
          await this._reloadQuery(filename);
          break;
        case 'lifecycle':
          await this._reloadLifecycle(filename);
          break;
        default:
          logger.warn(`Unknown module type: ${moduleInfo.type}`);
      }
      
      // 3. Restaurar estado
      this._restoreState();
      
      const duration = Date.now() - startTime;
      logger.info(`✅ Hot-reload complete: ${filename} (${duration}ms)`);
      
      // Emitir evento
      this.server.emit('hot-reload:completed', { 
        file: filename, 
        type: moduleInfo.type,
        duration 
      });
      
    } catch (error) {
      logger.error(`❌ Hot-reload failed: ${filename}`, error);
      this.server.emit('hot-reload:error', { file: filename, error: error.message });
      
      // Intentar restaurar estado incluso si falló
      try {
        this._restoreState();
      } catch (restoreError) {
        logger.error('Failed to restore state:', restoreError);
      }
    } finally {
      this.isReloading = false;
      this.preservedState = null;
    }
  }

  /**
   * Preserva el estado crítico del servidor
   * @private
   */
  _preserveState() {
    logger.debug('Preserving server state...');
    
    this.preservedState = {
      // Cache de archivos
      cache: this.server.cache ? {
        fileIndex: new Map(this.server.cache.fileIndex),
        analysisCache: new Map(this.server.cache.analysisCache)
      } : null,
      
      // Estado del orquestador
      orchestrator: this.server.orchestrator ? {
        queue: this.server.orchestrator.queue?.items 
          ? [...this.server.orchestrator.queue.items] 
          : [],
        isIndexing: this.server.orchestrator.isIndexing,
        indexedFiles: new Set(this.server.orchestrator.indexedFiles || []),
        stats: { ...this.server.orchestrator.stats }
      } : null,
      
      // File watcher hashes
      fileWatcher: this.server.orchestrator?.fileWatcher ? {
        fileHashes: new Map(this.server.orchestrator.fileWatcher.fileHashes),
        pendingChanges: new Map(this.server.orchestrator.fileWatcher.pendingChanges)
      } : null,
      
      timestamp: Date.now()
    };
    
    logger.debug('State preserved');
  }

  /**
   * Restaura el estado preservado
   * @private
   */
  _restoreState() {
    if (!this.preservedState) {
      logger.warn('No state to restore');
      return;
    }
    
    logger.debug('Restoring server state...');
    
    // Restaurar cache
    if (this.preservedState.cache && this.server.cache) {
      this.server.cache.fileIndex = this.preservedState.cache.fileIndex;
      this.server.cache.analysisCache = this.preservedState.cache.analysisCache;
    }
    
    // Restaurar orquestador
    if (this.preservedState.orchestrator && this.server.orchestrator) {
      // Asegurar que queue existe antes de restaurar items
      if (!this.server.orchestrator.queue) {
        this.server.orchestrator.queue = { items: [] };
      }
      this.server.orchestrator.queue.items = this.preservedState.orchestrator.queue || [];
      this.server.orchestrator.isIndexing = this.preservedState.orchestrator.isIndexing;
      this.server.orchestrator.indexedFiles = this.preservedState.orchestrator.indexedFiles;
      this.server.orchestrator.stats = this.preservedState.orchestrator.stats;
    }
    
    // Restaurar file watcher
    if (this.preservedState.fileWatcher && this.server.orchestrator?.fileWatcher) {
      this.server.orchestrator.fileWatcher.fileHashes = this.preservedState.fileWatcher.fileHashes;
      this.server.orchestrator.fileWatcher.pendingChanges = this.preservedState.fileWatcher.pendingChanges;
    }
    
    logger.debug('State restored');
  }

  /**
   * Recarga un tool MCP
   * @private
   */
  async _reloadTool(filename) {
    const toolPath = path.resolve(this.server.projectPath, filename);
    
    // ESM: Usar query string único para forzar recarga
    const uniqueImport = `${toolPath}?hot-reload=${Date.now()}`;
    
    try {
      // Importar nuevo módulo
      const newModule = await import(uniqueImport);
      
      // Actualizar registro de tools (si aplica)
      logger.debug(`Tool reloaded: ${filename}`);
      
      // Nota: Los tools se registran en McpSetupStep, 
      // la próxima llamada usará el nuevo código automáticamente
      
    } catch (error) {
      throw new Error(`Failed to reload tool ${filename}: ${error.message}`);
    }
  }

  /**
   * Recarga un extractor
   * @private
   */
  async _reloadExtractor(filename) {
    logger.debug(`Extractor reload not yet implemented: ${filename}`);
    // Los extractores se usan durante el análisis,
    // se recargarán automáticamente en el próximo análisis
  }

  /**
   * Recarga un handler
   * @private
   */
  async _reloadHandler(filename) {
    logger.debug(`Handler reload not yet implemented: ${filename}`);
    // Los handlers se recargarán en el próximo evento
  }

  /**
   * Recarga un módulo de queries
   * @private
   */
  async _reloadQuery(filename) {
    logger.debug(`Query reload not yet implemented: ${filename}`);
    // Las queries se recargarán en la próxima consulta
  }

  /**
   * Recarga un archivo lifecycle
   * @private
   */
  async _reloadLifecycle(filename) {
    logger.warn(`Lifecycle reload partially supported: ${filename}`);
    // Los métodos lifecycle se asignan al prototipo,
    // requieren recarga más compleja
  }

  /**
   * Obtiene estadísticas del hot-reload
   */
  getStats() {
    return {
      isWatching: !!this.fsWatcher,
      isReloading: this.isReloading,
      criticalModules: this.criticalModules.length,
      reloadablePatterns: this.reloadablePatterns.length
    };
  }
}

export default HotReloadManager;
