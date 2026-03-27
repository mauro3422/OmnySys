import express from 'express';
import cors from 'cors';
import path from 'path';

import { getAllConnections } from '../../layer-c-memory/query/apis/connections-api.js';

export function sendServerError(res, error) {
  res.status(500).json({ error: error.message });
}

export function sendBadRequest(res, message) {
  res.status(400).json({ error: message });
}

export function registerJsonRoute(app, method, routePath, handler) {
  app[method](routePath, async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      sendServerError(res, error);
    }
  });
}

function bindRouteGroup(app, routes) {
  for (const route of routes) {
    const { method, path: routePath, handler } = route;
    registerJsonRoute(app, method, routePath, handler);
  }
}

function withSetupGuard(setupName, setupFn) {
  try {
    setupFn();
  } catch (error) {
    throw new Error(`${setupName} setup failed: ${error.message}`);
  }
}

export function setupOrchestratorAPI(server) {
  withSetupGuard('orchestrator api', () => {
    server.orchestratorApp.use(cors());
    server.orchestratorApp.use(express.json());

    bindRouteGroup(server.orchestratorApp, [
      {
        method: 'post',
        path: '/command',
        handler: async (req, res) => {
          const { filePath, priority = 'high' } = req.body;
          if (!filePath) {
            return sendBadRequest(res, 'filePath required');
          }

          const result = await server.prioritizeFile(filePath, priority, Date.now().toString());
          res.json(result);
        }
      },
      {
        method: 'get',
        path: '/status',
        handler: async (_req, res) => {
          res.json({
            currentJob: server.currentJob,
            queueSize: server.queue.size(),
            isRunning: server.isRunning,
            stats: server.stats
          });
        }
      },
      {
        method: 'get',
        path: '/health',
        handler: async (_req, res) => {
          res.json({
            status: 'healthy',
            initialized: server.initialized,
            isRunning: server.isRunning,
            currentJob: server.currentJob,
            queueSize: server.queue.size(),
            workerHealthy: server.worker?.isHealthy() || false
          });
        }
      },
      {
        method: 'get',
        path: '/queue',
        handler: async (_req, res) => {
          res.json({
            current: server.currentJob,
            queue: server.queue.getQueueSnapshot(),
            total: server.queue.size(),
            stats: server.stats
          });
        }
      },
      {
        method: 'post',
        path: '/restart',
        handler: async (_req, res) => {
          await server.restartOrchestrator();
          res.json({ status: 'restarted' });
        }
      }
    ]);
  });
}

export function setupBridgeAPI(server) {
  withSetupGuard('bridge api', () => {
    server.bridgeApp.use(cors());
    server.bridgeApp.use(express.json());

    bindRouteGroup(server.bridgeApp, [
      {
        method: 'get',
        path: '/api/status',
        handler: async (_req, res) => {
          res.json(await server.getFullStatus());
        }
      },
      {
        method: 'get',
        path: '/api/files',
        handler: async (_req, res) => {
          res.json(await server.getFilesStatus());
        }
      },
      {
        method: 'get',
        path: '/api/file/*',
        handler: async (req, res) => {
          res.json(await server.getFileTool(req.params[0]));
        }
      },
      {
        method: 'get',
        path: '/api/impact/*',
        handler: async (req, res) => {
          res.json(await server.getImpactMap(req.params[0]));
        }
      },
      {
        method: 'get',
        path: '/api/connections',
        handler: async (_req, res) => {
          const connections = server.cache.get('connections') || await getAllConnections(server.projectPath);
          res.json(connections);
        }
      },
      {
        method: 'post',
        path: '/api/analyze',
        handler: async (req, res) => {
          const { filePath, priority = 'high' } = req.body;
          if (!filePath) {
            return sendBadRequest(res, 'filePath required');
          }
          res.json(await server.prioritizeFile(filePath, priority, Date.now().toString()));
        }
      },
      {
        method: 'get',
        path: '/api/search',
        handler: async (req, res) => {
          const { q } = req.query;
          if (!q) {
            return sendBadRequest(res, 'Query parameter q required');
          }
          res.json(await server.searchFiles(q));
        }
      },
      {
        method: 'get',
        path: '/api/watcher',
        handler: async (_req, res) => {
          res.json(server.fileWatcher?.getFileWatcherStats() || { error: 'File watcher not initialized' });
        }
      },
      {
        method: 'post',
        path: '/api/watcher/notify',
        handler: async (req, res) => {
          const {
            filePath,
            changeType = 'modified',
            origin = 'manual',
            actor = null,
            source = 'bridge-api'
          } = req.body;
          if (!filePath) {
            return sendBadRequest(res, 'filePath required');
          }

          await server.fileWatcher?.notifyChange(
            path.join(server.projectPath, filePath),
            changeType,
            {
              origin,
              actor,
              source,
              detector: 'manual-notify',
              requestedBy: 'bridge-api'
            }
          );

          res.json({ status: 'notified', filePath, changeType, origin, actor, source });
        }
      }
    ]);

    server.setupWebSocket();
  });
}

export function setupWebSocket(server) {
  withSetupGuard('websocket api', () => {
    server.bridgeApp.get('/api/events', (req, res) => {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`);

      const sendMessage = (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      const onBatchCompleted = (batch) => {
        sendMessage({ type: 'batch:completed', batchId: batch.id });
      };

      server.batchProcessor?.on('batch:completed', onBatchCompleted);

      req.on('close', () => {
        server.batchProcessor?.off('batch:completed', onBatchCompleted);
      });
    });

    bindRouteGroup(server.bridgeApp, [
      {
        method: 'get',
        path: '/api/batch',
        handler: async (_req, res) => {
          res.json(server.batchProcessor?.getBatchProcessorStats() || { error: 'Batch processor not initialized' });
        }
      },
      {
        method: 'get',
        path: '/api/batch/:id',
        handler: async (req, res) => {
          const batchInfo = server.batchProcessor?.getBatchInfo(req.params.id);
          if (batchInfo) {
            res.json(batchInfo);
          } else {
            res.status(404).json({ error: 'Batch not found' });
          }
        }
      }
    ]);
  });
}
