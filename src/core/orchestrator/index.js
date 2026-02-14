import { EventEmitter } from 'events';
import path from 'path';
import { AnalysisQueue } from '../analysis-queue.js';
import { getDataPath } from '#config/paths.js';
import { getAtomicEditor } from '../atomic-editor/index.js';

import * as lifecycle from './lifecycle.js';
import * as queueing from './queueing.js';
import * as llmAnalysis from './llm-analysis.js';
import * as iterative from './iterative.js';
import * as issues from './issues.js';
import * as helpers from './helpers.js';

class Orchestrator extends EventEmitter {
  constructor(projectPath, options = {}) {
    super();
    this.projectPath = projectPath;
    this.OmnySysDataPath = getDataPath(projectPath, '');
    this.options = {
      enableFileWatcher: true,
      enableWebSocket: true,
      autoStartLLM: true,
      ports: {
        webSocket: 9997,
        ...options.ports
      },
      ...options
    };

    // Components
    this.queue = new AnalysisQueue();
    this.worker = null;
    this.stateManager = null;
    this.fileWatcher = null;
    this.batchProcessor = null;
    this.wsManager = null;
    this.cache = null;

    // State
    this.currentJob = null;
    this.isRunning = true;
    this.startTime = Date.now();
    this.stats = {
      totalAnalyzed: 0,
      totalQueued: 0,
      avgTime: 0
    };

    // Indexing state
    this.isIndexing = false;
    this.indexingProgress = 0;
    this.indexedFiles = new Set();

    // Iterative analysis state
    this.iteration = 0;
    this.maxIterations = 10;
    this.isIterating = false;
    this.iterativeQueue = [];

    // Tracking for completion
    this.totalFilesToAnalyze = 0;
    this.processedFiles = new Set();
    this.analysisCompleteEmitted = false;

    // Atomic Editor - Para ediciones seguras con vibración
    this.atomicEditor = getAtomicEditor(projectPath, this);
    this._setupAtomicEditor();
    
    // Cache Invalidator - Para invalidación síncrona de caché
    this.cacheInvalidator = null; // Se inicializa lazy
  }
  
  /**
   * Obtiene o inicializa el Cache Invalidator (lazy initialization)
   * @returns {Promise<CacheInvalidator>}
   */
  async _getCacheInvalidator() {
    if (!this.cacheInvalidator) {
      const { getCacheInvalidator } = await import('../cache-invalidator/index.js'); // Path is correct: orchestrator/ -> core/ -> cache-invalidator/
      this.cacheInvalidator = getCacheInvalidator(this.cache || { projectPath: this.projectPath });
    }
    return this.cacheInvalidator;
  }

  /**
   * Configura listeners del Atomic Editor
   */
  _setupAtomicEditor() {
    // Escuchar eventos de validación fallida
    this.atomicEditor.on('atom:validation:failed', (event) => {
      logger.error(`🚫 Atomic validation failed: ${event.file}`);
      logger.error(`   Error: ${event.error}`);
      
      // Notificar por WebSocket si está disponible
      this.wsManager?.broadcast({
        type: 'atomic:validation:failed',
        ...event,
        timestamp: Date.now()
      });
    });

    // Escuchar cambios atómicos exitosos
    this.atomicEditor.on('atom:modified', (event) => {
      logger.info(`✅ Atomic edit complete: ${event.file}`);
      
      // Notificar dependientes
      this.wsManager?.broadcast({
        type: 'atomic:modified',
        ...event,
        timestamp: Date.now()
      });
    });

    // Escuchar propagación de vibración
    this.atomicEditor.on('vibration:propagating', (event) => {
      logger.info(`📡 Vibration propagating from ${event.source}`);
      logger.info(`   Affects: ${event.affected.length} files`);
      
      // Actualizar caché de dependientes
      event.affected.forEach(file => {
        this._invalidateFileCache(file);
      });
    });
  }

  /**
   * Edita un archivo de forma atómica (valida, guarda, propaga)
   * 
   * @param {string} filePath - Ruta del archivo
   * @param {string} oldString - Texto a reemplazar
   * @param {string} newString - Texto nuevo
   * @returns {Promise<Object>} - Resultado de la edición
   */
  async atomicEdit(filePath, oldString, newString) {
    return await this.atomicEditor.edit(filePath, oldString, newString);
  }

  /**
   * Escribe un archivo nuevo de forma atómica
   * 
   * @param {string} filePath - Ruta del archivo
   * @param {string} content - Contenido
   * @returns {Promise<Object>} - Resultado
   */
  async atomicWrite(filePath, content) {
    return await this.atomicEditor.write(filePath, content);
  }

  /**
   * Maneja cambios de archivo desde el file watcher
   * o desde el atomic editor
   * 
   * @param {string} filePath - Archivo cambiado
   * @param {string} changeType - Tipo de cambio
   * @param {Object} options - Opciones
   */
  async handleFileChange(filePath, changeType, options = {}) {
    const { skipDebounce = false, priority = 'normal' } = options;
    
    logger.info(`📁 File change detected: ${filePath} (${changeType})`);
    
    // Invalidar caché
    await this._invalidateFileCache(filePath);
    
    // Agregar a cola de análisis
    if (changeType === 'modified' || changeType === 'created') {
      const queuePriority = priority === 'critical' ? 'critical' : 
                           changeType === 'created' ? 'high' : 'normal';
      
      this.queue.enqueue(filePath, queuePriority);
      
      // Procesar inmediatamente si es crítico o skipDebounce
      if (skipDebounce || priority === 'critical') {
        if (!this.currentJob && this.isRunning) {
          this._processNext();
        }
      }
    }
    
    // Broadcast por WebSocket
    this.wsManager?.broadcast({
      type: 'file:changed',
      filePath,
      changeType,
      priority,
      timestamp: Date.now()
    });
  }
}

Object.assign(
  Orchestrator.prototype,
  lifecycle,
  queueing,
  llmAnalysis,
  iterative,
  issues,
  helpers
);

export { Orchestrator };
export default Orchestrator;
