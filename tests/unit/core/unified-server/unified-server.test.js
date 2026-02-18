import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { AnalysisQueue } from '#core/analysis-queue.js';
import { ServerConfigBuilder } from '#test-factories/core-unified-server';

describe('AnalysisQueue', () => {
  let queue;

  beforeEach(() => {
    queue = new AnalysisQueue();
  });

  it('should start empty', () => {
    expect(queue.size()).toBe(0);
  });

  it('should enqueue files', () => {
    queue.enqueue('/src/test.js', 'high');
    expect(queue.size()).toBe(1);
  });

  it('should dequeue in priority order', () => {
    queue.enqueue('/src/low.js', 'low');
    queue.enqueue('/src/critical.js', 'critical');
    
    const job = queue.dequeue();
    expect(job.filePath).toBe('/src/critical.js');
  });

  it('should dequeue critical before high', () => {
    queue.enqueue('/src/high.js', 'high');
    queue.enqueue('/src/critical.js', 'critical');
    
    const job = queue.dequeue();
    expect(job.filePath).toBe('/src/critical.js');
  });

  it('should dequeue high before medium', () => {
    queue.enqueue('/src/medium.js', 'medium');
    queue.enqueue('/src/high.js', 'high');
    
    const job = queue.dequeue();
    expect(job.filePath).toBe('/src/high.js');
  });

  it('should dequeue medium before low', () => {
    queue.enqueue('/src/low.js', 'low');
    queue.enqueue('/src/medium.js', 'medium');
    
    const job = queue.dequeue();
    expect(job.filePath).toBe('/src/medium.js');
  });

  it('should track enqueued files', () => {
    queue.enqueue('/src/test.js', 'medium');
    expect(queue.has('/src/test.js')).toBe(true);
    expect(queue.has('/src/other.js')).toBe(false);
  });

  it('should return all queues', () => {
    queue.enqueue('/src/a.js', 'critical');
    queue.enqueue('/src/b.js', 'low');
    
    const all = queue.getAll();
    expect(all.critical.length).toBe(1);
    expect(all.low.length).toBe(1);
  });

  it('should return position in queue', () => {
    queue.enqueue('/src/first.js', 'high');
    queue.enqueue('/src/second.js', 'high');
    
    expect(queue.getPosition('/src/first.js')).toBe(0);
    expect(queue.getPosition('/src/second.js')).toBe(1);
  });

  it('should return -1 for non-existent file', () => {
    expect(queue.getPosition('/src/nonexistent.js')).toBe(-1);
  });

  it('should peek at next job without removing', () => {
    queue.enqueue('/src/test.js', 'high');
    
    const job = queue.peek();
    expect(job.filePath).toBe('/src/test.js');
    expect(queue.size()).toBe(1);
  });

  it('should return null when peeking empty queue', () => {
    expect(queue.peek()).toBeNull();
  });

  it('should return null when dequeuing empty queue', () => {
    expect(queue.dequeue()).toBeNull();
  });

  it('should clear all queues', () => {
    queue.enqueue('/src/a.js', 'critical');
    queue.enqueue('/src/b.js', 'high');
    queue.enqueue('/src/c.js', 'medium');
    queue.enqueue('/src/d.js', 'low');
    
    queue.clear();
    expect(queue.size()).toBe(0);
    expect(queue.has('/src/a.js')).toBe(false);
  });

  it('should handle enqueueJob with metadata', () => {
    queue.enqueueJob({ filePath: '/src/test.js', reason: 'modified' }, 'high');
    
    const job = queue.dequeue();
    expect(job.filePath).toBe('/src/test.js');
    expect(job.reason).toBe('modified');
    expect(job.priority).toBe('high');
  });

  it('should throw on enqueueJob without filePath', () => {
    expect(() => queue.enqueueJob({})).toThrow('Job must have a filePath property');
  });

  it('should normalize invalid priority to low', () => {
    queue.enqueue('/src/test.js', 'invalid');
    
    const all = queue.getAll();
    expect(all.low.length).toBe(1);
    expect(all.low[0].priority).toBe('low');
  });

  it('should reprioritize existing file', () => {
    queue.enqueue('/src/test.js', 'low');
    queue.enqueue('/src/test.js', 'critical');
    
    const job = queue.dequeue();
    expect(job.filePath).toBe('/src/test.js');
    expect(job.priority).toBe('critical');
  });

  it('should track enqueuedAt timestamp', () => {
    const before = Date.now();
    queue.enqueue('/src/test.js', 'medium');
    const after = Date.now();
    
    const all = queue.getAll();
    expect(all.medium[0].enqueuedAt).toBeGreaterThanOrEqual(before);
    expect(all.medium[0].enqueuedAt).toBeLessThanOrEqual(after);
  });
});

describe('ServerConfigBuilder', () => {
  it('should build default config', () => {
    const config = ServerConfigBuilder.create().build();
    
    expect(config).toHaveProperty('projectPath');
    expect(config).toHaveProperty('ports');
    expect(config.ports.orchestrator).toBe(9999);
    expect(config.ports.bridge).toBe(9998);
  });

  it('should build config with custom project path', () => {
    const config = ServerConfigBuilder.create()
      .withProjectPath('/custom/path')
      .build();
    
    expect(config.projectPath).toBe('/custom/path');
  });

  it('should build config with custom ports', () => {
    const config = ServerConfigBuilder.create()
      .withPorts(8080, 8081)
      .build();
    
    expect(config.ports.orchestrator).toBe(8080);
    expect(config.ports.bridge).toBe(8081);
  });

  it('should build default config', () => {
    const config = ServerConfigBuilder.create()
      .asDefault()
      .build();
    
    expect(config.projectPath).toBe(process.cwd());
  });
});
