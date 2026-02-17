/**
 * @fileoverview event-extractor.test.js
 * 
 * Tests para extracción de event names
 * 
 * @module tests/unit/layer-b-semantic/validators/extractors/event-extractor
 */

import { describe, it, expect } from 'vitest';
import {
  extractActualEventNames,
  extractValidEventNames,
  eventNameExists
} from '#layer-b/validators/extractors/event-extractor.js';
import { CodeSampleBuilder } from '../../../../factories/layer-b-validators/builders.js';

describe('validators/extractors/event-extractor', () => {
  describe('extractActualEventNames', () => {
    it('should return empty Set for empty code', () => {
      const result = extractActualEventNames('');
      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(0);
    });

    it('should extract events from addEventListener', () => {
      const { code } = new CodeSampleBuilder()
        .withEventListener('user:login', 'standard')
        .build();
      
      const result = extractActualEventNames(code);
      expect(result.has('user:login')).toBe(true);
    });

    it('should extract events from removeEventListener', () => {
      const { code } = new CodeSampleBuilder()
        .withEventListener('data:update', 'remove')
        .build();
      
      const result = extractActualEventNames(code);
      expect(result.has('data:update')).toBe(true);
    });

    it('should extract events from emit', () => {
      const { code } = new CodeSampleBuilder()
        .withEventListener('app:init', 'emit')
        .build();
      
      const result = extractActualEventNames(code);
      expect(result.has('app:init')).toBe(true);
    });

    it('should extract events from on', () => {
      const { code } = new CodeSampleBuilder()
        .withEventListener('user:logout', 'on')
        .build();
      
      const result = extractActualEventNames(code);
      expect(result.has('user:logout')).toBe(true);
    });

    it('should extract events from once', () => {
      const { code } = new CodeSampleBuilder()
        .withEventListener('page:load', 'once')
      .build();
      
      const result = extractActualEventNames(code);
      expect(result.has('page:load')).toBe(true);
    });

    it('should filter out DOM methods', () => {
      const code = `
        element.addEventListener('click', handler);
        element.addEventListener('custom:event', handler);
        element.addEventListener('submit', handler);
      `;
      
      const result = extractActualEventNames(code);
      expect(result.has('custom:event')).toBe(true);
      expect(result.has('click')).toBe(false);
      expect(result.has('submit')).toBe(false);
    });

    it('should extract multiple different events', () => {
      const { code } = new CodeSampleBuilder()
        .withEventListener('event1')
        .withEventListener('event2')
        .withEventListener('event3')
        .build();
      
      const result = extractActualEventNames(code);
      expect(result.size).toBe(3);
      expect(result.has('event1')).toBe(true);
      expect(result.has('event2')).toBe(true);
      expect(result.has('event3')).toBe(true);
    });

    it('should deduplicate events', () => {
      const { code } = new CodeSampleBuilder()
        .withEventListener('duplicateEvent')
        .withEventListener('duplicateEvent')
        .withEventListener('duplicateEvent')
        .build();
      
      const result = extractActualEventNames(code);
      expect(result.size).toBe(1);
      expect(result.has('duplicateEvent')).toBe(true);
    });

    it('should extract events with various quote styles', () => {
      const code = `
        element.addEventListener("double-quoted", handler);
        element.addEventListener('single-quoted', handler);
        element.addEventListener(\`template-literal\`, handler);
      `;
      
      const result = extractActualEventNames(code);
      expect(result.has('double-quoted')).toBe(true);
      expect(result.has('single-quoted')).toBe(true);
      expect(result.has('template-literal')).toBe(true);
    });

    it('should extract events from dispatchEvent', () => {
      const code = `
        element.dispatchEvent(new CustomEvent('custom:action', detail));
        element.dispatchEvent(new Event('simple:event'));
      `;
      
      const result = extractActualEventNames(code);
      expect(result.has('custom:action')).toBe(true);
      expect(result.has('simple:event')).toBe(true);
    });
  });

  describe('extractValidEventNames', () => {
    it('should return array of events', () => {
      const { code } = new CodeSampleBuilder()
        .withEventListener('event1')
        .withEventListener('event2')
        .build();
      
      const result = extractValidEventNames(code);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toContain('event1');
      expect(result).toContain('event2');
    });

    it('should return empty array for code without events', () => {
      const result = extractValidEventNames('const x = 5; console.log(x);');
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('eventNameExists', () => {
    it('should return true for existing event', () => {
      const { code } = new CodeSampleBuilder()
        .withEventListener('existingEvent')
        .build();
      
      expect(eventNameExists('existingEvent', code)).toBe(true);
    });

    it('should return false for non-existing event', () => {
      const { code } = new CodeSampleBuilder()
        .withEventListener('otherEvent')
        .build();
      
      expect(eventNameExists('nonExistingEvent', code)).toBe(false);
    });

    it('should return false for DOM methods', () => {
      const code = `element.addEventListener('customEvent', handler);`;
      expect(eventNameExists('click', code)).toBe(false);
      expect(eventNameExists('submit', code)).toBe(false);
      expect(eventNameExists('keydown', code)).toBe(false);
    });
  });
});
