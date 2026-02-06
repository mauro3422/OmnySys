import path from 'path';

// ============================================================
// Orchestrator Logic
// ============================================================

export async function handlePrioritize(filePath, priority, requestId) {
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

  console.log(`ðŸ“¥ Queued: ${path.basename(filePath)} [${priority}] at position ${position}`);

  // If CRITICAL and lower priority job running, pause it
  if (priority === 'critical' && this.currentJob) {
    const currentPriority = this.getPriorityLevel(this.currentJob.priority);
    const newPriority = this.getPriorityLevel(priority);

    if (newPriority > currentPriority) {
      console.log(`â¸ï¸  Pausing current job to prioritize ${path.basename(filePath)}`);
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

export async function processNext() {
  if (!this.isRunning || this.currentJob) {
    return;
  }

  const nextJob = this.queue.dequeue();
  if (!nextJob) {
    console.log('ðŸ“­ Queue empty, waiting for jobs...');
    return;
  }

  console.log(`âš¡ Processing: ${path.basename(nextJob.filePath)} [${nextJob.priority}]`);
  this.currentJob = { ...nextJob, progress: 0, stage: 'starting' };
  await this.updateState();

  this.worker.analyze(nextJob);
}

export async function updateState() {
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

export function getPriorityLevel(priority) {
  const levels = { critical: 4, high: 3, medium: 2, low: 1 };
  return levels[priority] || 0;
}

export function calculateETA(position) {
  const avgTime = this.stats.avgTime || 3000;
  return position * avgTime;
}

export function invalidateCache(filePath) {
  this.cache.ramCacheInvalidate(`impact:${filePath}`);
  this.cache.ramCacheInvalidate(`file:${filePath}`);
}

export async function restart() {
  console.log('ðŸ”„ Restarting orchestrator...');
  await this.worker.stop();
  this.queue.clear();
  this.currentJob = null;
  this.isRunning = true;
  await this.worker.initialize();
  await this.updateState();
  console.log('âœ… Orchestrator restarted');
}
