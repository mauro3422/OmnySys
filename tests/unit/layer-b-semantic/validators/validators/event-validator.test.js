/**
 * @fileoverview event-validator.test.js
 * 
 * Tests para validación de event names
 * 
 * @module tests/unit/layer-b-semantic/validators/validators/event-validator
 */

import { describe, it, expect, vi } from 'vitest';
import {
  validateEventNames,
  filterInvalidEventNames,
  calculateEventConfidence
} from '#layer-b/validators/validators/event-validator.js';
import { CodeSampleBuilder } from '../../../../factories/layer-b-validators/builders.js';

describe('validators/validators/event-validator', () => {
  describe('validateEventNames', () => {
    it('should return empty array for non-array input', () => {
      expect(validateEventNames(null, new Set(['event']))).toEqual([]);
      expect(validateEventNames(undefined, new Set(['event']))).toEqual([]);
      expect(validateEventNames('string', new Set(['event']))).toEqual([]);
    });

    it('should return empty array when no actual events exist', () => {
      const llmEvents = ['event1', 'event2'];
      expect(validateEventNames(llmEvents, new Set())).toEqual([]);
      expect(validateEventNames(llmEvents, null)).toEqual([]);
    });

    it('should validate events that exist in actual events', () => {
      const llmEvents = ['user:login', 'app:update'];
      const actualEvents = new Set(['user:login', 'app:update', 'other:event']);
      
      const result = validateEventNames(llmEvents, actualEvents);
      expect(result).toContain('user:login');
      expect(result).toContain('app:update');
      expect(result.length).toBe(2);
    });

    it('should filter out events not in actual events', () => {
      const llmEvents = ['real:event', 'hallucinated:event'];
      const actualEvents = new Set(['real:event']);
      
      const result = validateEventNames(llmEvents, actualEvents);
      expect(result).toContain('real:event');
      expect(result).not.toContain('hallucinated:event');
    });

    it('should filter out DOM methods', () => {
      const llmEvents = ['custom:event', 'click', 'submit', 'keydown'];
      const actualEvents = new Set(['custom:event', 'click']);
      
      const result = validateEventNames(llmEvents, actualEvents);
      expect(result).toContain('custom:event');
      expect(result).not.toContain('click');
      expect(result).not.toContain('submit');
      expect(result).not.toContain('keydown');
    });

    it('should filter out generic placeholders', () => {
      const llmEvents = ['real:event', 'event1', 'event2'];
      const actualEvents = new Set(['real:event', 'event1']);
      
      const result = validateEventNames(llmEvents, actualEvents);
      expect(result).toContain('real:event');
      expect(result).not.toContain('event1');
      expect(result).not.toContain('event2');
    });

    it('should filter out JavaScript code', () => {
      const llmEvents = ['real:event', 'function() {}', 'console.log', 'const x = 1'];
      const actualEvents = new Set(['real:event']);
      
      const result = validateEventNames(llmEvents, actualEvents);
      expect(result).toContain('real:event');
      expect(result).not.toContain('function() {}');
      expect(result).not.toContain('console.log');
      expect(result).not.toContain('const x = 1');
    });

    it('should handle empty array', () => {
      const actualEvents = new Set(['event']);
      expect(validateEventNames([], actualEvents)).toEqual([]);
    });

    it('should handle actual events from code extraction', () => {
      const { code, eventNames: actualEvents } = new CodeSampleBuilder()
        .withEventListener('user:login')
        .withEventListener('data:update')
        .build();
      
      const llmEvents = ['user:login', 'data:update', 'fake:event'];
      const result = validateEventNames(llmEvents, actualEvents);
      
      expect(result).toContain('user:login');
      expect(result).toContain('data:update');
      expect(result).not.toContain('fake:event');
    });

    it('should handle mixed invalid events', () => {
      const llmEvents = ['valid:event', 'click', 'event1', 'function() {}'];
      const actualEvents = new Set(['valid:event', 'click', 'event1']);
      
      const result = validateEventNames(llmEvents, actualEvents);
      expect(result).toEqual(['valid:event']);
    });
  });

  describe('filterInvalidEventNames', () => {
    it('should return empty array for non-array input', () => {
      expect(filterInvalidEventNames(null)).toEqual([]);
      expect(filterInvalidEventNames(undefined)).toEqual([]);
      expect(filterInvalidEventNames('string')).toEqual([]);
    });

    it('should keep valid events', () => {
      const events = ['user:login', 'app:update', 'data:change'];
      const result = filterInvalidEventNames(events);
      expect(result).toEqual(events);
    });

    it('should filter out DOM methods without warning', () => {
      const events = ['real:event', 'click', 'submit', 'keydown'];
      const result = filterInvalidEventNames(events);
      expect(result).toContain('real:event');
      expect(result).not.toContain('click');
      expect(result).not.toContain('submit');
      expect(result).not.toContain('keydown');
    });

    it('should filter out generic placeholders', () => {
      const events = ['real:event', 'event1', 'event2', 'event3'];
      const result = filterInvalidEventNames(events);
      expect(result).toContain('real:event');
      expect(result).not.toContain('event1');
      expect(result).not.toContain('event2');
      expect(result).not.toContain('event3');
    });

    it('should filter out JavaScript code', () => {
      const events = ['real:event', 'function() {}', 'const x = {y: 1}', '() => {}'];
      const result = filterInvalidEventNames(events);
      expect(result).toContain('real:event');
      expect(result).not.toContain('function() {}');
      expect(result).not.toContain('const x = {y: 1}');
      expect(result).not.toContain('() => {}');
    });

    it('should handle empty array', () => {
      expect(filterInvalidEventNames([])).toEqual([]);
    });

    it('should handle all invalid events', () => {
      const events = ['click', 'event1', 'function() {}'];
      const result = filterInvalidEventNames(events);
      expect(result).toEqual([]);
    });
  });

  describe('calculateEventConfidence', () => {
    it('should return 0 for empty original events', () => {
      expect(calculateEventConfidence([], [])).toBe(0);
      expect(calculateEventConfidence(['event'], [])).toBe(0);
      expect(calculateEventConfidence(['event'], null)).toBe(0);
    });

    it('should return 1 when all events are validated', () => {
      const validatedEvents = ['event1', 'event2'];
      const originalEvents = ['event1', 'event2'];
      expect(calculateEventConfidence(validatedEvents, originalEvents)).toBe(1);
    });

    it('should return 0.5 when half are validated', () => {
      const validatedEvents = ['event1'];
      const originalEvents = ['event1', 'event2'];
      expect(calculateEventConfidence(validatedEvents, originalEvents)).toBe(0.5);
    });

    it('should return 0 when none are validated', () => {
      const validatedEvents = [];
      const originalEvents = ['event1', 'event2'];
      expect(calculateEventConfidence(validatedEvents, originalEvents)).toBe(0);
    });

    it('should handle more validated than original', () => {
      const validatedEvents = ['event1', 'event2', 'event3'];
      const originalEvents = ['event1', 'event2'];
      expect(calculateEventConfidence(validatedEvents, originalEvents)).toBe(1.5);
    });

    it('should handle single event', () => {
      expect(calculateEventConfidence(['event'], ['event'])).toBe(1);
      expect(calculateEventConfidence([], ['event'])).toBe(0);
    });
  });
});
