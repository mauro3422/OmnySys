import * as lifecycle from './lifecycle/index.js';
import * as queueing from './queueing.js';
import * as staticInsights from './static-insights.js';
import * as iterative from './iterative.js';
import * as issues from './issues.js';
import * as helpers from './helpers.js';
import { pipelineAlertGuard } from '../file-watcher/guards/pipeline-alert-guard.js';
import { EventEmitter } from 'events';
import { createLogger } from '../../utils/logger.js';
import { handleOrchestratorFileChange } from './change-handling.js';
import {
  buildOrchestratorState,
  getOrchestratorStatus,
  initializeComponentState,
  initializeRuntimeState,
  initializeIndexingState,
  initializeIterationState,
  initializeCompletionTrackingState,
  setupAtomicEditor
} from './index-helpers.js';

const logger = createLogger('OmnySys:orchestrator');

class Orchestrator extends EventEmitter {
  constructor(projectPath, options = {}) {
    super();
    this.logger = logger;
    buildOrchestratorState(this, projectPath, options);
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

  getStatus() {
    return getOrchestratorStatus.call(this);
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
    return handleOrchestratorFileChange(this, filePath, changeType, options);
  }
}

Object.assign(Orchestrator.prototype, {
  _initializeComponentState() {
    return initializeComponentState(this);
  },
  _initializeRuntimeState() {
    return initializeRuntimeState(this);
  },
  _initializeIndexingState() {
    return initializeIndexingState(this);
  },
  _initializeIterationState() {
    return initializeIterationState(this);
  },
  _initializeCompletionTrackingState() {
    return initializeCompletionTrackingState(this);
  },
  _setupAtomicEditor() {
    return setupAtomicEditor(this);
  }
});

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
