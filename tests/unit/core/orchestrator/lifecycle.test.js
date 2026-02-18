import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { Orchestrator } from '../../../../src/core/orchestrator/index.js';
import { resetAtomicEditor } from '../../../../src/core/atomic-editor/singleton/index.js';

describe('Orchestrator - Lifecycle', () => {
  let tempDir;
  let orchestrator;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lifecycle-test-'));
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
      await orchestrator.stop();
    }
    await fs.rm(tempDir, { recursive: true, force: true });
    resetAtomicEditor();
  });

  describe('stop()', () => {
    it('should set isRunning to false', async () => {
      orchestrator.isRunning = true;
      
      await orchestrator.stop();
      
      expect(orchestrator.isRunning).toBe(false);
    });

    it('should stop file watcher', async () => {
      let stopped = false;
      orchestrator.fileWatcher = { stop: async () => { stopped = true; } };
      
      await orchestrator.stop();
      
      expect(stopped).toBe(true);
    });

    it('should stop batch processor', async () => {
      let stopped = false;
      orchestrator.batchProcessor = { stop: () => { stopped = true; } };
      
      await orchestrator.stop();
      
      expect(stopped).toBe(true);
    });

    it('should stop wsManager', async () => {
      let stopped = false;
      orchestrator.wsManager = { stop: async () => { stopped = true; } };
      
      await orchestrator.stop();
      
      expect(stopped).toBe(true);
    });

    it('should stop worker', async () => {
      let stopped = false;
      orchestrator.worker = { stop: async () => { stopped = true; } };
      
      await orchestrator.stop();
      
      expect(stopped).toBe(true);
    });

    it('should stop LLM health checker', async () => {
      orchestrator._llmHealthRunning = true;
      
      await orchestrator.stop();
      
      expect(orchestrator._llmHealthRunning).toBe(false);
    });

    it('should handle missing components gracefully', async () => {
      orchestrator.fileWatcher = null;
      orchestrator.batchProcessor = null;
      orchestrator.wsManager = null;
      orchestrator.worker = null;
      
      await expect(orchestrator.stop()).resolves.not.toThrow();
    });

    it('should be idempotent', async () => {
      orchestrator.isRunning = true;
      
      await orchestrator.stop();
      await orchestrator.stop();
      
      expect(orchestrator.isRunning).toBe(false);
    });
  });

  describe('State management', () => {
    it('should track isRunning state', () => {
      expect(orchestrator.isRunning).toBe(true);
      
      orchestrator.isRunning = false;
      
      expect(orchestrator.isRunning).toBe(false);
    });

    it('should track isIndexing state', () => {
      expect(orchestrator.isIndexing).toBe(false);
      
      orchestrator.isIndexing = true;
      
      expect(orchestrator.isIndexing).toBe(true);
    });

    it('should track indexingProgress', () => {
      expect(orchestrator.indexingProgress).toBe(0);
      
      orchestrator.indexingProgress = 50;
      
      expect(orchestrator.indexingProgress).toBe(50);
    });

    it('should track currentJob', () => {
      expect(orchestrator.currentJob).toBeNull();
      
      orchestrator.currentJob = { filePath: 'test.js' };
      
      expect(orchestrator.currentJob.filePath).toBe('test.js');
    });

    it('should track stats', () => {
      expect(orchestrator.stats.totalAnalyzed).toBe(0);
      
      orchestrator.stats.totalAnalyzed = 5;
      
      expect(orchestrator.stats.totalAnalyzed).toBe(5);
    });

    it('should track startTime', () => {
      expect(orchestrator.startTime).toBeDefined();
      expect(typeof orchestrator.startTime).toBe('number');
    });

    it('should track indexedFiles', () => {
      expect(orchestrator.indexedFiles).toBeInstanceOf(Set);
      expect(orchestrator.indexedFiles.size).toBe(0);
      
      orchestrator.indexedFiles.add('file1.js');
      orchestrator.indexedFiles.add('file2.js');
      
      expect(orchestrator.indexedFiles.size).toBe(2);
    });

    it('should track processedFiles', () => {
      expect(orchestrator.processedFiles).toBeInstanceOf(Set);
      expect(orchestrator.processedFiles.size).toBe(0);
      
      orchestrator.processedFiles.add('processed.js');
      
      expect(orchestrator.processedFiles.has('processed.js')).toBe(true);
    });
  });

  describe('getStatus()', () => {
    it('should return current status', () => {
      const status = orchestrator.getStatus();
      
      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('isIndexing');
      expect(status).toHaveProperty('indexingProgress');
      expect(status).toHaveProperty('currentJob');
      expect(status).toHaveProperty('queueSize');
      expect(status).toHaveProperty('stats');
      expect(status).toHaveProperty('uptime');
    });

    it('should calculate uptime', () => {
      const beforeTime = Date.now() - orchestrator.startTime;
      
      const status = orchestrator.getStatus();
      
      expect(status.uptime).toBeGreaterThanOrEqual(beforeTime);
    });

    it('should reflect current state', () => {
      orchestrator.isIndexing = true;
      orchestrator.indexingProgress = 75;
      orchestrator.stats.totalAnalyzed = 10;
      
      const status = orchestrator.getStatus();
      
      expect(status.isIndexing).toBe(true);
      expect(status.indexingProgress).toBe(75);
      expect(status.stats.totalAnalyzed).toBe(10);
    });

    it('should reflect queue size', () => {
      orchestrator.queue.enqueue('file1.js', 'normal');
      orchestrator.queue.enqueue('file2.js', 'high');
      
      const status = orchestrator.getStatus();
      
      expect(status.queueSize).toBe(2);
    });

    it('should reflect running state changes', () => {
      expect(orchestrator.getStatus().isRunning).toBe(true);
      
      orchestrator.isRunning = false;
      
      expect(orchestrator.getStatus().isRunning).toBe(false);
    });
  });

  describe('constructor defaults', () => {
    it('should have correct default maxIterations', () => {
      expect(orchestrator.maxIterations).toBe(10);
    });

    it('should start with iteration 0', () => {
      expect(orchestrator.iteration).toBe(0);
    });

    it('should start with isIterating false', () => {
      expect(orchestrator.isIterating).toBe(false);
    });

    it('should have empty iterativeQueue', () => {
      expect(orchestrator.iterativeQueue).toEqual([]);
    });

    it('should have totalFilesToAnalyze at 0', () => {
      expect(orchestrator.totalFilesToAnalyze).toBe(0);
    });

    it('should have analysisCompleteEmitted false', () => {
      expect(orchestrator.analysisCompleteEmitted).toBe(false);
    });

    it('should have null worker initially', () => {
      expect(orchestrator.worker).toBeNull();
    });

    it('should have null stateManager initially', () => {
      expect(orchestrator.stateManager).toBeNull();
    });

    it('should have null fileWatcher initially', () => {
      expect(orchestrator.fileWatcher).toBeNull();
    });

    it('should have null batchProcessor initially', () => {
      expect(orchestrator.batchProcessor).toBeNull();
    });

    it('should have null wsManager initially', () => {
      expect(orchestrator.wsManager).toBeNull();
    });

    it('should have null cache initially', () => {
      expect(orchestrator.cache).toBeNull();
    });
  });

  describe('OmnySysDataPath', () => {
    it('should be set correctly', () => {
      expect(orchestrator.OmnySysDataPath).toBe(path.join(tempDir, '.omnysysdata'));
    });
  });

  describe('EventEmitter', () => {
    it('should extend EventEmitter', () => {
      expect(typeof orchestrator.on).toBe('function');
      expect(typeof orchestrator.emit).toBe('function');
      expect(typeof orchestrator.off).toBe('function');
    });

    it('should emit and receive events', () => {
      let received = false;
      orchestrator.on('test:event', () => { received = true; });
      
      orchestrator.emit('test:event');
      
      expect(received).toBe(true);
    });
  });
});
