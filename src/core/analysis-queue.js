/**
 * analysis-queue.js
 * Cola de prioridad para trabajos de análisis
 *
 * Prioridades: CRITICAL > HIGH > MEDIUM > LOW
 */

const PRIORITY_ORDER = ['critical', 'high', 'medium', 'low'];

function normalizePriority(priority) {
  const normalized = priority?.toLowerCase();
  return PRIORITY_ORDER.includes(normalized) ? normalized : 'low';
}

function getPosition(queue, filePath) {
  let position = 0;

  for (const priority of PRIORITY_ORDER) {
    const index = queue.queues[priority].findIndex((job) => job.filePath === filePath);
    if (index !== -1) {
      return position + index;
    }
    position += queue.queues[priority].length;
  }

  return -1;
}

function reprioritize(queue, filePath, newPriority) {
  for (const priority of PRIORITY_ORDER) {
    const index = queue.queues[priority].findIndex((job) => job.filePath === filePath);
    if (index !== -1) {
      const [job] = queue.queues[priority].splice(index, 1);
      job.priority = newPriority;
      job.reprioritizedAt = Date.now();
      queue.queues[newPriority].push(job);
      return;
    }
  }
}

function enqueueItem(queue, filePath, priority = 'low') {
  const validPriority = normalizePriority(priority);

  if (queue.enqueuedFiles.has(filePath)) {
    reprioritize(queue, filePath, validPriority);
    return getPosition(queue, filePath);
  }

  queue.queues[validPriority].push({
    filePath,
    priority: validPriority,
    enqueuedAt: Date.now()
  });

  queue.enqueuedFiles.add(filePath);
  return getPosition(queue, filePath);
}

function enqueueJobItem(queue, job, priority = 'low') {
  if (!job || !job.filePath) {
    throw new Error('Job must have a filePath property');
  }

  const validPriority = normalizePriority(priority);

  if (queue.enqueuedFiles.has(job.filePath)) {
    reprioritize(queue, job.filePath, validPriority);
    return getPosition(queue, job.filePath);
  }

  queue.queues[validPriority].push({
    ...job,
    priority: validPriority,
    enqueuedAt: Date.now()
  });

  queue.enqueuedFiles.add(job.filePath);
  return getPosition(queue, job.filePath);
}

function dequeueNext(queue) {
  for (const priority of PRIORITY_ORDER) {
    if (queue.queues[priority].length > 0) {
      const job = queue.queues[priority].shift();
      queue.enqueuedFiles.delete(job.filePath);
      return job;
    }
  }

  return null;
}

function peekNext(queue) {
  for (const priority of PRIORITY_ORDER) {
    if (queue.queues[priority].length > 0) {
      return queue.queues[priority][0];
    }
  }

  return null;
}

function getAllQueues(queue) {
  return {
    critical: [...queue.queues.critical],
    high: [...queue.queues.high],
    medium: [...queue.queues.medium],
    low: [...queue.queues.low]
  };
}

function resetQueueState(queue) {
  queue.queues.critical = [];
  queue.queues.high = [];
  queue.queues.medium = [];
  queue.queues.low = [];
  queue.enqueuedFiles.clear();
}

export class AnalysisQueue {
  constructor() {
    this.queues = {
      critical: [],
      high: [],
      medium: [],
      low: []
    };

    this.enqueuedFiles = new Set();
  }

  enqueue(filePath, priority = 'low') {
    return enqueueItem(this, filePath, priority);
  }

  enqueueJob(job, priority = 'low') {
    return enqueueJobItem(this, job, priority);
  }

  dequeue() {
    return dequeueNext(this);
  }

  peek() {
    return peekNext(this);
  }

  getPosition(filePath) {
    return getPosition(this, filePath);
  }

  findPosition(filePath) {
    return this.getPosition(filePath);
  }

  reprioritize(filePath, newPriority) {
    return reprioritize(this, filePath, newPriority);
  }

  getQueueSnapshot() {
    return getAllQueues(this);
  }

  getAll() {
    return this.getQueueSnapshot();
  }

  size() {
    return this.enqueuedFiles.size;
  }

  containsFile(filePath) {
    return this.enqueuedFiles.has(filePath);
  }

  resetQueue() {
    resetQueueState(this);
  }

  normalizePriority(priority) {
    return normalizePriority(priority);
  }
}
