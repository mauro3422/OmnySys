import { describe, it, expect, beforeEach } from 'vitest';
import { AnalysisQueue } from '../../../../src/core/analysis-queue.js';
import { QueueItemBuilder } from '../../../factories/core-orchestrator/index.js';

describe('AnalysisQueue', () => {
  let queue;

  beforeEach(() => {
    queue = new AnalysisQueue();
  });

  describe('enqueue()', () => {
    it('should add item to queue', () => {
      const item = new QueueItemBuilder().withFile('test.js').build();
      
      queue.enqueue(item.filePath, 'normal');
      
      expect(queue.has('test.js')).toBe(true);
    });

    it('should return position in queue', () => {
      const pos1 = queue.enqueue('file1.js', 'normal');
      const pos2 = queue.enqueue('file2.js', 'normal');
      
      expect(pos1).toBe(0);
      expect(pos2).toBe(1);
    });

    it('should not duplicate files', () => {
      queue.enqueue('test.js', 'normal');
      queue.enqueue('test.js', 'normal');
      
      expect(queue.size()).toBe(1);
    });

    it('should reprioritize if higher priority requested', () => {
      queue.enqueue('test.js', 'low');
      queue.enqueue('test.js', 'critical');
      
      const peeked = queue.peek();
      expect(peeked.priority).toBe('critical');
    });
  });

  describe('dequeue()', () => {
    it('should return null when empty', () => {
      expect(queue.dequeue()).toBeNull();
    });

    it('should return item from queue', () => {
      queue.enqueue('test.js', 'normal');
      
      const item = queue.dequeue();
      
      expect(item.filePath).toBe('test.js');
    });

    it('should remove item from queue', () => {
      queue.enqueue('test.js', 'normal');
      queue.dequeue();
      
      expect(queue.size()).toBe(0);
    });

    it('should return items in priority order - critical first', () => {
      queue.enqueue('low.js', 'low');
      queue.enqueue('critical.js', 'critical');
      queue.enqueue('normal.js', 'normal');
      
      const item = queue.dequeue();
      
      expect(item.filePath).toBe('critical.js');
    });

    it('should return items in priority order - high first among high/medium/low', () => {
      queue.enqueue('low.js', 'low');
      queue.enqueue('high.js', 'high');
      queue.enqueue('medium.js', 'medium');
      
      const item = queue.dequeue();
      
      expect(item.filePath).toBe('high.js');
    });

    it('should return items in priority order - medium after high', () => {
      queue.enqueue('low.js', 'low');
      queue.enqueue('high.js', 'high');
      queue.enqueue('medium.js', 'medium');
      
      queue.dequeue();
      const item = queue.dequeue();
      
      expect(item.filePath).toBe('medium.js');
    });

    it('should return items in priority order - low after medium', () => {
      queue.enqueue('low.js', 'low');
      queue.enqueue('medium.js', 'medium');
      
      queue.dequeue();
      const item = queue.dequeue();
      
      expect(item.filePath).toBe('low.js');
    });

    it('should return items in priority order - low last', () => {
      queue.enqueue('low1.js', 'low');
      queue.enqueue('low2.js', 'low');
      
      queue.dequeue();
      const item = queue.dequeue();
      
      expect(item.filePath).toBe('low2.js');
    });
  });

  describe('Priority handling', () => {
    it('should handle critical priority', () => {
      queue.enqueue('critical.js', 'critical');
      
      const item = queue.peek();
      expect(item.priority).toBe('critical');
    });

    it('should handle high priority', () => {
      queue.enqueue('high.js', 'high');
      
      const item = queue.peek();
      expect(item.priority).toBe('high');
    });

    it('should handle medium priority', () => {
      queue.enqueue('medium.js', 'medium');
      
      const item = queue.peek();
      expect(item.priority).toBe('medium');
    });

    it('should handle low priority', () => {
      queue.enqueue('low.js', 'low');
      
      const item = queue.peek();
      expect(item.priority).toBe('low');
    });

    it('should normalize invalid priority to low', () => {
      queue.enqueue('test.js', 'invalid');
      
      const item = queue.peek();
      expect(item.priority).toBe('low');
    });
  });

  describe('size()', () => {
    it('should return 0 for empty queue', () => {
      expect(queue.size()).toBe(0);
    });

    it('should return correct count', () => {
      queue.enqueue('file1.js', 'normal');
      queue.enqueue('file2.js', 'normal');
      queue.enqueue('file3.js', 'normal');
      
      expect(queue.size()).toBe(3);
    });

    it('should decrease after dequeue', () => {
      queue.enqueue('file1.js', 'normal');
      queue.enqueue('file2.js', 'normal');
      
      queue.dequeue();
      
      expect(queue.size()).toBe(1);
    });
  });

  describe('peek()', () => {
    it('should return null when empty', () => {
      expect(queue.peek()).toBeNull();
    });

    it('should return item without removing', () => {
      queue.enqueue('test.js', 'normal');
      
      queue.peek();
      
      expect(queue.size()).toBe(1);
    });

    it('should return highest priority item', () => {
      queue.enqueue('low.js', 'low');
      queue.enqueue('critical.js', 'critical');
      
      const item = queue.peek();
      
      expect(item.filePath).toBe('critical.js');
    });
  });

  describe('has()', () => {
    it('should return false for missing file', () => {
      expect(queue.has('missing.js')).toBe(false);
    });

    it('should return true for enqueued file', () => {
      queue.enqueue('test.js', 'normal');
      
      expect(queue.has('test.js')).toBe(true);
    });
  });

  describe('clear()', () => {
    it('should empty all queues', () => {
      queue.enqueue('critical.js', 'critical');
      queue.enqueue('high.js', 'high');
      queue.enqueue('normal.js', 'normal');
      queue.enqueue('low.js', 'low');
      
      queue.clear();
      
      expect(queue.size()).toBe(0);
    });

    it('should clear enqueued files set', () => {
      queue.enqueue('test.js', 'normal');
      
      queue.clear();
      
      expect(queue.has('test.js')).toBe(false);
    });
  });

  describe('getAll()', () => {
    it('should return all queues', () => {
      queue.enqueue('critical.js', 'critical');
      queue.enqueue('high.js', 'high');
      
      const all = queue.getAll();
      
      expect(all.critical.length).toBe(1);
      expect(all.high.length).toBe(1);
      expect(all.medium.length).toBe(0);
      expect(all.low.length).toBe(0);
    });
  });

  describe('getPosition()', () => {
    it('should return -1 for missing file', () => {
      expect(queue.getPosition('missing.js')).toBe(-1);
    });

    it('should return 0 for first item', () => {
      queue.enqueue('first.js', 'normal');
      
      expect(queue.getPosition('first.js')).toBe(0);
    });

    it('should return correct position across priorities', () => {
      queue.enqueue('low.js', 'low');
      queue.enqueue('critical.js', 'critical');
      
      expect(queue.getPosition('critical.js')).toBe(0);
      expect(queue.getPosition('low.js')).toBe(1);
    });
  });

  describe('enqueueJob()', () => {
    it('should add job with metadata', () => {
      const job = { filePath: 'test.js', customData: 'value' };
      
      queue.enqueueJob(job, 'normal');
      
      const item = queue.peek();
      expect(item.customData).toBe('value');
    });

    it('should throw without filePath', () => {
      expect(() => queue.enqueueJob({})).toThrow('filePath property');
    });
  });
});
