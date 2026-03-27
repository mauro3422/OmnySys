import path from 'path';
import { estimateQueueTime } from '../orchestrator-server/utils/eta.js';

export function resolvePriorityLevel(priority) {
  const levels = { critical: 4, high: 3, medium: 2, low: 1 };
  return levels[priority] || 0;
}

export function buildQueueItem(filePath, priority) {
  return {
    filePath,
    priority,
    label: path.basename(filePath)
  };
}

export function buildOrchestratorStateData(server) {
  return {
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    orchestrator: {
      status: server.isRunning ? 'running' : 'paused',
      pid: process.pid,
      uptime: Math.floor((Date.now() - server.startTime) / 1000),
      port: server.ports.orchestrator
    },
    currentJob: server.currentJob,
    queue: server.queue.getQueueSnapshot(),
    stats: server.stats,
    health: {
      status: 'healthy',
      llmConnection: server.worker?.isHealthy() ? 'ok' : 'disconnected',
      memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      lastError: null
    }
  };
}

export function buildPrioritizeResult(filePath, priority, position, avgTime) {
  return {
    status: position === 0 ? 'analyzing' : 'queued',
    filePath,
    priority,
    position,
    estimatedTime: estimateQueueTime(position, avgTime),
    requestId: undefined
  };
}

export function shouldPauseCurrentJob(currentJobPriority, newPriority) {
  return resolvePriorityLevel(newPriority) > resolvePriorityLevel(currentJobPriority);
}
