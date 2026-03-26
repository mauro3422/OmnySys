import fs from 'fs/promises';
import path from 'path';

import { AnalysisQueue } from '../analysis-queue.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:helpers');



/**
 * Check if a file has been analyzed
 */
export async function isAnalyzed(filePath) {
  try {
    const fileData = await this._getFileData(filePath);
    return !!fileData;
  } catch {
    return false;
  }
}

/**
 * Get current status
 */
export function getStatus() {
  return {
    isRunning: this.isRunning,
    isIndexing: this.isIndexing,
    indexingProgress: this.indexingProgress,
    currentJob: this.currentJob,
    queueSize: this.queue.size(),
    stats: this.stats,
    uptime: Date.now() - this.startTime
  };
}

export async function _hasExistingAnalysis() {
  try {
    const indexPath = path.join(this.OmnySysDataPath, 'index.json');
    await fs.access(indexPath);
    return true;
  } catch {
    return false;
  }
}

export async function _getFileData(filePath) {
  // Try to read from .OmnySysData
  try {
    const relativePath = path.relative(this.projectPath, filePath);
    const fileDataPath = path.join(
      this.OmnySysDataPath,
      'files',
      relativePath + '.json'
    );
    const content = await fs.readFile(fileDataPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function _ensureLLMAvailable() {
  // LLM desactivado — siempre retorna false para que el sistema use análisis estático
  return false;
}

export function _calculateChangePriority(change) {
  if (change.changeType === 'deleted') return 'critical';
  if (change.changeType === 'created') return 'high';
  if (change.priority >= 4) return 'critical';
  if (change.priority === 3) return 'high';
  if (change.priority === 2) return 'medium';
  return 'low';
}

export async function _getCacheInvalidator() {
  if (!this.cacheInvalidator) {
    const { getCacheInvalidator } = await import('#core/cache/invalidator/index.js');
    this.cacheInvalidator = getCacheInvalidator(this.cache || { projectPath: this.projectPath });
  }
  return this.cacheInvalidator;
}

export function _initializeComponentState() {
  this.queue = new AnalysisQueue();
  this.worker = null;
  this.stateManager = null;
  this.fileWatcher = null;
  this.batchProcessor = null;
  this.wsManager = null;
  this.cache = null;
}

export function _initializeRuntimeState() {
  this.currentJob = null;
  this.isRunning = true;
  this.startTime = Date.now();
  this.stats = {
    totalAnalyzed: 0,
    totalQueued: 0,
    avgTime: 0
  };
}

export function _initializeIndexingState() {
  this.isIndexing = false;
  this.indexingProgress = 0;
  this.indexedFiles = new Set();
}

export function _initializeIterationState() {
  this.iteration = 0;
  this.maxIterations = 10;
  this.isIterating = false;
  this.iterativeQueue = [];
}

export function _initializeCompletionTrackingState() {
  this.totalFilesToAnalyze = 0;
  this.processedFiles = new Set();
  this.analysisCompleteEmitted = false;
}

export function _setupAtomicEditor() {
  this.atomicEditor.on('atom:validation:failed', (event) => {
    logger.error(`🚫 Atomic validation failed: ${event.file}`);
    logger.error(`   Error: ${event.error}`);

    this.wsManager?.publish({
      type: 'atomic:validation:failed',
      ...event,
      timestamp: Date.now()
    });
  });

  this.atomicEditor.on('atom:modified', (event) => {
    logger.info(`✅ Atomic edit complete: ${event.file}`);
    this._triggerIncrementalSocietyUpdate(event.file);

    this.wsManager?.publish({
      type: 'atomic:modified',
      ...event,
      timestamp: Date.now()
    });
  });

  this.atomicEditor.on('vibration:propagating', (event) => {
    logger.info(`📡 Vibration propagating from ${event.source}`);
    logger.info(`   Affects: ${event.affected.length} files`);

    event.affected.forEach(file => {
      this._invalidateFileCache(file);
    });
  });
}

export function _queueFileChange(filePath, changeType, priority, skipDebounce) {
  if (changeType !== 'modified' && changeType !== 'created') {
    return;
  }

  const queuePriority = priority === 'critical' ? 'critical' :
    changeType === 'created' ? 'high' : 'normal';

  this.queue.enqueue(filePath, queuePriority);

  if ((skipDebounce || priority === 'critical') && !this.currentJob && this.isRunning) {
    this._processNext();
  }
}

export function _broadcastFileChange(filePath, changeType, priority) {
  this.wsManager?.publish({
    type: 'file:changed',
    filePath,
    changeType,
    priority,
    timestamp: Date.now()
  });
}
