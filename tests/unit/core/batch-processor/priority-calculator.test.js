/**
 * @fileoverview Tests for priority-calculator.js
 * Generated with generate_tests — branch-driven, one test per code path.
 */

import { describe, it, expect } from 'vitest';
import { Priority, ChangeType } from '#core/batch-processor/constants.js';
import {
  calculatePriority,
  priorityToString,
  stringToPriority
} from '#core/batch-processor/priority-calculator.js';

// ── calculatePriority ─────────────────────────────────────────────────────────

describe('calculatePriority', () => {
  describe('happy path', () => {
    it('should return valid output for valid input', () => {
      const result = calculatePriority('/test/file.js', ChangeType.MODIFIED, {});
      expect(result).toBeDefined();
    });
  });

  describe('branches', () => {
    it('should return options.priority when options.priority is provided', () => {
      const result = calculatePriority('/test/file.js', ChangeType.MODIFIED, { priority: 99 });
      expect(result).toBe(99);
    });

    it('should return Priority.CRITICAL when changeType is ChangeType.DELETED', () => {
      const result = calculatePriority('/test/file.js', ChangeType.DELETED, {});
      expect(result).toBe(Priority.CRITICAL);
    });

    it('should return Priority.HIGH when changeType is ChangeType.CREATED', () => {
      const result = calculatePriority('/test/file.js', ChangeType.CREATED, {});
      expect(result).toBe(Priority.HIGH);
    });

    it('should return Priority.MEDIUM when options.importChanges is non-empty', () => {
      const result = calculatePriority('/test/file.js', ChangeType.MODIFIED, { importChanges: ['item'] });
      expect(result).toBe(Priority.MEDIUM);
    });

    it('should return Priority.LOW as default', () => {
      const result = calculatePriority('/test/file.js', ChangeType.MODIFIED, {});
      expect(result).toBe(Priority.LOW);
    });
  });

  describe('edge cases', () => {
    it('should handle filePath = null', () => {
      const result = calculatePriority(null, ChangeType.MODIFIED, {});
      expect(result).toBeDefined();
    });

    it('should handle changeType = null', () => {
      const result = calculatePriority('/test/file.js', null, {});
      expect(result).toBeDefined();
    });

    it('should throw when options = null (no null guard)', () => {
      expect(() => calculatePriority('/test/file.js', ChangeType.MODIFIED, null)).toThrow(TypeError);
    });
  });
});

// ── priorityToString ──────────────────────────────────────────────────────────

describe('priorityToString', () => {
  describe('branches', () => {
    it('should return critical when input is Priority.CRITICAL', () => {
      expect(priorityToString(Priority.CRITICAL)).toBe('critical');
    });

    it('should return high when input is Priority.HIGH', () => {
      expect(priorityToString(Priority.HIGH)).toBe('high');
    });

    it('should return medium when input is Priority.MEDIUM', () => {
      expect(priorityToString(Priority.MEDIUM)).toBe('medium');
    });

    it('should return low when input is Priority.LOW', () => {
      expect(priorityToString(Priority.LOW)).toBe('low');
    });

    it('should return low as default for unknown priority', () => {
      expect(priorityToString(999)).toBe('low');
    });
  });

  describe('edge cases', () => {
    it('should handle null input', () => {
      expect(priorityToString(null)).toBeDefined();
    });
  });
});

// ── stringToPriority ──────────────────────────────────────────────────────────

describe('stringToPriority', () => {
  describe('branches', () => {
    it('should return Priority.CRITICAL when input is critical', () => {
      expect(stringToPriority('critical')).toBe(Priority.CRITICAL);
    });

    it('should return Priority.HIGH when input is high', () => {
      expect(stringToPriority('high')).toBe(Priority.HIGH);
    });

    it('should return Priority.MEDIUM when input is medium', () => {
      expect(stringToPriority('medium')).toBe(Priority.MEDIUM);
    });

    it('should return Priority.LOW when input is low', () => {
      expect(stringToPriority('low')).toBe(Priority.LOW);
    });

    it('should return Priority.LOW as default for unknown string', () => {
      expect(stringToPriority('unknown')).toBe(Priority.LOW);
    });

    it('should be case-insensitive', () => {
      expect(stringToPriority('CRITICAL')).toBe(Priority.CRITICAL);
      expect(stringToPriority('High')).toBe(Priority.HIGH);
    });
  });

  describe('edge cases', () => {
    it('should handle null/undefined', () => {
      expect(stringToPriority(null)).toBeDefined();
      expect(stringToPriority(undefined)).toBeDefined();
    });
  });
});
