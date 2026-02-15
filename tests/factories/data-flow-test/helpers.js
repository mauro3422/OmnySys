/**
 * @fileoverview Data Flow Test Factory - Helpers
 */

export function createMockLogger() {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    trace: vi.fn()
  };
}

export function createMockOutputExtractor(outputs = []) {
  return {
    extract: vi.fn(() => outputs),
    hasReturn: outputs.some(o => o.type === 'return'),
    hasSideEffect: outputs.some(o => o.type === 'side_effect')
  };
}

export function createMockTransformationExtractor(transformations = []) {
  return {
    extract: vi.fn(() => transformations),
    getTransformations: vi.fn(() => transformations),
    getDefinedVariables: vi.fn(() => new Set()),
    isInput: vi.fn(() => false)
  };
}

export function createMockTypeRules() {
  return {
    infer: vi.fn((node) => node.data?.inferredType || 'unknown'),
    combine: vi.fn((t1, t2) => t1 === t2 ? t1 : 'mixed')
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Test Fixtures
// ═══════════════════════════════════════════════════════════════════════════════


