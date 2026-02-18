/**
 * @fileoverview Core Orchestrator Factory - Builders
 */

export class OrchestratorConfigBuilder {
  constructor() {
    this.projectPath = '/test/project';
    this.enableFileWatcher = true;
    this.enableWebSocket = true;
    this.autoStartLLM = true;
    this.ports = {
      webSocket: 9997
    };
  }

  withProjectPath(path) {
    this.projectPath = path;
    return this;
  }

  withFileWatcher(enabled) {
    this.enableFileWatcher = enabled;
    return this;
  }

  withWebSocket(enabled) {
    this.enableWebSocket = enabled;
    return this;
  }

  withPorts(ports) {
    this.ports = { ...this.ports, ...ports };
    return this;
  }

  asDefault() {
    this.enableFileWatcher = true;
    this.enableWebSocket = true;
    this.autoStartLLM = true;
    this.ports = { webSocket: 9997 };
    return this;
  }

  asMinimal() {
    this.enableFileWatcher = false;
    this.enableWebSocket = false;
    this.autoStartLLM = false;
    return this;
  }

  build() {
    return {
      projectPath: this.projectPath,
      enableFileWatcher: this.enableFileWatcher,
      enableWebSocket: this.enableWebSocket,
      autoStartLLM: this.autoStartLLM,
      ports: this.ports
    };
  }

  static create() {
    return new OrchestratorConfigBuilder();
  }
}

export class QueueItemBuilder {
  constructor() {
    this.filePath = 'test.js';
    this.priority = 'normal';
    this.timestamp = Date.now();
  }

  withFile(filePath) {
    this.filePath = filePath;
    return this;
  }

  withPriority(priority) {
    this.priority = priority;
    return this;
  }

  asCritical() {
    this.priority = 'critical';
    return this;
  }

  asHigh() {
    this.priority = 'high';
    return this;
  }

  asNormal() {
    this.priority = 'normal';
    return this;
  }

  withTimestamp(timestamp) {
    this.timestamp = timestamp;
    return this;
  }

  build() {
    return {
      filePath: this.filePath,
      priority: this.priority,
      timestamp: this.timestamp
    };
  }

  static create() {
    return new QueueItemBuilder();
  }
}

export class FileChangeEventBuilder {
  constructor() {
    this.filePath = 'test.js';
    this.changeType = 'modified';
    this.priority = 'normal';
  }

  withFile(filePath) {
    this.filePath = filePath;
    return this;
  }

  withChangeType(changeType) {
    this.changeType = changeType;
    return this;
  }

  asModified() {
    this.changeType = 'modified';
    return this;
  }

  asCreated() {
    this.changeType = 'created';
    return this;
  }

  asDeleted() {
    this.changeType = 'deleted';
    return this;
  }

  withPriority(priority) {
    this.priority = priority;
    return this;
  }

  build() {
    return {
      filePath: this.filePath,
      changeType: this.changeType,
      priority: this.priority
    };
  }

  static create() {
    return new FileChangeEventBuilder();
  }
}

export class AnalysisJobBuilder {
  constructor() {
    this.filePath = 'test.js';
    this.status = 'pending';
    this.startTime = null;
    this.endTime = null;
    this.duration = 0;
    this.result = null;
    this.error = null;
  }

  withFile(filePath) {
    this.filePath = filePath;
    return this;
  }

  withStatus(status) {
    this.status = status;
    return this;
  }

  asPending() {
    this.status = 'pending';
    this.startTime = null;
    this.endTime = null;
    return this;
  }

  asRunning() {
    this.status = 'running';
    this.startTime = Date.now() - 1000;
    this.endTime = null;
    return this;
  }

  asCompleted() {
    this.status = 'completed';
    this.startTime = Date.now() - 2000;
    this.endTime = Date.now();
    this.duration = 2000;
    this.result = { success: true };
    return this;
  }

  withDuration(ms) {
    this.duration = ms;
    this.startTime = Date.now() - ms;
    this.endTime = Date.now();
    return this;
  }

  build() {
    return {
      filePath: this.filePath,
      status: this.status,
      startTime: this.startTime,
      endTime: this.endTime,
      duration: this.duration,
      result: this.result,
      error: this.error
    };
  }

  static create() {
    return new AnalysisJobBuilder();
  }
}

export class StatsBuilder {
  constructor() {
    this.totalAnalyzed = 0;
    this.totalQueued = 0;
    this.avgTime = 0;
    this.cacheHitRate = 0;
  }

  withTotalAnalyzed(count) {
    this.totalAnalyzed = count;
    return this;
  }

  withQueueSize(size) {
    this.totalQueued = size;
    return this;
  }

  withAvgTime(ms) {
    this.avgTime = ms;
    return this;
  }

  withCacheHitRate(rate) {
    this.cacheHitRate = rate;
    return this;
  }

  build() {
    return {
      totalAnalyzed: this.totalAnalyzed,
      totalQueued: this.totalQueued,
      avgTime: this.avgTime,
      cacheHitRate: this.cacheHitRate
    };
  }

  static create() {
    return new StatsBuilder();
  }
}
