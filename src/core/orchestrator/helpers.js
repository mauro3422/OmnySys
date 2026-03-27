import fs from 'fs/promises';
import path from 'path';

import {
  getOrchestratorStatus,
  initializeComponentState,
  initializeRuntimeState,
  initializeIndexingState,
  initializeIterationState,
  initializeCompletionTrackingState,
  setupAtomicEditor
} from './index-helpers.js';



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
  return getOrchestratorStatus.call(this);
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
  return initializeComponentState(this);
}

export function _initializeRuntimeState() {
  return initializeRuntimeState(this);
}

export function _initializeIndexingState() {
  return initializeIndexingState(this);
}

export function _initializeIterationState() {
  return initializeIterationState(this);
}

export function _initializeCompletionTrackingState() {
  return initializeCompletionTrackingState(this);
}

export function _setupAtomicEditor() {
  return setupAtomicEditor(this);
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
