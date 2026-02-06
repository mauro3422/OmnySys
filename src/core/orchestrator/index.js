import { EventEmitter } from 'events';
import path from 'path';
import { AnalysisQueue } from '../analysis-queue.js';

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
    this.OmnySysDataPath = path.join(projectPath, '.omnysysdata');
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
