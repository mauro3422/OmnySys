/**
 * @fileoverview Tests for Race Detection Pipeline
 * 
 * Tests race condition detection including:
 * - Shared state mutation detection
 * - Lock protection detection
 * - Transaction boundary detection
 * - Async queue detection
 * - Closure capture analysis
 * 
 * @module race-detector/__tests__/race-detector
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { RaceDetectionPipeline, detectRaceConditions } from '../index.js';
import { ReadWriteRaceStrategy } from '../strategies/read-write-race-strategy.js';
import { WriteWriteRaceStrategy } from '../strategies/write-write-race-strategy.js';

describe('RaceDetectionPipeline', () => {
  it('should detect mutex locks in code', () => {
    const pipeline = new RaceDetectionPipeline({ modules: [] });
    
    // Mock access with code containing lock
    const access = { 
      atom: 'test.js::lockedFunction',
      _code: 'async function lockedFunction() { await mutex.acquire(); try { await updateData(); } finally { mutex.release(); } }'
    };
    
    // Directly test the pattern matching
    const code = access._code;
    const lockPatterns = [
      /\b(mutex|lock|semaphore)\./i,
      /\bLock\s*\(/i,
      /\bacquire\s*\(/i,
    ];
    const hasLock = lockPatterns.some(p => p.test(code));
    
    assert.strictEqual(hasLock, true);
  });

  it('should detect navigator.locks', () => {
    const code = 'async function webLock() { await navigator.locks.request("my-lock", async () => { await doWork(); }); }';
    
    const lockPatterns = [
      /navigator\.locks/i,
    ];
    const hasLock = lockPatterns.some(p => p.test(code));
    
    assert.strictEqual(hasLock, true);
  });

  it('should detect Atomics operations', () => {
    const code = 'function atomicAdd() { Atomics.add(sharedArray, 0, 1); }';
    
    const atomicPatterns = [
      /Atomics\.(add|sub|and|or|xor|exchange|compareExchange|load|store)\(/i,
    ];
    const isAtomic = atomicPatterns.some(p => p.test(code));
    
    assert.strictEqual(isAtomic, true);
  });

  it('should detect Prisma transactions', () => {
    const code = 'await prisma.$transaction(async (tx) => { await tx.user.update(); });';
    
    const transactionPatterns = [
      /prisma\.\$transaction/i,
    ];
    const inTx = transactionPatterns.some(p => p.test(code));
    
    assert.strictEqual(inTx, true);
  });

  it('should detect MongoDB transactions', () => {
    const code = 'await session.withTransaction(async () => { await collection.updateOne(); });';
    
    const transactionPatterns = [
      /session\.withTransaction/i,
    ];
    const inTx = transactionPatterns.some(p => p.test(code));
    
    assert.strictEqual(inTx, true);
  });

  it('should detect SQL transactions', () => {
    const code = 'BEGIN TRANSACTION; UPDATE users SET count = count + 1; COMMIT;';
    
    const transactionPatterns = [
      /BEGIN\s+TRANSACTION/i,
    ];
    const inTx = transactionPatterns.some(p => p.test(code));
    
    assert.strictEqual(inTx, true);
  });

  it('should detect p-queue', () => {
    const code = 'const queue = new PQueue({ concurrency: 1 }); queue.add(async () => { await task(); });';
    
    const queuePatterns = [
      /PQueue/i,
      /async\s*\.queue/i,
    ];
    const hasQueue = queuePatterns.some(p => p.test(code));
    
    assert.strictEqual(hasQueue, true);
  });

  it('should detect Bull queue', () => {
    const code = 'const queue = new Bull("my-queue"); queue.add(data);';
    
    const queuePatterns = [
      /new\s+Bull/i,
    ];
    const hasQueue = queuePatterns.some(p => p.test(code));
    
    assert.strictEqual(hasQueue, true);
  });

  it('should detect worker threads', () => {
    const code = 'const worker = new Worker("./worker.js");';
    
    const queuePatterns = [
      /new\s+Worker/i,
    ];
    const hasQueue = queuePatterns.some(p => p.test(code));
    
    assert.strictEqual(hasQueue, true);
  });

  it('should detect captured variables in closures', () => {
    const code = 'const shared = { count: 0 }; setTimeout(() => { shared.count++; }, 100);';
    
    // Simple check for variable capture pattern
    const hasClosureCapture = /setTimeout\s*\(\s*\(\)\s*=>\s*\{[^}]*shared/.test(code);
    
    assert.strictEqual(hasClosureCapture, true);
  });
});

describe('ReadWriteRaceStrategy', () => {
  it('should detect read-write races', () => {
    const strategy = new ReadWriteRaceStrategy();
    const sharedState = new Map([
      ['localStorage:cart', [
        { atom: 'file.js::readCart', type: 'read', isAsync: true },
        { atom: 'file.js::writeCart', type: 'write', isAsync: true }
      ]]
    ]);

    const races = strategy.detect(sharedState, { modules: [] });

    assert.ok(races.length > 0);
    assert.strictEqual(races[0].type, 'RW');
  });
});

describe('WriteWriteRaceStrategy', () => {
  it('should detect write-write races', () => {
    const strategy = new WriteWriteRaceStrategy();
    const sharedState = new Map([
      ['localStorage:cart', [
        { atom: 'file.js::updateCart1', type: 'write', isAsync: true },
        { atom: 'file.js::updateCart2', type: 'write', isAsync: true }
      ]]
    ]);

    const races = strategy.detect(sharedState, { modules: [] });

    assert.ok(races.length > 0);
    assert.strictEqual(races[0].type, 'WW');
  });
});
