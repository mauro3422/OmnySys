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
    patternHash:        'pattern-hash-01',
    flowType:           'read-transform-return',
    operationSequence:  ['receive', 'property_access', 'return'],
    complexityScore:    3,
    inputCount:         1,
    outputCount:        1,
    transformationCount:1,
    semanticFingerprint:'get:core:data',
    extractedAt:        new Date().toISOString(),
    version:            '1.0',
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
    const a = dna({ structuralHash: 'SAME', patternHash: 'DIFF-A', operationSequence: ['x'], semanticFingerprint: 'a:b:c' });
    const b = dna({ structuralHash: 'SAME', patternHash: 'DIFF-B', operationSequence: ['y'], semanticFingerprint: 'x:y:z' });
    const result = compareDNA(a, b);
    // Only structural matches (0.4) — pattern, ops, semantic all differ
    expect(result).toBeCloseTo(0.4, 1);
  });

  it('same flowType but different patternHash gives partial pattern score (15%)', () => {
    const a = dna({ structuralHash: 'DIFF-A', patternHash: 'PA', flowType: 'same-flow', operationSequence: ['x'], semanticFingerprint: 'a:b:c' });
    const b = dna({ structuralHash: 'DIFF-B', patternHash: 'PB', flowType: 'same-flow', operationSequence: ['y'], semanticFingerprint: 'x:y:z' });
    const result = compareDNA(a, b);
    // 0.15 (pattern partial) / 1.0
    expect(result).toBeCloseTo(0.15, 1);
  });

  it('same operationSequence contributes 20%', () => {
    const ops = ['receive', 'return'];
    const a = dna({ structuralHash: 'DA', patternHash: 'PA', operationSequence: ops, semanticFingerprint: 'a:b:c' });
    const b = dna({ structuralHash: 'DB', patternHash: 'PB', operationSequence: [...ops], semanticFingerprint: 'x:y:z' });
    const result = compareDNA(a, b);
    // Only ops match (0.2)
    expect(result).toBeCloseTo(0.2, 1);
  });

  it('same semanticFingerprint contributes 10%', () => {
    const fp = 'get:core:data';
    const a = dna({ structuralHash: 'DA', patternHash: 'PA', operationSequence: ['x'], semanticFingerprint: fp });
    const b = dna({ structuralHash: 'DB', patternHash: 'PB', operationSequence: ['y'], semanticFingerprint: fp });
    const result = compareDNA(a, b);
    // Only semantic matches (0.1)
    expect(result).toBeCloseTo(0.1, 1);
  });

  it('completely different DNAs return low similarity', () => {
    const a = dna({ structuralHash: 'A', patternHash: 'PA', flowType: 'fa', operationSequence: ['x'], semanticFingerprint: 'a:b:c' });
    const b = dna({ structuralHash: 'B', patternHash: 'PB', flowType: 'fb', operationSequence: ['y'], semanticFingerprint: 'x:y:z' });
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
