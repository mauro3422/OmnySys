import { AnalysisQueue } from '../analysis-queue.js';
import { getDataPath } from '#config/paths.js';
import { getAtomicEditor } from '../atomic-editor/index.js';
import { AtomicEditor } from '../atomic-editor/AtomicEditor.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:orchestrator:helpers');

export function buildOrchestratorState(orchestrator, projectPath, options = {}) {
  orchestrator.projectPath = projectPath;
  orchestrator.OmnySysDataPath = getDataPath(projectPath, '');
  orchestrator.options = {
    enableFileWatcher: true,
    enableWebSocket: true,
    autoStartLLM: true,
    ports: {
      webSocket: 9997,
      ...options.ports
    },
    ...options
  };

  orchestrator._initializeComponentState();
  orchestrator._initializeRuntimeState();
  orchestrator._initializeIndexingState();
  orchestrator._initializeIterationState();
  orchestrator._initializeCompletionTrackingState();

  orchestrator.atomicEditor = getAtomicEditor(() => new AtomicEditor(projectPath, orchestrator));
  orchestrator._setupAtomicEditor();
  orchestrator.cacheInvalidator = null;
}

export function getOrchestratorStatus() {
  return {
    isRunning: this.isRunning,
    isIndexing: this.isIndexing,
    indexingProgress: this.indexingProgress,
    currentJob: this.currentJob,
    queueSize: this.queue?.size?.() ?? 0,
    stats: this.stats,
    uptime: this.startTime ? Date.now() - this.startTime : 0
  };
}

export function initializeComponentState(orchestrator) {
  orchestrator.queue = new AnalysisQueue();
  orchestrator.worker = null;
  orchestrator.stateManager = null;
  orchestrator.fileWatcher = null;
  orchestrator.batchProcessor = null;
  orchestrator.wsManager = null;
  orchestrator.cache = null;
}

export function initializeRuntimeState(orchestrator) {
  orchestrator.currentJob = null;
  orchestrator.isRunning = true;
  orchestrator.startTime = Date.now();
  orchestrator.stats = {
    totalAnalyzed: 0,
    totalQueued: 0,
    avgTime: 0
  };
}

export function initializeIndexingState(orchestrator) {
  orchestrator.isIndexing = false;
  orchestrator.indexingProgress = 0;
  orchestrator.indexedFiles = new Set();
}

export function initializeIterationState(orchestrator) {
  orchestrator.iteration = 0;
  orchestrator.maxIterations = 10;
  orchestrator.isIterating = false;
  orchestrator.iterativeQueue = [];
}

export function initializeCompletionTrackingState(orchestrator) {
  orchestrator.totalFilesToAnalyze = 0;
  orchestrator.processedFiles = new Set();
  orchestrator.analysisCompleteEmitted = false;
}

export function setupAtomicEditor(orchestrator) {
  if (!orchestrator.atomicEditor || typeof orchestrator.atomicEditor.on !== 'function') {
    return;
  }

  orchestrator.atomicEditor.on('atom:validation:failed', (event) => {
    logger.error(`🚫 Atomic validation failed: ${event.file}`);
    logger.error(`   Error: ${event.error}`);

    orchestrator.wsManager?.publish({
      type: 'atomic:validation:failed',
      ...event,
      timestamp: Date.now()
    });
  });

  orchestrator.atomicEditor.on('atom:modified', (event) => {
    logger.info(`✅ Atomic edit complete: ${event.file}`);
    orchestrator._triggerIncrementalSocietyUpdate(event.file);

    orchestrator.wsManager?.publish({
      type: 'atomic:modified',
      ...event,
      timestamp: Date.now()
    });
  });

  orchestrator.atomicEditor.on('vibration:propagating', (event) => {
    logger.info(`📡 Vibration propagating from ${event.source}`);
    logger.info(`   Affects: ${event.affected.length} files`);

    event.affected.forEach(file => {
      orchestrator._invalidateFileCache(file);
    });
  });
}
