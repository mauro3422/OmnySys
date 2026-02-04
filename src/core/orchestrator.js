#!/usr/bin/env node

/**
 * Orchestrator - Motor de procesamiento de análisis
 * 
 * Responsabilidades:
 * - Cola de prioridad (CRITICAL > HIGH > MEDIUM > LOW)
 * - Worker que procesa archivos con LLM
 * - FileWatcher para cambios en tiempo real
 * - BatchProcessor para agrupar cambios
 * - StateManager para persistencia de estado
 * 
 * Este es un COMPONENTE interno, no un servidor standalone.
 * Es usado por MCP Server como parte de su arquitectura.
 */

import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';
import { AnalysisQueue } from './analysis-queue.js';
import { AnalysisWorker } from './analysis-worker.js';
import { StateManager } from './state-manager.js';
import { FileWatcher } from './file-watcher.js';
import { WebSocketManager } from './websocket/index.js';
import { BatchProcessor } from './batch-processor/index.js';
import { UnifiedCacheManager } from './unified-cache-manager.js';
import { indexProject } from '../layer-a-static/indexer.js';
import { loadAIConfig, LLMClient } from '../ai/llm-client.js';

export class Orchestrator extends EventEmitter {
  constructor(projectPath, options = {}) {
    super();
    this.projectPath = projectPath;
    this.OmnySysDataPath = path.join(projectPath, '.OmnySysData');
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
  }

  /**
   * Initialize the orchestrator
   */
  async initialize() {
    console.log('\n🔧 Initializing Orchestrator...\n');

    // Initialize cache
    this.cache = new UnifiedCacheManager(this.projectPath, {
      enableChangeDetection: true,
      cascadeInvalidation: true
    });
    await this.cache.initialize();

    // Initialize state manager
    this.stateManager = new StateManager(
      path.join(this.OmnySysDataPath, 'orchestrator-state.json')
    );

    // Initialize worker
    this.worker = new AnalysisWorker(this.projectPath, {
      onProgress: (job, progress) => this._onJobProgress(job, progress),
      onComplete: (job, result) => this._onJobComplete(job, result),
      onError: (job, error) => this._onJobError(job, error)
    });
    await this.worker.initialize();

    // Initialize optional components
    if (this.options.enableFileWatcher) {
      await this._initializeFileWatcher();
    }

    if (this.options.enableWebSocket) {
      await this._initializeWebSocket();
    }

    // Load existing state
    await this._loadState();

    // Sync project files with existing analysis
    await this._syncProjectFiles();

    // Start processing loop
    this._processNext();

    console.log('✅ Orchestrator initialized\n');
  }

  /**
   * Start background indexing if no data exists
   */
  async startBackgroundIndexing() {
    const hasData = await this._hasExistingAnalysis();
    
    if (hasData) {
      console.log('📊 Analysis data found, skipping initial indexing');
      return;
    }

    console.log('\n🚀 Starting background indexing...\n');
    this.isIndexing = true;

    // Check LLM availability
    let llmAvailable = false;
    if (this.options.autoStartLLM) {
      llmAvailable = await this._ensureLLMAvailable();
    }

    // Start indexing in background (don't await)
    indexProject(this.projectPath, {
      outputPath: 'system-map.json',
      verbose: true,
      skipLLM: !llmAvailable
    }).then((result) => {
      console.log('\n✅ Background indexing completed');
      this.isIndexing = false;
      this.indexingProgress = 100;
      this.emit('indexing:completed', result);
    }).catch((error) => {
      console.error('\n❌ Background indexing failed:', error.message);
      this.isIndexing = false;
      this.emit('indexing:failed', error);
    });

    // Monitor progress
    this._monitorIndexingProgress();
  }

  /**
   * Check if a file has been analyzed
   */
  async isAnalyzed(filePath) {
    try {
      const fileData = await this._getFileData(filePath);
      return !!fileData;
    } catch {
      return false;
    }
  }

  /**
   * Analyze a file and wait for result
   * Used by MCP tools when file is not yet analyzed
   */
  async analyzeAndWait(filePath, timeoutMs = 60000) {
    // Check if already in queue
    const position = this.queue.findPosition(filePath);
    if (position >= 0) {
      console.log(`⏳ ${filePath} already in queue at position ${position}`);
    } else {
      // Enqueue as CRITICAL priority
      this.queue.enqueue(filePath, 'critical');
      console.log(`🚨 ${filePath} queued as CRITICAL`);
    }

    // Trigger processing if idle
    if (!this.currentJob) {
      this._processNext();
    }

    // Wait for analysis to complete
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Timeout waiting for analysis of ${filePath}`));
      }, timeoutMs);

      const onComplete = (job, result) => {
        if (job.filePath === filePath) {
          clearTimeout(timeout);
          this.off('job:complete', onComplete);
          resolve(result);
        }
      };

      this.on('job:complete', onComplete);
    });
  }

  /**
   * Get current status
   */
  getStatus() {
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

  /**
   * Stop the orchestrator
   */
  async stop() {
    console.log('\n👋 Stopping Orchestrator...');
    this.isRunning = false;

    if (this.fileWatcher) {
      await this.fileWatcher.stop();
    }

    if (this.batchProcessor) {
      this.batchProcessor.stop();
    }

    if (this.wsManager) {
      await this.wsManager.stop();
    }

    if (this.worker) {
      await this.worker.stop();
    }

    console.log('✅ Orchestrator stopped');
  }

  // ==========================================
  // Private methods
  // ==========================================

  async _initializeFileWatcher() {
    console.log('👁️  Initializing File Watcher...');

    this.fileWatcher = new FileWatcher(this.projectPath, {
      debounceMs: 500,
      batchDelayMs: 1000,
      maxConcurrent: 3
    });

    this.fileWatcher.on('file:created', (event) => {
      this.batchProcessor?.addChange(event.filePath, 'created');
    });

    this.fileWatcher.on('file:modified', (event) => {
      this.batchProcessor?.addChange(event.filePath, 'modified');
    });

    this.fileWatcher.on('file:deleted', (event) => {
      this.batchProcessor?.addChange(event.filePath, 'deleted');
    });

    await this.fileWatcher.initialize();

    // Initialize batch processor
    this.batchProcessor = new BatchProcessor({
      maxBatchSize: 20,
      batchTimeoutMs: 1000,
      processChange: async (change) => {
        const priority = this._calculateChangePriority(change);
        this.queue.enqueue(change.filePath, priority);
        
        if (!this.currentJob && this.isRunning) {
          this._processNext();
        }

        this.wsManager?.broadcast({
          type: 'file:queued',
          filePath: change.filePath,
          priority,
          timestamp: Date.now()
        });
      }
    });

    this.batchProcessor.start();
    console.log('✅ File Watcher ready\n');
  }

  async _initializeWebSocket() {
    console.log('📡 Initializing WebSocket...');
    this.wsManager = new WebSocketManager({
      port: this.options.ports.webSocket,
      maxClients: 50
    });
    await this.wsManager.start();
    console.log('✅ WebSocket ready\n');
  }

  async _loadState() {
    try {
      const state = await this.stateManager.read();
      if (state.queue) {
        // Restore queue if needed
      }
    } catch {
      // No previous state
    }
  }

  async _processNext() {
    if (!this.isRunning || this.currentJob) {
      return;
    }

    const nextJob = this.queue.dequeue();
    if (!nextJob) {
      return;
    }

    this.currentJob = { ...nextJob, progress: 0, stage: 'starting' };
    this.emit('job:started', this.currentJob);

    this.worker.analyze(nextJob);
  }

  _onJobProgress(job, progress) {
    this.currentJob = { ...job, progress };
    this.emit('job:progress', job, progress);
  }

  _onJobComplete(job, result) {
    this.stats.totalAnalyzed++;
    this.currentJob = null;
    this.indexedFiles.add(job.filePath);
    
    this.emit('job:complete', job, result);
    this._processNext();
  }

  _onJobError(job, error) {
    console.error(`❌ Job failed: ${job.filePath}`, error.message);
    this.currentJob = null;
    this.emit('job:error', job, error);
    this._processNext();
  }

  _calculateChangePriority(change) {
    if (change.changeType === 'deleted') return 'critical';
    if (change.changeType === 'created') return 'high';
    if (change.priority >= 4) return 'critical';
    if (change.priority === 3) return 'high';
    if (change.priority === 2) return 'medium';
    return 'low';
  }

  async _hasExistingAnalysis() {
    try {
      const indexPath = path.join(this.OmnySysDataPath, 'index.json');
      await fs.access(indexPath);
      return true;
    } catch {
      return false;
    }
  }

  async _getFileData(filePath) {
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

  async _ensureLLMAvailable() {
    try {
      const client = new LLMClient({ llm: { enabled: true } });
      const health = await client.healthCheck();
      return health.gpu || health.cpu;
    } catch {
      return false;
    }
  }

  _monitorIndexingProgress() {
    const checkProgress = () => {
      if (!this.isIndexing) return;
      
      // Update progress based on indexed files
      // This is a simplified version - could be more sophisticated
      this.emit('indexing:progress', this.indexingProgress);
      setTimeout(checkProgress, 1000);
    };
    
    checkProgress();
  }

  /**
   * Sincroniza archivos del proyecto con el análisis existente
   * Agrega archivos nuevos o modificados a la cola
   */
  async _syncProjectFiles() {
    try {
      // Importar scanner dinámicamente
      const { scanProject } = await import('../layer-a-static/scanner.js');
      const projectFiles = await scanProject(this.projectPath);
      
      if (projectFiles.length === 0) return;

      // Obtener lista de archivos ya analizados desde el índice
      const analyzedFiles = new Set();
      try {
        const indexPath = path.join(this.OmnySysDataPath, 'index.json');
        const indexContent = await fs.readFile(indexPath, 'utf-8');
        const index = JSON.parse(indexContent);
        for (const file of index.files || []) {
          analyzedFiles.add(file.filePath);
        }
      } catch {
        // No hay índice, todos los archivos son nuevos
      }

      // Normalizar rutas del proyecto (scanProject ya devuelve rutas relativas)
      const normalizedProjectFiles = projectFiles.map(file => 
        path.relative(this.projectPath, path.resolve(this.projectPath, file)).replace(/\\/g, '/')
      );

      // Encontrar archivos faltantes
      const missingFiles = normalizedProjectFiles.filter(filePath => {
        return !analyzedFiles.has(filePath);
      });

      if (missingFiles.length > 0) {
        console.log(`📋 Found ${missingFiles.length} new files to analyze`);
        
        // Agregar a la cola con prioridad baja
        for (const filePath of missingFiles) {
          this.queue.enqueue(filePath, 'low');
          this.stats.totalQueued++;
        }
        
        console.log(`✅ Added ${missingFiles.length} files to analysis queue`);
      }

      // Reportar estado
      const queueSize = this.queue.size();
      if (queueSize > 0) {
        console.log(`📊 Queue: ${queueSize} files pending analysis`);
      }

    } catch (error) {
      console.warn('⚠️  Failed to sync project files:', error.message);
    }
  }
}

export default Orchestrator;
