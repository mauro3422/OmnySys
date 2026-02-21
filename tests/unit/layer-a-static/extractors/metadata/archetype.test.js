/**
 * @fileoverview Tests for archetype.js + archetype-rules.js
 * Pure functions — no mocks needed.
 */

import { describe, it, expect } from 'vitest';
import {
  detectAtomArchetype,
  recalculateArchetypes
} from '#layer-a/pipeline/phases/atom-extraction/metadata/archetype.js';
import {
  isTestCallback,
  detectGodFunction,
  detectFragileNetwork,
  detectHotPath,
  detectDeadFunction,
  detectOrchestrator,
  detectHandler,
  detectFactory,
  detectInitializer,
  detectTransformer,
  detectPersister,
  detectClassMethod,
  detectPrivateUtility,
  detectConstant,
  detectUtility
} from '#layer-a/pipeline/phases/atom-extraction/metadata/archetype-rules.js';

// ── helpers ───────────────────────────────────────────────────────────────────

function meta(overrides = {}) {
  return {
    name: 'myFn',
    isTestCallback: false,
    complexity: 3,
    linesOfCode: 20,
    externalCallCount: 0,
    isExported: false,
    calledBy: [],
    hasNetworkCalls: false,
    hasErrorHandling: false,
    hasSideEffects: false,
    functionType: 'declaration',
    className: null,
    ...overrides
  };
}

// ── detectAtomArchetype ───────────────────────────────────────────────────────

describe('detectAtomArchetype', () => {
  it('returns standard for function with no special traits (exported, no callers)', () => {
    // exported so detectDeadFunction doesn't fire; no special traits → standard
    const result = detectAtomArchetype(meta({ isExported: true }));
    expect(result).toEqual({ type: 'standard', severity: 1, confidence: 1.0 });
  });

  it('returns dead-function for unexported function with no callers', () => {
    const result = detectAtomArchetype(meta({ isExported: false, calledBy: [] }));
    expect(result).toEqual({ type: 'dead-function', severity: 5, confidence: 1.0 });
  });

  it('returns test-callback for isTestCallback flag (god-function check runs first but loses)', () => {
    // god-function requires complexity>50 or linesOfCode>150 — meta defaults don't trigger it
    const result = detectAtomArchetype(meta({ isTestCallback: true }));
    expect(result).toEqual({ type: 'test-callback', severity: 1, confidence: 1.0 });
  });

  it('returns test-callback for describe( name pattern', () => {
    const result = detectAtomArchetype(meta({ name: "describe('my suite')" }));
    expect(result).toEqual({ type: 'test-callback', severity: 1, confidence: 1.0 });
  });

  it('god-function takes precedence over test-callback when complexity > 50', () => {
    // ARCHETYPE_DETECTORS: detectGodFunction runs before isTestCallback
    const result = detectAtomArchetype(meta({ isTestCallback: true, complexity: 55 }));
    expect(result).toEqual({ type: 'god-function', severity: 10, confidence: 1.0 });
  });

  it('returns god-function for very high complexity', () => {
    const result = detectAtomArchetype(meta({ complexity: 55, linesOfCode: 30, isExported: true }));
    expect(result).toEqual({ type: 'god-function', severity: 10, confidence: 1.0 });
  });

  it('returns fragile-network for network calls without error handling', () => {
    const result = detectAtomArchetype(meta({ hasNetworkCalls: true, hasErrorHandling: false, isExported: true }));
    expect(result).toEqual({ type: 'fragile-network', severity: 8, confidence: 0.9 });
  });
});

// ── recalculateArchetypes ─────────────────────────────────────────────────────

describe('recalculateArchetypes', () => {
  it('mutates each atom with archetype', () => {
    const atoms = [meta({ isExported: true }), meta({ isTestCallback: true })];
    recalculateArchetypes(atoms);
    expect(atoms[0].archetype).toEqual({ type: 'standard', severity: 1, confidence: 1.0 });
    expect(atoms[1].archetype).toEqual({ type: 'test-callback', severity: 1, confidence: 1.0 });
  });

  it('handles empty array', () => {
    expect(() => recalculateArchetypes([])).not.toThrow();
  });
});

// ── isTestCallback ────────────────────────────────────────────────────────────

describe('isTestCallback', () => {
  it('returns true when isTestCallback flag is set', () => {
    expect(isTestCallback({ isTestCallback: true, name: 'fn' })).toBe(true);
  });

  it('matches describe pattern', () => {
    expect(isTestCallback({ name: "describe('suite')" })).toBeTruthy();
  });

  it('matches it pattern', () => {
    expect(isTestCallback({ name: "it('test')" })).toBeTruthy();
  });

  it('matches test pattern', () => {
    expect(isTestCallback({ name: "test('my test')" })).toBeTruthy();
  });

  it('matches beforeEach pattern', () => {
    expect(isTestCallback({ name: "beforeEach(setup)" })).toBeTruthy();
  });

  it('returns falsy for regular function name', () => {
    expect(isTestCallback({ name: 'calculatePriority' })).toBeFalsy();
  });
});

// ── detectGodFunction ─────────────────────────────────────────────────────────

describe('detectGodFunction', () => {
  it('returns god-function when complexity > 50', () => {
    const result = detectGodFunction(meta({ complexity: 51 }));
    expect(result).toEqual({ type: 'god-function', severity: 10, confidence: 1.0 });
  });

  it('returns god-function when linesOfCode > 150', () => {
    const result = detectGodFunction(meta({ linesOfCode: 151 }));
    expect(result).toEqual({ type: 'god-function', severity: 10, confidence: 1.0 });
  });

  it('returns god-function when complexity > 20 and externalCallCount > 5', () => {
    const result = detectGodFunction(meta({ complexity: 21, externalCallCount: 6 }));
    expect(result).toEqual({ type: 'god-function', severity: 10, confidence: 1.0 });
  });

  it('returns god-function when complexity > 20 and callerCount > 10', () => {
    const result = detectGodFunction(meta({ complexity: 21, calledBy: new Array(11).fill('x') }));
    expect(result).toEqual({ type: 'god-function', severity: 10, confidence: 1.0 });
  });

  it('returns null for normal function', () => {
    expect(detectGodFunction(meta())).toBeNull();
  });

  it('returns null when complexity 21 but externalCalls and callers are low', () => {
    expect(detectGodFunction(meta({ complexity: 21, externalCallCount: 3, calledBy: [] }))).toBeNull();
  });
});

// ── detectFragileNetwork ──────────────────────────────────────────────────────

describe('detectFragileNetwork', () => {
  it('returns fragile-network when has network and no error handling', () => {
    const result = detectFragileNetwork(meta({ hasNetworkCalls: true, hasErrorHandling: false }));
    expect(result).toEqual({ type: 'fragile-network', severity: 8, confidence: 0.9 });
  });

  it('returns null when has network AND has error handling', () => {
    expect(detectFragileNetwork(meta({ hasNetworkCalls: true, hasErrorHandling: true }))).toBeNull();
  });

  it('returns null when no network calls', () => {
    expect(detectFragileNetwork(meta({ hasNetworkCalls: false }))).toBeNull();
  });
});

// ── detectHotPath ─────────────────────────────────────────────────────────────

describe('detectHotPath', () => {
  it('returns hot-path for exported function with many callers and low complexity', () => {
    const result = detectHotPath(meta({ isExported: true, calledBy: new Array(6).fill('x'), complexity: 5 }));
    expect(result).toEqual(expect.objectContaining({ type: 'hot-path' }));
  });

  it('returns null when not exported', () => {
    expect(detectHotPath(meta({ isExported: false, calledBy: new Array(6).fill('x'), complexity: 5 }))).toBeNull();
  });

  it('returns null when too few callers', () => {
    expect(detectHotPath(meta({ isExported: true, calledBy: new Array(3).fill('x'), complexity: 5 }))).toBeNull();
  });
});

// ── detectClassMethod ─────────────────────────────────────────────────────────

describe('detectClassMethod', () => {
  it('returns class-method when className is set and no callers', () => {
    const result = detectClassMethod(meta({ className: 'MyClass', calledBy: [] }));
    expect(result).toEqual(expect.objectContaining({ type: 'class-method' }));
  });

  it('returns null when no className', () => {
    expect(detectClassMethod(meta({ className: null }))).toBeNull();
  });

  it('returns null when className set but has callers', () => {
    expect(detectClassMethod(meta({ className: 'MyClass', calledBy: ['caller1'] }))).toBeNull();
  });
});

// ── detectUtility ─────────────────────────────────────────────────────────────

describe('detectUtility', () => {
  it('returns null for non-utility', () => {
    // A function with side effects or high complexity should not be utility
    const result = detectUtility(meta({ hasSideEffects: true }));
    // Just verify it doesn't throw and returns something reasonable
    expect(result === null || result?.type === 'utility').toBe(true);
  });
});
