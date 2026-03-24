import { EventEmitter } from 'events';
import path from 'path';
import { AnalysisQueue } from '../analysis-queue.js';
import { getDataPath } from '#config/paths.js';
import { getAtomicEditor } from '../atomic-editor/index.js';
import { AtomicEditor } from '../atomic-editor/AtomicEditor.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:orchestrator');

import * as lifecycle from './lifecycle/index.js';
import * as queueing from './queueing.js';
import * as staticInsights from './static-insights.js';
import * as iterative from './iterative.js';
import * as issues from './issues.js';
import * as helpers from './helpers.js';
import { pipelineAlertGuard } from '../file-watcher/guards/pipeline-alert-guard.js';

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

    this._initializeComponentState();
    this._initializeRuntimeState();
    this._initializeIndexingState();
    this._initializeIterationState();
    this._initializeCompletionTrackingState();

    // Atomic Editor - Para ediciones seguras con vibración
    this.atomicEditor = getAtomicEditor(() => new AtomicEditor(projectPath, this));
    this._setupAtomicEditor();

    // Cache Invalidator - Para invalidación síncrona de caché
    this.cacheInvalidator = null; // Se inicializa lazy
  }

  /**
   * Obtiene o inicializa el Cache Invalidator (lazy initialization)
   * @returns {Promise<CacheInvalidator>}
   */
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
    this.wsManager?.publish({
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
  staticInsights,
  iterative,
  issues,
  helpers
);

export { Orchestrator };
export default Orchestrator;
