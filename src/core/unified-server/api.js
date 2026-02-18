import express from 'express';
import cors from 'cors';
import path from 'path';

import { getAllConnections } from '../../layer-c-memory/query/apis/connections-api.js';

// ============================================================
// Orchestrator API (Port 9999) - VS Code Integration
// ============================================================

export function setupOrchestratorAPI() {
  this.orchestratorApp.use(cors());
  this.orchestratorApp.use(express.json());

  // POST /command - Prioritize file analysis
  this.orchestratorApp.post('/command', async (req, res) => {
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

  // GET /status - Queue status
  this.orchestratorApp.get('/status', (req, res) => {
    res.json({
      currentJob: this.currentJob,
      queueSize: this.queue.size(),
      isRunning: this.isRunning,
      stats: this.stats
    });
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

// ============================================================
// VS Code Bridge API (Port 9998) - Rich Status
// ============================================================

export function setupBridgeAPI() {
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
export function setupWebSocket() {
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
