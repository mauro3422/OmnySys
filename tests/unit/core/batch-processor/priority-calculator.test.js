/**
 * @fileoverview Tests for priority-calculator.js
 * Pure functions — no mocks needed.
 */

import { describe, it, expect } from 'vitest';
import {
  calculatePriority,
  priorityToString,
  stringToPriority
} from '#core/batch-processor/priority-calculator.js';
import { Priority, FileChangeType as ChangeType } from '#config/change-types.js';

// ── calculatePriority ─────────────────────────────────────────────────────────

describe('calculatePriority', () => {
  it('returns explicit priority when provided in options', () => {
    const result = calculatePriority('file.js', ChangeType.MODIFIED, { priority: 99 });
    expect(result).toBe(99);
  });

  it('DELETED change type returns CRITICAL priority', () => {
    const result = calculatePriority('file.js', ChangeType.DELETED);
    expect(result).toBe(Priority.CRITICAL);
  });

  it('CREATED change type returns HIGH priority', () => {
    const result = calculatePriority('file.js', ChangeType.CREATED);
    expect(result).toBe(Priority.HIGH);
  });

  it('export changes return HIGH priority', () => {
    const result = calculatePriority('file.js', ChangeType.MODIFIED, {
      exportChanges: ['addedExport']
    });
    expect(result).toBe(Priority.HIGH);
  });

  it('dependentCount > 20 returns CRITICAL priority', () => {
    const result = calculatePriority('file.js', ChangeType.MODIFIED, {
      dependentCount: 25
    });
    expect(result).toBe(Priority.CRITICAL);
  });

  it('dependentCount > 5 but <= 20 returns HIGH priority', () => {
    const result = calculatePriority('file.js', ChangeType.MODIFIED, {
      dependentCount: 10
    });
    expect(result).toBe(Priority.HIGH);
  });

  it('dependentCount exactly 5 returns MEDIUM (import changes check)', () => {
    // dependentCount 5 is not > 5, falls to import check
    const result = calculatePriority('file.js', ChangeType.MODIFIED, {
      dependentCount: 5,
      importChanges: ['newImport']
    });
    expect(result).toBe(Priority.MEDIUM);
  });

  it('import changes return MEDIUM priority', () => {
    const result = calculatePriority('file.js', ChangeType.MODIFIED, {
      importChanges: ['changedImport']
    });
    expect(result).toBe(Priority.MEDIUM);
  });

  it('returns LOW priority by default (no options)', () => {
    const result = calculatePriority('file.js', ChangeType.MODIFIED);
    expect(result).toBe(Priority.LOW);
  });

  it('empty exportChanges array does not trigger HIGH', () => {
    const result = calculatePriority('file.js', ChangeType.MODIFIED, {
      exportChanges: []
    });
    expect(result).toBe(Priority.LOW);
  });

  it('explicit priority overrides even DELETED type', () => {
    const result = calculatePriority('file.js', ChangeType.DELETED, { priority: Priority.LOW });
    expect(result).toBe(Priority.LOW);
  });
});

// ── priorityToString ──────────────────────────────────────────────────────────

describe('priorityToString', () => {
  it('converts CRITICAL to "critical"', () => {
    expect(priorityToString(Priority.CRITICAL)).toBe('critical');
  });

  it('converts HIGH to "high"', () => {
    expect(priorityToString(Priority.HIGH)).toBe('high');
  });

  it('converts MEDIUM to "medium"', () => {
    expect(priorityToString(Priority.MEDIUM)).toBe('medium');
  });

  it('converts LOW to "low"', () => {
    expect(priorityToString(Priority.LOW)).toBe('low');
  });

  it('returns "low" for unknown values', () => {
    expect(priorityToString(999)).toBe('low');
    expect(priorityToString(undefined)).toBe('low');
  });
});

// ── stringToPriority ──────────────────────────────────────────────────────────

describe('stringToPriority', () => {
  it('converts "critical" to CRITICAL', () => {
    expect(stringToPriority('critical')).toBe(Priority.CRITICAL);
  });

  it('converts "high" to HIGH', () => {
    expect(stringToPriority('high')).toBe(Priority.HIGH);
  });

  it('converts "medium" to MEDIUM', () => {
    expect(stringToPriority('medium')).toBe(Priority.MEDIUM);
  });

  it('converts "low" to LOW', () => {
    expect(stringToPriority('low')).toBe(Priority.LOW);
  });

  it('is case-insensitive', () => {
    expect(stringToPriority('CRITICAL')).toBe(Priority.CRITICAL);
    expect(stringToPriority('High')).toBe(Priority.HIGH);
    expect(stringToPriority('MEDIUM')).toBe(Priority.MEDIUM);
  });

  it('returns LOW for unknown strings', () => {
    expect(stringToPriority('unknown')).toBe(Priority.LOW);
    expect(stringToPriority('')).toBe(Priority.LOW);
  });

  it('returns LOW for null/undefined', () => {
    expect(stringToPriority(null)).toBe(Priority.LOW);
    expect(stringToPriority(undefined)).toBe(Priority.LOW);
  });

  it('round-trips with priorityToString', () => {
    expect(stringToPriority(priorityToString(Priority.CRITICAL))).toBe(Priority.CRITICAL);
    expect(stringToPriority(priorityToString(Priority.HIGH))).toBe(Priority.HIGH);
    expect(stringToPriority(priorityToString(Priority.MEDIUM))).toBe(Priority.MEDIUM);
    expect(stringToPriority(priorityToString(Priority.LOW))).toBe(Priority.LOW);
  });
});
