import fs from 'fs/promises';
import path from 'path';

import { AnalysisWorker } from '../analysis-worker.js';
import { StateManager } from '../state-manager.js';
import { FileWatcher } from '../file-watcher.js';
import { WebSocketManager } from '../websocket/index.js';
import { BatchProcessor } from '../batch-processor/index.js';

import {
  getProjectMetadata,
  getAllConnections,
  getRiskAssessment
} from '../../layer-a-static/storage/query-service.js';
import { UnifiedCacheManager } from '../unified-cache-manager.js';

// ============================================================
// Initialization
// ============================================================

export async function initialize() {
  console.log('\nâ•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—');
  console.log('â•‘     CogniSystem Unified Server v2.0.0                     â•‘');
  console.log('â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n');
  console.log(`ðŸ“ Project: ${this.projectPath}\n`);

  try {
    // Step 1: Initialize MCP components
    await this.initializeMCP();

    // Step 2: Initialize Orchestrator components
    await this.initializeOrchestrator();

    // Step 3: Start HTTP APIs
    await this.startHTTPServers();

    // Step 4: Initialize File Watcher
    await this.initializeFileWatcher();

    // Step 5: Initialize Batch Processor
    await this.initializeBatchProcessor();

    // Step 6: Initialize WebSocket Manager
    await this.initializeWebSocket();

    // Step 7: Start processing loop
    this.processNext();

    this.initialized = true;
    this.emit('ready');

    // Print status
    this.printStatus();

    return true;
  } catch (error) {
    console.error('\nâŒ Initialization failed:', error.message);
    console.error(error.stack);
    throw error;
  }
}

export async function initializeMCP() {
  console.log('â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”');
  console.log('STEP 1: MCP Server Initialization');
  console.log('â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”');

  // Initialize unified cache
  this.cache = new UnifiedCacheManager(this.projectPath, {
    enableChangeDetection: true,
    cascadeInvalidation: true
  });
  await this.cache.initialize();
  console.log('  âœ“ Unified cache initialized');

  // Check if analysis exists
  const hasAnalysis = await this.hasExistingAnalysis();
  
  if (!hasAnalysis) {
    console.log('  âš ï¸  No analysis data found');
    console.log('  ðŸ”„ Queuing initial analysis in background...\n');
    
    // Start analysis in background (non-blocking)
    this.queueInitialAnalysis();
    
    // Initialize with empty data for now
    this.metadata = { metadata: { totalFiles: 0 }, fileIndex: {} };
    this.cache.ramCacheSet('metadata', this.metadata);
    this.cache.ramCacheSet('connections', { sharedState: [], eventListeners: [], total: 0 });
    this.cache.ramCacheSet('assessment', { report: { summary: {} } });
    
    console.log('  â³ Server ready, analysis running in background\n');
  } else {
    // Load existing data
    this.metadata = await getProjectMetadata(this.projectPath);
    this.cache.ramCacheSet('metadata', this.metadata);
    console.log('  âœ“ Metadata cached');

    const connections = await getAllConnections(this.projectPath);
    this.cache.ramCacheSet('connections', connections);
    console.log('  âœ“ Connections cached');

    const assessment = await getRiskAssessment(this.projectPath);
    this.cache.ramCacheSet('assessment', assessment);
    console.log('  âœ“ Risk assessment cached');

    console.log(`  ðŸ“Š ${this.metadata?.metadata?.totalFiles || 0} files indexed\n`);
  }
}

/**
 * Check if analysis data exists
 */
export async function hasExistingAnalysis() {
  try {
    const indexPath = path.join(this.OmnySysDataPath, 'index.json');
    await fs.access(indexPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Queue initial analysis in background
 */
export async function queueInitialAnalysis() {
  // Import indexer dynamically
  const { indexProject } = await import('../../layer-a-static/indexer.js');
  
  // Check LLM health first
  let llmAvailable = false;
  try {
    const { LLMClient } = await import('../../ai/llm-client.js');
    const client = new LLMClient({ llm: { enabled: true } });
    const health = await client.healthCheck();
    llmAvailable = health.gpu || health.cpu;
  } catch {
    llmAvailable = false;
  }
  
  // Run analysis in background (don't await)
  indexProject(this.projectPath, {
    outputPath: 'system-map.json',
    verbose: true,
    skipLLM: !llmAvailable  // Skip LLM if not available
  }).then(() => {
    console.log('\nðŸ“Š Background analysis completed');
    // Reload metadata
    return this.reloadMetadata();
  }).catch(error => {
    console.error('\nâŒ Background analysis failed:', error.message);
  });
}

/**
 * Reload metadata after analysis completes
 */
export async function reloadMetadata() {
  try {
    this.metadata = await getProjectMetadata(this.projectPath);
    this.cache.ramCacheSet('metadata', this.metadata);
    
    const connections = await getAllConnections(this.projectPath);
    this.cache.ramCacheSet('connections', connections);
    
    const assessment = await getRiskAssessment(this.projectPath);
    this.cache.ramCacheSet('assessment', assessment);
    
    // Notify all clients
    this.wsManager?.broadcast({
      type: 'analysis:completed',
      filesAnalyzed: this.metadata?.metadata?.totalFiles || 0,
      timestamp: Date.now()
    });
    
    console.log(`ðŸ“Š Data refreshed: ${this.metadata?.metadata?.totalFiles || 0} files`);
  } catch (error) {
    console.error('Failed to reload metadata:', error.message);
  }
}

/**
 * Initialize File Watcher for real-time updates
 */
export async function initializeFileWatcher() {
  console.log('â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”');
  console.log('STEP 4: File Watcher Initialization');
  console.log('â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”');

  this.fileWatcher = new FileWatcher(this.projectPath, {
    debounceMs: 500,
    batchDelayMs: 1000,
    maxConcurrent: 3,
    verbose: true
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
  console.log('  âœ“ File Watcher ready\n');
}

/**
 * Initialize Batch Processor
 */
export async function initializeBatchProcessor() {
  console.log('â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”');
  console.log('STEP 5: Batch Processor Initialization');
  console.log('â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”');

  this.batchProcessor = new BatchProcessor({
    maxBatchSize: 20,
    batchTimeoutMs: 1000,
    maxConcurrent: 3,
    // FIX: Conectar BatchProcessor a AnalysisQueue
    processChange: async (change) => {
      // Encolar el archivo para anÃ¡lisis con prioridad basada en el tipo de cambio
      const priority = this.calculateChangePriority(change);
      const position = this.queue.enqueue(change.filePath, priority);
      
      console.log(`ðŸ“¥ BatchProcessor â†’ Queue: ${path.basename(change.filePath)} [${priority}] at position ${position}`);
      
      // Iniciar procesamiento si estamos idle
      if (!this.currentJob && this.isRunning) {
        this.processNext();
      }
      
      // Notificar a WebSocket clients
      this.wsManager?.broadcast({
        type: 'file:queued',
        filePath: change.filePath,
        changeType: change.changeType,
        priority,
        position,
        timestamp: Date.now()
      });
    }
  });

  // FIX: Escuchar eventos del batch processor para mÃ©tricas y notificaciones
  this.batchProcessor.on('batch:completed', (batch) => {
    console.log(`âœ… Batch ${batch.id} completed: ${batch.changes.size} changes processed`);
    
    // Notificar a clientes WebSocket
    this.wsManager?.broadcast({
      type: 'batch:completed',
      batchId: batch.id,
      stats: batch.getStats(),
      timestamp: Date.now()
    });
  });

  this.batchProcessor.on('batch:failed', (batch, error) => {
    console.error(`âŒ Batch ${batch.id} failed:`, error.message);
    
    this.wsManager?.broadcast({
      type: 'batch:failed',
      batchId: batch.id,
      error: error.message,
      timestamp: Date.now()
    });
  });

  this.batchProcessor.start();
  console.log('  âœ“ Batch Processor ready (connected to AnalysisQueue)\n');
}

/**
 * Calcula prioridad basada en el tipo de cambio del archivo
 */
export function calculateChangePriority(change) {
  // Cambios que rompen API tienen mayor prioridad
  if (change.changeType === 'deleted') return 'critical';
  if (change.changeType === 'created') return 'high';
  
  // Para modificaciones, usar la prioridad calculada por el BatchProcessor
  if (change.priority >= 4) return 'critical';
  if (change.priority === 3) return 'high';
  if (change.priority === 2) return 'medium';
  return 'low';
}

/**
 * Initialize WebSocket Manager
 */
export async function initializeWebSocket() {
  console.log('â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”');
  console.log('STEP 6: WebSocket Manager Initialization');
  console.log('â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”');

  this.wsManager = new WebSocketManager({
    port: 9997,
    maxClients: 50
  });

  await this.wsManager.start();
  console.log('  âœ“ WebSocket Manager ready\n');
}

export async function initializeOrchestrator() {
  console.log('â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”');
  console.log('STEP 2: Orchestrator Initialization');
  console.log('â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”');

  // Initialize StateManager
  this.stateManager = new StateManager(
    path.join(this.OmnySysDataPath, 'orchestrator-state.json')
  );
  console.log('  âœ“ State manager ready');

  // Initialize Analysis Worker
  this.worker = new AnalysisWorker(this.projectPath, {
    onProgress: (job, progress) => {
      this.currentJob = { ...job, progress };
      this.updateState();
      this.emit('job:progress', job, progress);
    },
    onComplete: (job, result) => {
      console.log(`  âœ… Completed: ${path.basename(job.filePath)}`);
      this.stats.totalAnalyzed++;
      this.currentJob = null;
      this.updateState();
      this.emit('job:complete', job, result);
      this.invalidateCache(job.filePath);
      this.processNext();
    },
    onError: (job, error) => {
      console.error(`  âŒ Error: ${path.basename(job.filePath)} - ${error.message}`);
      this.currentJob = null;
      this.updateState();
      this.emit('job:error', job, error);
      
      // FIX: Notificar a clientes WebSocket del error
      this.wsManager?.broadcast({
        type: 'analysis:failed',
        filePath: job.filePath,
        error: error.message,
        timestamp: Date.now()
      });
      
      // Nota: No invalidamos el cache en caso de error
      // El worker ya hizo rollback del anÃ¡lisis fallido
      
      this.processNext();
    }
  });

  await this.worker.initialize();
  console.log('  âœ“ Analysis worker ready\n');
}

export async function startHTTPServers() {
  console.log('â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”');
  console.log('STEP 3: HTTP API Servers');
  console.log('â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”');

  // Orchestrator API (Port 9999)
  this.setupOrchestratorAPI();
  this.orchestratorServer = this.orchestratorApp.listen(this.ports.orchestrator, () => {
    console.log(`  ðŸŒ Orchestrator API: http://localhost:${this.ports.orchestrator}`);
  });

  // VS Code Bridge (Port 9998)
  this.setupBridgeAPI();
  this.bridgeServer = this.bridgeApp.listen(this.ports.bridge, () => {
    console.log(`  ðŸŒ VS Code Bridge:   http://localhost:${this.ports.bridge}`);
  });

  console.log('');
}
