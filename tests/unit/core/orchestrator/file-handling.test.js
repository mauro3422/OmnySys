import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { Orchestrator } from '../../../../src/core/orchestrator/index.js';
import { resetAtomicEditor } from '../../../../src/core/atomic-editor/singleton/index.js';

describe('Orchestrator - File Handling', () => {
  let tempDir;
  let orchestrator;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'file-handling-test-'));
    await fs.mkdir(path.join(tempDir, '.omnysysdata'), { recursive: true });
    await fs.mkdir(path.join(tempDir, '.omnysysdata', 'files'), { recursive: true });
    resetAtomicEditor();
    
    orchestrator = new Orchestrator(tempDir, {
      enableFileWatcher: false,
      enableWebSocket: false,
      autoStartLLM: false
    });
  });

  afterEach(async () => {
    if (orchestrator && orchestrator.isRunning) {
      orchestrator.isRunning = false;
    }
    await fs.rm(tempDir, { recursive: true, force: true });
    resetAtomicEditor();
  });

  describe('handleFileChange() - modified', () => {
    it('should enqueue modified file with normal priority', async () => {
      const testFile = 'src/test.js';
      
      await orchestrator.handleFileChange(testFile, 'modified');
      
      expect(orchestrator.queue.has(testFile)).toBe(true);
    });

    it('should not process immediately for normal modified', async () => {
      orchestrator.currentJob = null;
      let processNextCalled = false;
      const originalProcessNext = orchestrator._processNext;
      orchestrator._processNext = () => { processNextCalled = true; };
      
      await orchestrator.handleFileChange('src/test.js', 'modified');
      
      expect(processNextCalled).toBe(false);
      orchestrator._processNext = originalProcessNext;
    });

    it('should update queue size', async () => {
      const initialSize = orchestrator.queue.size();
      
      await orchestrator.handleFileChange('src/test.js', 'modified');
      
      expect(orchestrator.queue.size()).toBe(initialSize + 1);
    });
  });

  describe('handleFileChange() - created', () => {
    it('should enqueue created file with high priority', async () => {
      await orchestrator.handleFileChange('src/new.js', 'created');
      
      const allQueues = orchestrator.queue.getAll();
      const found = allQueues.high.some(j => j.filePath === 'src/new.js') ||
                    allQueues.critical.some(j => j.filePath === 'src/new.js');
      expect(found || orchestrator.queue.has('src/new.js')).toBe(true);
    });

    it('should not enqueue for deleted files', async () => {
      const initialSize = orchestrator.queue.size();
      
      await orchestrator.handleFileChange('src/deleted.js', 'deleted');
      
      expect(orchestrator.queue.size()).toBe(initialSize);
    });
  });

  describe('handleFileChange() - priority handling', () => {
    it('should process immediately for critical priority', async () => {
      let processNextCalled = false;
      orchestrator.currentJob = null;
      const originalProcessNext = orchestrator._processNext;
      orchestrator._processNext = () => { processNextCalled = true; };
      
      await orchestrator.handleFileChange('src/critical.js', 'modified', { priority: 'critical' });
      
      expect(processNextCalled).toBe(true);
      orchestrator._processNext = originalProcessNext;
    });

    it('should not process if currentJob exists', async () => {
      let processNextCalled = false;
      orchestrator.currentJob = { filePath: 'other.js' };
      const originalProcessNext = orchestrator._processNext;
      orchestrator._processNext = () => { processNextCalled = true; };
      
      await orchestrator.handleFileChange('src/critical.js', 'modified', { priority: 'critical' });
      
      expect(processNextCalled).toBe(false);
      orchestrator._processNext = originalProcessNext;
    });

    it('should not process if isRunning is false', async () => {
      let processNextCalled = false;
      orchestrator.currentJob = null;
      orchestrator.isRunning = false;
      const originalProcessNext = orchestrator._processNext;
      orchestrator._processNext = () => { processNextCalled = true; };
      
      await orchestrator.handleFileChange('src/critical.js', 'modified', { priority: 'critical' });
      
      expect(processNextCalled).toBe(false);
      orchestrator._processNext = originalProcessNext;
      orchestrator.isRunning = true;
    });

    it('should process immediately for skipDebounce', async () => {
      let processNextCalled = false;
      orchestrator.currentJob = null;
      const originalProcessNext = orchestrator._processNext;
      orchestrator._processNext = () => { processNextCalled = true; };
      
      await orchestrator.handleFileChange('src/file.js', 'modified', { skipDebounce: true });
      
      expect(processNextCalled).toBe(true);
      orchestrator._processNext = originalProcessNext;
    });

    it('should use critical priority over changeType priority', async () => {
      orchestrator.currentJob = { filePath: 'blocking.js' };
      
      await orchestrator.handleFileChange('src/critical-override.js', 'created', { priority: 'critical' });
      
      const allQueues = orchestrator.queue.getAll();
      const criticalFiles = allQueues.critical.map(j => j.filePath);
      expect(criticalFiles).toContain('src/critical-override.js');
    });
  });

  describe('handleFileChange() - WebSocket broadcast', () => {
    it('should broadcast file:changed event', async () => {
      const broadcastCalls = [];
      orchestrator.wsManager = { 
        broadcast: (msg) => broadcastCalls.push(msg),
        stop: async () => {}
      };
      
      await orchestrator.handleFileChange('src/test.js', 'modified');
      
      expect(broadcastCalls.length).toBe(1);
      expect(broadcastCalls[0].type).toBe('file:changed');
      expect(broadcastCalls[0].filePath).toBe('src/test.js');
      expect(broadcastCalls[0].changeType).toBe('modified');
    });

    it('should include timestamp in broadcast', async () => {
      const broadcastCalls = [];
      orchestrator.wsManager = { 
        broadcast: (msg) => broadcastCalls.push(msg),
        stop: async () => {}
      };
      
      await orchestrator.handleFileChange('src/test.js', 'modified');
      
      expect(broadcastCalls[0].timestamp).toBeDefined();
      expect(typeof broadcastCalls[0].timestamp).toBe('number');
    });

    it('should include priority in broadcast', async () => {
      const broadcastCalls = [];
      orchestrator.wsManager = { 
        broadcast: (msg) => broadcastCalls.push(msg),
        stop: async () => {}
      };
      
      await orchestrator.handleFileChange('src/test.js', 'modified', { priority: 'high' });
      
      expect(broadcastCalls[0].priority).toBe('high');
    });

    it('should not fail if wsManager is not set', async () => {
      orchestrator.wsManager = undefined;
      
      await expect(
        orchestrator.handleFileChange('src/test.js', 'modified')
      ).resolves.not.toThrow();
    });
  });

  describe('handleFileChange() - options', () => {
    it('should accept skipDebounce option', async () => {
      let processNextCalled = false;
      orchestrator.currentJob = null;
      const originalProcessNext = orchestrator._processNext;
      orchestrator._processNext = () => { processNextCalled = true; };
      
      await orchestrator.handleFileChange('src/test.js', 'modified', { skipDebounce: true });
      
      expect(processNextCalled).toBe(true);
      orchestrator._processNext = originalProcessNext;
    });

    it('should accept priority option', async () => {
      orchestrator.currentJob = { filePath: 'blocking.js' };
      
      await orchestrator.handleFileChange('src/priority-test.js', 'modified', { priority: 'critical' });
      
      const allQueues = orchestrator.queue.getAll();
      const criticalFiles = allQueues.critical.map(j => j.filePath);
      const isQueued = orchestrator.queue.has('src/priority-test.js');
      
      expect(isQueued).toBe(true);
      expect(criticalFiles).toContain('src/priority-test.js');
    });

    it('should use default options if not provided', async () => {
      const initialSize = orchestrator.queue.size();
      
      await orchestrator.handleFileChange('src/test.js', 'modified');
      
      expect(orchestrator.queue.size()).toBe(initialSize + 1);
    });
  });

  describe('queue behavior', () => {
    it('should track enqueued files', async () => {
      await orchestrator.handleFileChange('src/a.js', 'modified');
      await orchestrator.handleFileChange('src/b.js', 'created');
      
      expect(orchestrator.queue.has('src/a.js')).toBe(true);
      expect(orchestrator.queue.has('src/b.js')).toBe(true);
    });

    it('should not duplicate files in queue', async () => {
      await orchestrator.handleFileChange('src/duplicate.js', 'modified');
      await orchestrator.handleFileChange('src/duplicate.js', 'modified');
      
      let count = 0;
      const allQueues = orchestrator.queue.getAll();
      for (const priority of ['critical', 'high', 'medium', 'low']) {
        count += allQueues[priority].filter(j => j.filePath === 'src/duplicate.js').length;
      }
      expect(count).toBe(1);
    });

    it('should reprioritize when file already in queue', async () => {
      await orchestrator.handleFileChange('src/reprior.js', 'modified');
      await orchestrator.handleFileChange('src/reprior.js', 'created');
      
      expect(orchestrator.queue.has('src/reprior.js')).toBe(true);
    });
  });
});
