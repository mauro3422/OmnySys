/**
 * @fileoverview Metadata Test Factory
 * 
 * Factory for creating test data structures for metadata extractors.
 * Provides builders for various metadata types used in testing.
 * 
 * @module tests/metadata-test-factory
 */

import { describe, it, expect } from 'vitest';

// ============================================
// MetadataBuilder - Core metadata structures
// ============================================

export class MetadataBuilder {
  constructor() {
    this.data = {
      filePath: 'test/file.js',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };
  }

  withFilePath(path) {
    this.data.filePath = path;
    return this;
  }

  withDataFlow(inputs = [], transformations = [], outputs = []) {
    this.data.dataFlow = {
      inputs: inputs.map(i => typeof i === 'string' ? { type: i, usages: [] } : i),
      transformations: transformations.map(t => typeof t === 'string' ? { operation: t } : t),
      outputs: outputs.map(o => typeof o === 'string' ? { type: o } : o)
    };
    return this;
  }

  withSemantic(verb, domain, entity) {
    this.data.semantic = { verb, domain, entity };
    return this;
  }

  withStandardized(patternHash) {
    this.data.standardized = { patternHash };
    return this;
  }

  build() {
    return { ...this.data };
  }

  // Static factory methods for common patterns
  static simpleFunction() {
    return new MetadataBuilder()
      .withDataFlow(['param'], ['transform'], ['return'])
      .withSemantic('transform', 'generic', 'data');
  }

  static asyncFunction() {
    return new MetadataBuilder()
      .withDataFlow(['param'], ['fetch', 'transform'], ['return'])
      .withSemantic('fetch', 'api', 'data');
  }

  static sideEffectFunction() {
    return new MetadataBuilder()
      .withDataFlow(['param'], ['transform'], ['side_effect'])
      .withSemantic('update', 'database', 'record');
  }
}

// ============================================
// ErrorFlowBuilder - Error scenarios
// ============================================

export class ErrorFlowBuilder {
  constructor() {
    this.throws = [];
    this.catches = [];
    this.tryBlocks = [];
    this.unhandledCalls = [];
    this.propagation = 'none';
  }

  addThrow(type, condition = 'unknown', source = 'explicit', confidence = 1.0) {
    this.throws.push({ type, condition, source, confidence });
    return this;
  }

  addCatch(variable = 'error', handling = {}) {
    this.catches.push({
      type: handling.type || 'generic',
      variable,
      rethrows: handling.rethrows || false,
      logs: handling.logs || false,
      returns: handling.returns || false,
      transforms: handling.transforms || false
    });
    return this;
  }

  addTryBlock(hasCatch = true, hasFinally = false, protectedCalls = []) {
    this.tryBlocks.push({
      hasCatch,
      hasFinally,
      lines: 10,
      protectedCalls
    });
    return this;
  }

  withPropagation(pattern) {
    this.propagation = pattern;
    return this;
  }

  addUnhandledCall(call, position = 0) {
    this.unhandledCalls.push({ call, position });
    return this;
  }

  build() {
    return {
      throws: this.throws,
      catches: this.catches,
      tryBlocks: this.tryBlocks,
      unhandledCalls: this.unhandledCalls,
      propagation: this.propagation
    };
  }

  // Static factory methods
  static noErrorHandling() {
    return new ErrorFlowBuilder().withPropagation('none');
  }

  static fullPropagation() {
    return new ErrorFlowBuilder()
      .withPropagation('full')
      .addTryBlock(true, false)
      .addThrow('Error', 'unknown')
      .addCatch('e', { rethrows: true });
  }

  static partialPropagation() {
    return new ErrorFlowBuilder()
      .withPropagation('partial')
      .addTryBlock(true, false)
      .addCatch('e', { logs: true });
  }
}

// ============================================
// PerformanceBuilder - Performance analysis
// ============================================

export class PerformanceBuilder {
  constructor() {
    this.metrics = {
      complexity: { cyclomatic: 1, cognitive: 0, bigO: 'O(1)' },
      expensiveOps: { nestedLoops: 0, recursion: false, blockingOps: [], heavyCalls: [] },
      resources: { network: false, disk: false, memory: 'low', dom: false },
      estimates: { executionTime: 'instant', blocking: false, async: false },
      impactScore: 0
    };
  }

  withComplexity(cyclomatic, cognitive, bigO = 'O(1)') {
    this.metrics.complexity = { cyclomatic, cognitive, bigO };
    return this;
  }

  withNestedLoops(count) {
    this.metrics.expensiveOps.nestedLoops = count;
    return this;
  }

  withRecursion(hasRecursion = true) {
    this.metrics.expensiveOps.recursion = hasRecursion;
    return this;
  }

  addHeavyCall(operation, cost = 'medium') {
    this.metrics.expensiveOps.heavyCalls.push({ operation, cost });
    return this;
  }

  withNetwork(hasNetwork = true) {
    this.metrics.resources.network = hasNetwork;
    this.metrics.estimates.async = hasNetwork;
    return this;
  }

  withDisk(hasDisk = true) {
    this.metrics.resources.disk = hasDisk;
    return this;
  }

  withMemory(level) {
    this.metrics.resources.memory = level;
    return this;
  }

  withDOM(hasDOM = true) {
    this.metrics.resources.dom = hasDOM;
    return this;
  }

  withImpactScore(score) {
    this.metrics.impactScore = score;
    return this;
  }

  build() {
    return { ...this.metrics };
  }

  // Static factory methods
  static simple() {
    return new PerformanceBuilder()
      .withComplexity(1, 0, 'O(1)')
      .withImpactScore(0);
  }

  static networkHeavy() {
    return new PerformanceBuilder()
      .withComplexity(3, 1, 'O(n)')
      .withNetwork(true)
      .addHeavyCall('fetch', 'high')
      .withImpactScore(0.6);
  }

  static computationallyExpensive() {
    return new PerformanceBuilder()
      .withComplexity(15, 4, 'O(n^2)')
      .withNestedLoops(2)
      .withMemory('high')
      .withImpactScore(0.8);
  }
}

// ============================================
// TemporalBuilder - Temporal patterns
// ============================================

export class TemporalBuilder {
  constructor() {
    this.patterns = {
      timers: [],
      asyncPatterns: null,
      events: [],
      lifecycleHooks: [],
      executionOrder: null
    };
  }

  addTimeout(delay, category = 'normal') {
    this.patterns.timers.push({
      type: 'setTimeout',
      delay,
      delayCategory: category
    });
    return this;
  }

  addInterval(interval) {
    this.patterns.timers.push({
      type: 'setInterval',
      interval
    });
    return this;
  }

  withAsyncPatterns(patterns) {
    this.patterns.asyncPatterns = {
      isAsync: patterns.isAsync ?? false,
      hasAwait: patterns.hasAwait ?? false,
      hasPromiseChain: patterns.hasPromiseChain ?? false,
      hasPromiseAll: patterns.hasPromiseAll ?? false,
      hasPromiseRace: patterns.hasPromiseRace ?? false,
      hasNewPromise: patterns.hasNewPromise ?? false,
      parallelOperations: patterns.parallelOperations || [],
      sequentialOperations: patterns.sequentialOperations || []
    };
    return this;
  }

  addEvent(type, target) {
    this.patterns.events.push({ type, target });
    return this;
  }

  withExecutionOrder(mustRunBefore = [], mustRunAfter = []) {
    this.patterns.executionOrder = {
      mustRunBefore,
      mustRunAfter,
      isInitializer: mustRunBefore.length > 0
    };
    return this;
  }

  build() {
    return { ...this.patterns };
  }

  // Static factory methods
  static syncFunction() {
    return new TemporalBuilder()
      .withAsyncPatterns({ isAsync: false, hasAwait: false });
  }

  static asyncFunction() {
    return new TemporalBuilder()
      .withAsyncPatterns({ isAsync: true, hasAwait: true });
  }

  static withParallelOps(count) {
    return new TemporalBuilder()
      .withAsyncPatterns({
        isAsync: true,
        hasAwait: true,
        hasPromiseAll: true,
        parallelOperations: [{
          type: 'Promise.all',
          parallelCalls: count,
          calls: []
        }]
      });
  }

  static delayedExecution(delay) {
    return new TemporalBuilder()
      .addTimeout(delay, delay < 100 ? 'fast' : delay < 1000 ? 'normal' : 'slow');
  }
}

// ============================================
// CodeSampleBuilder - Code test samples
// ============================================

export class CodeSampleBuilder {
  constructor() {
    this.code = '';
  }

  addAsyncFunction(name, body, isExported = false) {
    const exportStr = isExported ? 'export ' : '';
    this.code += `${exportStr}async function ${name}() {
${body}
}
`;
    return this;
  }

  addFunction(name, body, isAsync = false, isExported = false) {
    const asyncStr = isAsync ? 'async ' : '';
    const exportStr = isExported ? 'export ' : '';
    this.code += `${exportStr}${asyncStr}function ${name}() {
${body}
}
`;
    return this;
  }

  addArrowFunction(name, body, isAsync = false) {
    const asyncStr = isAsync ? 'async ' : '';
    this.code += `const ${name} = ${asyncStr}() => {
${body}
};
`;
    return this;
  }

  addTryCatch(tryBody, catchBody = 'console.error(e);') {
    this.code += `try {
${tryBody}
} catch (e) {
${catchBody}
}
`;
    return this;
  }

  addPromiseChain(target) {
    this.code += `${target}.then(result => result).catch(err => err);
`;
    return this;
  }

  addPromiseAll(calls) {
    this.code += `await Promise.all([${calls.join(', ')}]);
`;
    return this;
  }

  addSetTimeout(delay, callback = '() => {}') {
    this.code += `setTimeout(${callback}, ${delay});
`;
    return this;
  }

  addFetch(url) {
    this.code += `const response = await fetch('${url}');
`;
    return this;
  }

  addThrow(errorType, message) {
    this.code += `throw new ${errorType}('${message}');
`;
    return this;
  }

  build() {
    return this.code;
  }

  // Static factory methods
  static simpleAsync() {
    return new CodeSampleBuilder()
      .addAsyncFunction('fetchData', '  return await fetch("/api/data");');
  }

  static withErrorHandling() {
    return new CodeSampleBuilder()
      .addAsyncFunction('safeFetch', `  try {
    return await fetch("/api/data");
  } catch (e) {
    console.error(e);
    throw e;
  }`);
  }

  static withParallelCalls() {
    return new CodeSampleBuilder()
      .addAsyncFunction('fetchAll', `  const [a, b, c] = await Promise.all([
    fetch("/api/a"),
    fetch("/api/b"),
    fetch("/api/c")
  ]);
  return { a, b, c };`);
  }
}

// ============================================
// Test Utilities
// ============================================

export function expectValidDNA(dna) {
  expect(dna).toHaveProperty('id');
  expect(dna).toHaveProperty('structuralHash');
  expect(dna).toHaveProperty('patternHash');
  expect(dna).toHaveProperty('flowType');
  expect(dna).toHaveProperty('operationSequence');
  expect(dna).toHaveProperty('complexityScore');
  expect(dna).toHaveProperty('semanticFingerprint');
}

export function expectValidErrorFlow(errorFlow) {
  expect(errorFlow).toHaveProperty('throws');
  expect(errorFlow).toHaveProperty('catches');
  expect(errorFlow).toHaveProperty('tryBlocks');
  expect(errorFlow).toHaveProperty('unhandledCalls');
  expect(errorFlow).toHaveProperty('propagation');
  expect(Array.isArray(errorFlow.throws)).toBe(true);
  expect(Array.isArray(errorFlow.catches)).toBe(true);
}

export function expectValidPerformanceMetrics(metrics) {
  expect(metrics).toHaveProperty('complexity');
  expect(metrics).toHaveProperty('expensiveOps');
  expect(metrics).toHaveProperty('resources');
  expect(metrics).toHaveProperty('estimates');
  expect(metrics).toHaveProperty('impactScore');
}

export function expectValidTemporalPatterns(patterns) {
  expect(patterns).toHaveProperty('timers');
  expect(patterns).toHaveProperty('asyncPatterns');
  expect(patterns).toHaveProperty('events');
  expect(patterns).toHaveProperty('lifecycleHooks');
  expect(patterns).toHaveProperty('executionOrder');
}

// Export all builders as default
export default {
  MetadataBuilder,
  ErrorFlowBuilder,
  PerformanceBuilder,
  TemporalBuilder,
  CodeSampleBuilder,
  expectValidDNA,
  expectValidErrorFlow,
  expectValidPerformanceMetrics,
  expectValidTemporalPatterns
};
