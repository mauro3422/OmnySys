/**
 * @fileoverview Metadata Test Factory (Modular)
 * 
 * Punto de entrada para las factorías de datos de test.
 * Rehúsa los constructores especializados extraídos en ./builders/
 * 
 * @module tests/metadata-test-factory
 */

import { expect } from 'vitest';

// Importar constructores especializados
import { MetadataBuilder } from './builders/metadata-builder.js';
import { ErrorFlowBuilder } from './builders/error-flow-builder.js';
import { PerformanceBuilder } from './builders/performance-builder.js';
import { TemporalBuilder } from './builders/temporal-builder.js';
import { CodeSampleBuilder } from './builders/code-sample-builder.js';

// Re-exportar clases
export {
  MetadataBuilder,
  ErrorFlowBuilder,
  PerformanceBuilder,
  TemporalBuilder,
  CodeSampleBuilder
};

// ============================================
// Test Utilities (Assertion Helpers)
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

// Export default object for backward compatibility
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
