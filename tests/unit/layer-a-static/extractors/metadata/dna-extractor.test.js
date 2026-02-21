/**
 * @fileoverview Tests for dna-extractor.js — compareDNA + validateDNA
 * Pure functions — no mocks needed.
 */

import { describe, it, expect } from 'vitest';
import {
  compareDNA,
  validateDNA
} from '#layer-a/extractors/metadata/dna-extractor.js';

// ── helpers ───────────────────────────────────────────────────────────────────

function dna(overrides = {}) {
  return {
    id:                 'abc123def456',
    structuralHash:     'struct-hash-01',
    contextualHash:     'context-hash-01',
    semanticHash:       'semantic-hash-01',
    patternHash:        'pattern-hash-01',
    flowType:           'read-transform-return',
    operationSequence:  ['receive', 'property_access', 'return'],
    complexityScore:    3,
    inputCount:         1,
    outputCount:        1,
    transformationCount:1,
    semanticFingerprint:'get:core:data',
    duplicabilityScore: 75,
    extractedAt:        new Date().toISOString(),
    version:            '2.0',
    ...overrides
  };
}

// ── compareDNA ────────────────────────────────────────────────────────────────

describe('compareDNA', () => {
  it('returns 1.0 for identical DNAs', () => {
    const d = dna();
    const result = compareDNA(d, d);
    expect(result).toBe(1);
  });

  it('returns 0 if either DNA is null', () => {
    expect(compareDNA(null, dna())).toBe(0);
    expect(compareDNA(dna(), null)).toBe(0);
    expect(compareDNA(null, null)).toBe(0);
  });

  it('structuralHash match contributes 40%', () => {
    // Aislar solo structural: flowTypes distintos + ops de distinta longitud
    const a = dna({ structuralHash: 'SAME', patternHash: 'DIFF-A', flowType: 'flow-unique-a', operationSequence: ['x'], semanticFingerprint: 'a:b:c' });
    const b = dna({ structuralHash: 'SAME', patternHash: 'DIFF-B', flowType: 'flow-unique-b', operationSequence: ['y', 'z'], semanticFingerprint: 'x:y:z' });
    const result = compareDNA(a, b);
    // structural match (0.4), pattern differ + flowType differ (0), ops differ length (0), semantic differ (0) → 0.4
    expect(result).toBeCloseTo(0.4, 1);
  });

  it('same flowType but different patternHash gives partial pattern score (15%)', () => {
    // Aislar solo flowType partial: ops de distinta longitud para evitar +0.1
    const a = dna({ structuralHash: 'DIFF-A', patternHash: 'PA', flowType: 'same-flow', operationSequence: ['x'], semanticFingerprint: 'a:b:c' });
    const b = dna({ structuralHash: 'DIFF-B', patternHash: 'PB', flowType: 'same-flow', operationSequence: ['y', 'z'], semanticFingerprint: 'x:y:z' });
    const result = compareDNA(a, b);
    // structural differ (0), pattern partial same flowType (0.15), ops differ length (0), semantic differ (0) → 0.15
    expect(result).toBeCloseTo(0.15, 1);
  });

  it('same operationSequence contributes 20%', () => {
    const ops = ['receive', 'return'];
    // Aislar solo ops: flowTypes distintos + structural differ
    const a = dna({ structuralHash: 'DA', patternHash: 'PA', flowType: 'flow-unique-a', operationSequence: ops, semanticFingerprint: 'a:b:c' });
    const b = dna({ structuralHash: 'DB', patternHash: 'PB', flowType: 'flow-unique-b', operationSequence: [...ops], semanticFingerprint: 'x:y:z' });
    const result = compareDNA(a, b);
    // structural differ (0), pattern differ + flowType differ (0), ops same (0.2), semantic differ (0) → 0.2
    expect(result).toBeCloseTo(0.2, 1);
  });

  it('same semanticFingerprint contributes 10%', () => {
    const fp = 'get:core:data';
    // Aislar solo semantic: flowTypes distintos + ops de distinta longitud
    const a = dna({ structuralHash: 'DA', patternHash: 'PA', flowType: 'flow-unique-a', operationSequence: ['x'], semanticFingerprint: fp });
    const b = dna({ structuralHash: 'DB', patternHash: 'PB', flowType: 'flow-unique-b', operationSequence: ['y', 'z'], semanticFingerprint: fp });
    const result = compareDNA(a, b);
    // structural differ (0), pattern differ (0), ops differ length (0), semantic same (0.1) → 0.1
    expect(result).toBeCloseTo(0.1, 1);
  });

  it('completely different DNAs return low similarity', () => {
    // Todo distinto: flowTypes distintos + ops de distinta longitud
    const a = dna({ structuralHash: 'A', patternHash: 'PA', flowType: 'fa', operationSequence: ['x'], semanticFingerprint: 'a:b:c' });
    const b = dna({ structuralHash: 'B', patternHash: 'PB', flowType: 'fb', operationSequence: ['y', 'z'], semanticFingerprint: 'x:y:z' });
    expect(compareDNA(a, b)).toBe(0);
  });

  it('returns value in [0, 1] range', () => {
    const result = compareDNA(dna(), dna({ structuralHash: 'different' }));
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });
});

// ── validateDNA ───────────────────────────────────────────────────────────────

describe('validateDNA', () => {
  it('returns valid: true for complete valid DNA', () => {
    const result = validateDNA(dna());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns error for missing id', () => {
    const result = validateDNA(dna({ id: undefined }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing DNA ID');
  });

  it('returns error for missing structuralHash', () => {
    const result = validateDNA(dna({ structuralHash: undefined }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing structural hash');
  });

  it('returns error for missing patternHash', () => {
    const result = validateDNA(dna({ patternHash: undefined }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing pattern hash');
  });

  it('returns error for unknown flowType', () => {
    const result = validateDNA(dna({ flowType: 'unknown' }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Unknown flow type');
  });

  it('returns error when complexityScore < 1', () => {
    const result = validateDNA(dna({ complexityScore: 0 }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid complexity score');
  });

  it('returns error when complexityScore > 10', () => {
    const result = validateDNA(dna({ complexityScore: 11 }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid complexity score');
  });

  it('accepts boundary complexityScore values 1 and 10', () => {
    expect(validateDNA(dna({ complexityScore: 1 })).valid).toBe(true);
    expect(validateDNA(dna({ complexityScore: 10 })).valid).toBe(true);
  });

  it('accumulates multiple errors', () => {
    const result = validateDNA(dna({ id: undefined, structuralHash: undefined, flowType: 'unknown' }));
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
    expect(result.valid).toBe(false);
  });
});
