import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  calculatePriority: vi.fn(() => 7),
  loadDependencies: vi.fn(),
  executeBatch: vi.fn(async () => undefined),
  fileChangeCalls: [],
  batchCalls: []
}));

vi.mock('../../../../src/core/batch-processor/priority-calculator.js', () => ({
  calculatePriority: h.calculatePriority
}));

vi.mock('../../../../src/core/batch-processor/dependency-loader.js', () => ({
  loadDependencies: h.loadDependencies
}));

vi.mock('../../../../src/core/batch-processor/change-processor.js', () => ({
  executeBatch: h.executeBatch
}));

vi.mock('../../../../src/core/batch-processor/models/file-change.js', () => ({
  FileChange: class FileChange {
    constructor(filePath, changeType, options = {}) {
      h.fileChangeCalls.push({ filePath, changeType, options });
      this.filePath = filePath;
      this.changeType = changeType;
      this.priority = options.priority;
      this.timestamp = options.timestamp;
      this.metadata = options.metadata;
      this.maxRetries = options.maxRetries;
    }
  }
}));

vi.mock('../../../../src/core/batch-processor/models/batch.js', () => ({
  Batch: class Batch {
    constructor(id, changes = []) {
      h.batchCalls.push({ id, changes });
      this.id = id;
      this.changes = changes;
    }
  }
}));

import {
  buildBatchId,
  createProcessedChange,
  registerPendingChange,
  createBatchFromPendingChanges,
  enqueueBatch,
  runBatchThroughProcessor,
  shouldFlushBatch
} from '../../../../src/core/batch-processor/batch-processor-flow.js';

beforeEach(() => {
  h.calculatePriority.mockClear();
  h.loadDependencies.mockClear();
  h.executeBatch.mockClear();
  h.fileChangeCalls.length = 0;
  h.batchCalls.length = 0;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createProcessedChange', () => {
  it('creates a FileChange with calculated priority and timestamped metadata', () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1711111111111);

    const result = createProcessedChange('/tmp/example.js', 'modified', {
      priority: 42,
      metadata: { source: 'watcher' },
      maxRetries: 5
    });

    expect(h.calculatePriority).toHaveBeenCalledWith('/tmp/example.js', 'modified', {
      priority: 42,
      metadata: { source: 'watcher' },
      maxRetries: 5
    });
    expect(h.fileChangeCalls).toEqual([
      {
        filePath: '/tmp/example.js',
        changeType: 'modified',
        options: {
          priority: 7,
          metadata: {
            source: 'watcher',
            addedAt: 1711111111111
          },
          maxRetries: 5
        }
      }
    ]);
    expect(result.filePath).toBe('/tmp/example.js');
    expect(result.changeType).toBe('modified');
    expect(result.priority).toBe(7);
    expect(result.metadata).toEqual({
      source: 'watcher',
      addedAt: 1711111111111
    });
    expect(result.maxRetries).toBe(5);

    nowSpy.mockRestore();
  });
});

describe('registerPendingChange', () => {
  it('loads dependencies and stores the change by file path', () => {
    const pendingChanges = new Map();
    const instance = {
      options: {
        dependencyGraph: {
          '/tmp/example.js': {
            dependsOn: ['/tmp/a.js'],
            usedBy: ['/tmp/b.js']
          }
        }
      },
      pendingChanges
    };
    const change = { filePath: '/tmp/example.js' };

    registerPendingChange(instance, change);

    expect(h.loadDependencies).toHaveBeenCalledWith(change, instance.options.dependencyGraph);
    expect(instance.pendingChanges.get('/tmp/example.js')).toBe(change);
  });
});

describe('createBatchFromPendingChanges', () => {
  it('builds stable batch ids from the current timestamp and random source', () => {
    expect(buildBatchId(1722222222222, 0.123456789)).toBe('batch-1722222222222-4fzzzxjyl');
  });

  it('creates a batch from the current pending changes in insertion order', () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1722222222222);
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.123456789);
    const pendingChanges = new Map([
      ['/tmp/a.js', { filePath: '/tmp/a.js' }],
      ['/tmp/b.js', { filePath: '/tmp/b.js' }]
    ]);
    const instance = {
      pendingChanges
    };

    const batch = createBatchFromPendingChanges(instance);

    expect(h.batchCalls).toHaveLength(1);
    expect(h.batchCalls[0]).toEqual({
      id: 'batch-1722222222222-4fzzzxjyl',
      changes: [
        { filePath: '/tmp/a.js' },
        { filePath: '/tmp/b.js' }
      ]
    });
    expect(batch.id).toBe('batch-1722222222222-4fzzzxjyl');
    expect(batch.changes).toEqual([
      { filePath: '/tmp/a.js' },
      { filePath: '/tmp/b.js' }
    ]);

    nowSpy.mockRestore();
    randomSpy.mockRestore();
  });
});

describe('enqueueBatch', () => {
  it('pushes the batch into the processing queue and clears pending changes', () => {
    const pendingChanges = { clear: vi.fn() };
    const batch = { id: 'batch-1' };
    const instance = {
      processingQueue: [],
      pendingChanges
    };

    enqueueBatch(instance, batch);

    expect(instance.processingQueue).toEqual([batch]);
    expect(pendingChanges.clear).toHaveBeenCalledTimes(1);
  });
});

describe('runBatchThroughProcessor', () => {
  it('delegates execution to the batch processor with the instance processChange handler', async () => {
    const processChange = vi.fn(async () => undefined);
    const instance = {
      options: {
        processChange
      }
    };
    const batch = { id: 'batch-1' };

    await runBatchThroughProcessor(instance, batch);

    expect(h.executeBatch).toHaveBeenCalledTimes(1);
    expect(h.executeBatch).toHaveBeenCalledWith(batch, {
      processFn: processChange,
      emitter: instance
    });
  });
});

describe('shouldFlushBatch', () => {
  it('returns true when the pending change count reaches the batch size threshold', () => {
    const instance = {
      options: {
        maxBatchSize: 2
      },
      pendingChanges: new Map([
        ['/tmp/a.js', { filePath: '/tmp/a.js' }],
        ['/tmp/b.js', { filePath: '/tmp/b.js' }]
      ])
    };

    expect(shouldFlushBatch(instance)).toBe(true);
  });

  it('returns false when the pending change count is below the threshold', () => {
    const instance = {
      options: {
        maxBatchSize: 3
      },
      pendingChanges: new Map([
        ['/tmp/a.js', { filePath: '/tmp/a.js' }],
        ['/tmp/b.js', { filePath: '/tmp/b.js' }]
      ])
    };

    expect(shouldFlushBatch(instance)).toBe(false);
  });
});
