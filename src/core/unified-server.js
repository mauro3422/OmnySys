#!/usr/bin/env node

/**
 * CogniSystem Unified Server
 *
 * Integra:
 * - Orchestrator Server (cola de prioridad, análisis async)
 * - MCP Server (tools para Claude)
 * - VS Code Bridge (HTTP API para extension)
 *
 * Puertos:
 * - 9999: Orchestrator API (VS Code → priorizar archivos)
 * - 9998: VS Code Bridge (estado completo del sistema)
 * - stdio: MCP Protocol (Claude Code)
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';

// Core components
import { AnalysisQueue } from './analysis-queue.js';
import { AnalysisWorker } from './analysis-worker.js';
import { StateManager } from './state-manager.js';
import { FileWatcher } from './file-watcher.js';
import { WebSocketManager, MessageTypes } from './websocket/index.js';
import { BatchProcessor, Priority } from './batch-processor/index.js';

// MCP components
import {
  getProjectMetadata,
  getFileAnalysis,
  getAllConnections,
  getRiskAssessment,
  getFileDependencies,
  findFiles
} from '../layer-a-static/storage/query-service.js';
import { QueryCache, globalCache } from '../layer-c-memory/query-cache.js';
import { loadAIConfig, LLMClient } from '../ai/llm-client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================
// Unified CogniSystem Server
// ============================================================

class CogniSystemUnifiedServer extends EventEmitter {
  constructor(projectPath) {
    super();
    this.projectPath = projectPath;
    this.omnySystemDataPath = path.join(projectPath, '.OmnySystemData');
    this.cache = globalCache;
    this.metadata = null;
    this.initialized = false;

    // Orchestrator components
    this.queue = new AnalysisQueue();
    this.worker = null;
    this.stateManager = null;
    this.currentJob = null;
    this.isRunning = true;
    this.startTime = Date.now();
    this.stats = {
      totalAnalyzed: 0,
      totalQueued: 0,
      avgTime: 0,
      cacheHitRate: 0
    };

    // Server instances
    this.orchestratorApp = express();
    this.bridgeApp = express();
    this.orchestratorServer = null;
    this.bridgeServer = null;
    this.ports = {
      orchestrator: process.env.ORCHESTRATOR_PORT || 9999,
      bridge: process.env.BRIDGE_PORT || 9998
    };

    // File Watcher
    this.fileWatcher = null;

    // WebSocket Manager (nativo)
    this.wsManager = null;

    // Batch Processor para cambios concurrentes
    this.batchProcessor = null;
  }

  // ============================================================
  // Initialization
  // ============================================================

  async initialize() {
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║     CogniSystem Unified Server v2.0.0                     ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    console.log(`📁 Project: ${this.projectPath}\n`);

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
      console.error('\n❌ Initialization failed:', error.message);
      console.error(error.stack);
      throw error;
    }
  }

  async initializeMCP() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 1: MCP Server Initialization');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Load project metadata
    this.metadata = await getProjectMetadata(this.projectPath);
    this.cache.set('metadata', this.metadata);
    console.log('  ✓ Metadata cached');

    // Load connections
    const connections = await getAllConnections(this.projectPath);
    this.cache.set('connections', connections);
    console.log('  ✓ Connections cached');

    // Load risk assessment
    const assessment = await getRiskAssessment(this.projectPath);
    this.cache.set('assessment', assessment);
    console.log('  ✓ Risk assessment cached');

    console.log(`  📊 ${this.metadata?.metadata?.totalFiles || 0} files indexed\n`);
  }

  async initializeOrchestrator() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 2: Orchestrator Initialization');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Initialize StateManager
    this.stateManager = new StateManager(
      path.join(this.omnySystemDataPath, 'orchestrator-state.json')
    );
    console.log('  ✓ State manager ready');

    // Initialize Analysis Worker
    this.worker = new AnalysisWorker(this.projectPath, {
      onProgress: (job, progress) => {
        this.currentJob = { ...job, progress };
        this.updateState();
        this.emit('job:progress', job, progress);
      },
      onComplete: (job, result) => {
        console.log(`  ✅ Completed: ${path.basename(job.filePath)}`);
        this.stats.totalAnalyzed++;
        this.currentJob = null;
        this.updateState();
        this.emit('job:complete', job, result);
        this.invalidateCache(job.filePath);
        this.processNext();
      },
      onError: (job, error) => {
        console.error(`  ❌ Error: ${path.basename(job.filePath)} - ${error.message}`);
        this.currentJob = null;
        this.updateState();
        this.emit('job:error', job, error);
        this.processNext();
      }
    });

    await this.worker.initialize();
    console.log('  ✓ Analysis worker ready\n');
  }

  async startHTTPServers() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 3: HTTP API Servers');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Orchestrator API (Port 9999)
    this.setupOrchestratorAPI();
    this.orchestratorServer = this.orchestratorApp.listen(this.ports.orchestrator, () => {
      console.log(`  🌐 Orchestrator API: http://localhost:${this.ports.orchestrator}`);
    });

    // VS Code Bridge (Port 9998)
    this.setupBridgeAPI();
    this.bridgeServer = this.bridgeApp.listen(this.ports.bridge, () => {
      console.log(`  🌐 VS Code Bridge:   http://localhost:${this.ports.bridge}`);
    });

    console.log('');
  }

  // ============================================================
  // Orchestrator API (Port 9999) - VS Code Integration
  // ============================================================

  setupOrchestratorAPI() {
    this.orchestratorApp.use(cors());
    this.orchestratorApp.use(express.json());

    // POST /command - Queue file for analysis
    this.orchestratorApp.post('/command', async (req, res) => {
      try {
        const { action, filePath, priority = 'low', requestId } = req.body;

        if (!filePath) {
          return res.status(400).json({ error: 'filePath required' });
        }

        if (action === 'prioritize') {
          const result = await this.handlePrioritize(filePath, priority, requestId);
          res.json(result);
        } else if (action === 'pause') {
          this.isRunning = false;
          await this.worker.pause();
          await this.updateState();
          res.json({ status: 'paused' });
        } else if (action === 'resume') {
          this.isRunning = true;
          await this.worker.resume();
          await this.updateState();
          this.processNext();
          res.json({ status: 'resumed' });
        } else {
          res.status(400).json({ error: 'Unknown action' });
        }
      } catch (error) {
        console.error('Error in /command:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // GET /status - Queue status
    this.orchestratorApp.get('/status', async (req, res) => {
      try {
        const stateData = await this.stateManager.read();
        res.json(stateData);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // GET /health - Health check
    this.orchestratorApp.get('/health', async (req, res) => {
      res.json({
        status: 'healthy',
        initialized: this.initialized,
        isRunning: this.isRunning,
        currentJob: this.currentJob,
        queueSize: this.queue.size(),
        workerHealthy: this.worker?.isHealthy() || false
      });
    });

    // GET /queue - Full queue
    this.orchestratorApp.get('/queue', (req, res) => {
      res.json({
        current: this.currentJob,
        queue: this.queue.getAll(),
        total: this.queue.size(),
        stats: this.stats
      });
    });

    // POST /restart - Restart orchestrator
    this.orchestratorApp.post('/restart', async (req, res) => {
      try {
        await this.restart();
        res.json({ status: 'restarted' });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  async handlePrioritize(filePath, priority, requestId) {
    // Check if already analyzed
    const isAnalyzed = await this.worker.isAnalyzed(filePath);
    if (isAnalyzed) {
      return {
        status: 'completed',
        filePath,
        requestId,
        message: 'Already analyzed'
      };
    }

    // Add to queue
    const position = this.queue.enqueue(filePath, priority);
    this.stats.totalQueued++;

    console.log(`📥 Queued: ${path.basename(filePath)} [${priority}] at position ${position}`);

    // If CRITICAL and lower priority job running, pause it
    if (priority === 'critical' && this.currentJob) {
      const currentPriority = this.getPriorityLevel(this.currentJob.priority);
      const newPriority = this.getPriorityLevel(priority);

      if (newPriority > currentPriority) {
        console.log(`⏸️  Pausing current job to prioritize ${path.basename(filePath)}`);
        await this.worker.pause();
        this.queue.enqueue(this.currentJob.filePath, this.currentJob.priority);
        this.currentJob = null;
      }
    }

    // Start processing if idle
    if (!this.currentJob) {
      this.processNext();
    }

    await this.updateState();

    return {
      status: position === 0 ? 'analyzing' : 'queued',
      filePath,
      priority,
      position,
      estimatedTime: this.calculateETA(position),
      requestId
    };
  }

  // ============================================================
  // VS Code Bridge API (Port 9998) - Rich Status
  // ============================================================

  setupBridgeAPI() {
    this.bridgeApp.use(cors());
    this.bridgeApp.use(express.json());

    // GET /api/status - Complete system status
    this.bridgeApp.get('/api/status', async (req, res) => {
      try {
        const status = await this.getFullStatus();
        res.json(status);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // GET /api/files - List all files with analysis status
    this.bridgeApp.get('/api/files', async (req, res) => {
      try {
        const files = await this.getFilesStatus();
        res.json(files);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // GET /api/file/:path - Get specific file analysis
    this.bridgeApp.get('/api/file/*', async (req, res) => {
      try {
        const filePath = req.params[0];
        const analysis = await this.getFileTool(filePath);
        res.json(analysis);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // GET /api/impact/:path - Get impact map for file
    this.bridgeApp.get('/api/impact/*', async (req, res) => {
      try {
        const filePath = req.params[0];
        const impact = await this.getImpactMap(filePath);
        res.json(impact);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // GET /api/connections - Get all connections
    this.bridgeApp.get('/api/connections', async (req, res) => {
      try {
        const connections = this.cache.get('connections') ||
          await getAllConnections(this.projectPath);
        res.json(connections);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // POST /api/analyze - Trigger file analysis
    this.bridgeApp.post('/api/analyze', async (req, res) => {
      try {
        const { filePath, priority = 'high' } = req.body;
        if (!filePath) {
          return res.status(400).json({ error: 'filePath required' });
        }
        const result = await this.handlePrioritize(filePath, priority, Date.now().toString());
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // GET /api/search?q=pattern - Search files
    this.bridgeApp.get('/api/search', async (req, res) => {
      try {
        const { q } = req.query;
        if (!q) {
          return res.status(400).json({ error: 'Query parameter q required' });
        }
        const results = await this.searchFiles(q);
        res.json(results);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // GET /api/watcher - File watcher stats
    this.bridgeApp.get('/api/watcher', async (req, res) => {
      try {
        const stats = this.fileWatcher?.getStats() || { error: 'File watcher not initialized' };
        res.json(stats);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // POST /api/watcher/notify - Manual file change notification
    this.bridgeApp.post('/api/watcher/notify', async (req, res) => {
      try {
        const { filePath, changeType = 'modified' } = req.body;
        if (!filePath) {
          return res.status(400).json({ error: 'filePath required' });
        }

        // Notify file watcher of external change (e.g., from VS Code)
        await this.fileWatcher?.notifyChange(
          path.join(this.projectPath, filePath),
          changeType
        );

        res.json({ status: 'notified', filePath, changeType });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // GET /api/ws - WebSocket endpoint for real-time updates
    this.setupWebSocket();
  }

  /**
   * Setup legacy SSE endpoint (fallback for clients without WebSocket support)
   */
  setupWebSocket() {
    // Server-Sent Events como fallback
    this.bridgeApp.get('/api/events', (req, res) => {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Send initial connection message
      res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`);

      // Handler para enviar mensajes
      const sendMessage = (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      // Escuchar eventos del batch processor
      const onBatchCompleted = (batch) => {
        sendMessage({ type: 'batch:completed', batchId: batch.id });
      };

      this.batchProcessor?.on('batch:completed', onBatchCompleted);

      // Remove on disconnect
      req.on('close', () => {
        this.batchProcessor?.off('batch:completed', onBatchCompleted);
      });
    });

    // GET /api/batch - Batch processor stats
    this.bridgeApp.get('/api/batch', async (req, res) => {
      try {
        const stats = this.batchProcessor?.getStats() || { error: 'Batch processor not initialized' };
        res.json(stats);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // GET /api/batch/:id - Specific batch info
    this.bridgeApp.get('/api/batch/:id', async (req, res) => {
      try {
        const batchInfo = this.batchProcessor?.getBatchInfo(req.params.id);
        if (batchInfo) {
          res.json(batchInfo);
        } else {
          res.status(404).json({ error: 'Batch not found' });
        }
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  // ============================================================
  // MCP Tools (for Claude Code)
  // ============================================================

  async getImpactMap(filePath) {
    const cached = this.cache.get(`impact:${filePath}`);
    if (cached) return cached;

    try {
      const deps = await getFileDependencies(this.projectPath, filePath);
      const fileData = await getFileAnalysis(this.projectPath, filePath);

      const result = {
        file: filePath,
        directlyAffects: deps.usedBy || [],
        transitiveAffects: deps.transitiveDependents || [],
        semanticConnections: fileData.semanticConnections || [],
        totalAffected:
          (deps.usedBy?.length || 0) +
          (deps.transitiveDependents?.length || 0) +
          (fileData.semanticConnections?.length || 0),
        riskLevel: fileData.riskScore?.severity || 'unknown',
        subsystem: fileData.subsystem
      };

      this.cache.set(`impact:${filePath}`, result);
      return result;
    } catch (error) {
      return { error: error.message };
    }
  }

  async analyzeChange(filePath, symbolName) {
    try {
      const fileData = await getFileAnalysis(this.projectPath, filePath);
      const symbol = fileData.exports?.find((e) => e.name === symbolName);

      if (!symbol) {
        return { error: `Symbol '${symbolName}' not found in ${filePath}` };
      }

      const impactMap = await this.getImpactMap(filePath);

      return {
        symbol: symbolName,
        file: filePath,
        symbolType: symbol.kind,
        directDependents: impactMap.directlyAffects,
        transitiveDependents: impactMap.transitiveAffects,
        riskLevel: fileData.riskScore?.severity,
        recommendation: fileData.riskScore?.severity === 'critical'
          ? '⚠️ HIGH RISK - This change affects many files'
          : '✓ Safe - Limited scope'
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  async explainConnection(fileA, fileB) {
    try {
      const connections = this.cache.get('connections') ||
        await getAllConnections(this.projectPath);

      const relevant = connections.sharedState
        ?.filter(
          (c) =>
            (c.sourceFile === fileA && c.targetFile === fileB) ||
            (c.sourceFile === fileB && c.targetFile === fileA)
        )
        .slice(0, 5);

      if (!relevant || relevant.length === 0) {
        return { fileA, fileB, connected: false, reason: 'No direct connections found' };
      }

      return {
        fileA,
        fileB,
        connected: true,
        connections: relevant.map((c) => ({
          type: c.type,
          property: c.globalProperty,
          reason: c.reason,
          severity: c.severity
        }))
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  async getRisk(minSeverity = 'medium') {
    try {
      const assessment = this.cache.get('assessment') ||
        await getRiskAssessment(this.projectPath);

      const severityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
      const minLevel = severityOrder[minSeverity];

      const filtered = assessment.report.mediumRiskFiles
        ?.concat(assessment.report.highRiskFiles || [])
        .filter((f) => severityOrder[f.severity] >= minLevel)
        .slice(0, 10);

      return {
        summary: assessment.report.summary,
        topRiskFiles: filtered,
        recommendation: assessment.report.summary.criticalCount > 0
          ? '🚨 Critical issues detected - Review high-risk files'
          : '✓ Risk levels acceptable'
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  async searchFiles(pattern) {
    try {
      const results = await findFiles(this.projectPath, pattern);
      return { pattern, found: results.length, files: results.slice(0, 20) };
    } catch (error) {
      return { error: error.message };
    }
  }

  // ============================================================
  // Orchestrator Logic
  // ============================================================

  async processNext() {
    if (!this.isRunning || this.currentJob) {
      return;
    }

    const nextJob = this.queue.dequeue();
    if (!nextJob) {
      console.log('📭 Queue empty, waiting for jobs...');
      return;
    }

    console.log(`⚡ Processing: ${path.basename(nextJob.filePath)} [${nextJob.priority}]`);
    this.currentJob = { ...nextJob, progress: 0, stage: 'starting' };
    await this.updateState();

    this.worker.analyze(nextJob);
  }

  async updateState() {
    if (!this.stateManager) return;

    const stateData = {
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      orchestrator: {
        status: this.isRunning ? 'running' : 'paused',
        pid: process.pid,
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
        port: this.ports.orchestrator
      },
      currentJob: this.currentJob,
      queue: this.queue.getAll(),
      stats: this.stats,
      health: {
        status: 'healthy',
        llmConnection: this.worker?.isHealthy() ? 'ok' : 'disconnected',
        memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        lastError: null
      }
    };

    await this.stateManager.write(stateData);
  }

  getPriorityLevel(priority) {
    const levels = { critical: 4, high: 3, medium: 2, low: 1 };
    return levels[priority] || 0;
  }

  calculateETA(position) {
    const avgTime = this.stats.avgTime || 3000;
    return position * avgTime;
  }

  invalidateCache(filePath) {
    this.cache.delete(`impact:${filePath}`);
    this.cache.delete(`file:${filePath}`);
  }

  async restart() {
    console.log('🔄 Restarting orchestrator...');
    await this.worker.stop();
    this.queue.clear();
    this.currentJob = null;
    this.isRunning = true;
    await this.worker.initialize();
    await this.updateState();
    console.log('✅ Orchestrator restarted');
  }

  // ============================================================
  // Status & Reporting
  // ============================================================

  async getFullStatus() {
    return {
      server: {
        version: '2.0.0',
        initialized: this.initialized,
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
        ports: this.ports
      },
      orchestrator: {
        status: this.isRunning ? 'running' : 'paused',
        currentJob: this.currentJob,
        queue: this.queue.getAll(),
        stats: this.stats
      },
      project: {
        path: this.projectPath,
        totalFiles: this.metadata?.metadata?.totalFiles || 0,
        totalFunctions: this.metadata?.metadata?.totalFunctions || 0
      },
      cache: this.cache.getStats()
    };
  }

  async getFilesStatus() {
    try {
      const metadata = await getProjectMetadata(this.projectPath);
      const files = Object.keys(metadata.files || {}).map(filePath => ({
        path: filePath,
        analyzed: true,
        riskScore: metadata.files[filePath].riskScore?.total || 0,
        riskSeverity: metadata.files[filePath].riskScore?.severity || 'low',
        exports: metadata.files[filePath].exports?.length || 0,
        imports: metadata.files[filePath].imports?.length || 0,
        subsystem: metadata.files[filePath].subsystem
      }));

      return { files, total: files.length };
    } catch (error) {
      return { error: error.message };
    }
  }

  async getFileTool(filePath) {
    try {
      const fileData = await getFileAnalysis(this.projectPath, filePath);
      return {
        path: filePath,
        exists: !!fileData,
        analysis: fileData
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  printStatus() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ CogniSystem Unified Server Ready');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🌐 HTTP Endpoints:');
    console.log(`   Orchestrator: http://localhost:${this.ports.orchestrator}`);
    console.log(`   VS Code Bridge: http://localhost:${this.ports.bridge}\n`);

    console.log('📡 Available Endpoints:');
    console.log('   POST /command          - Queue file for analysis');
    console.log('   GET  /status           - Queue status');
    console.log('   GET  /health           - Health check');
    console.log('   GET  /api/status       - Full system status');
    console.log('   GET  /api/files        - List all files');
    console.log('   GET  /api/impact/*     - Get impact map');
    console.log('   POST /api/analyze      - Trigger analysis\n');

    console.log('🔧 MCP Tools (for Claude):');
    console.log('   • get_impact_map(filePath)');
    console.log('   • analyze_change(filePath, symbolName)');
    console.log('   • explain_connection(fileA, fileB)');
    console.log('   • get_risk_assessment(minSeverity)');
    console.log('   • search_files(pattern)\n');

    console.log('💡 Press Ctrl+C to stop\n');
  }

  // ============================================================
  // Graceful Shutdown
  // ============================================================

  async shutdown() {
    console.log('\n👋 Shutting down Unified Server...');

    this.isRunning = false;

    if (this.wsManager) {
      await this.wsManager.stop();
    }

    if (this.batchProcessor) {
      this.batchProcessor.stop();
    }

    if (this.fileWatcher) {
      await this.fileWatcher.stop();
    }

    if (this.worker) {
      await this.worker.stop();
    }

    if (this.orchestratorServer) {
      this.orchestratorServer.close();
    }

    if (this.bridgeServer) {
      this.bridgeServer.close();
    }

    console.log('✅ Server stopped');
    process.exit(0);
  }
}

// ============================================================
// CLI Entry Point
// ============================================================

async function main() {
  const projectPath = process.argv[2] || process.cwd();
  const server = new CogniSystemUnifiedServer(projectPath);

  // Handle graceful shutdown
  process.on('SIGTERM', () => server.shutdown());
  process.on('SIGINT', () => server.shutdown());

  try {
    await server.initialize();

    // Keep alive
    await new Promise(() => {});
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

export { CogniSystemUnifiedServer };
