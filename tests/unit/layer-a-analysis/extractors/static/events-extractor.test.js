/**
 * @fileoverview events-extractor.test.js
 * 
 * Tests for Events Extractor
 * Tests extractEventNames, extractEventListeners, extractEventEmitters
 * 
 * @module tests/unit/layer-a-analysis/extractors/static/events-extractor
 */

import { describe, it, expect } from 'vitest';
import {
  extractEventNames,
  extractEventListeners,
  extractEventEmitters
} from '#layer-a/extractors/static/events-extractor.js';
import { EventBuilder } from '../../../../factories/static-extractor-test.factory.js';

describe('Events Extractor', () => {
  describe('extractEventNames', () => {
    it('should extract addEventListener calls', () => {
      const code = 'document.addEventListener("click", handleClick);';

      const result = extractEventNames(code);

      expect(result.listeners).toHaveLength(1);
      expect(result.listeners[0].event).toBe('click');
      expect(result.listeners[0].type).toBe('listener');
      expect(result.listeners[0].line).toBe(1);
    });

    it('should extract multiple event listeners', () => {
      const builder = new EventBuilder();
      builder.withEventListener('click', 'handleClick')
        .withEventListener('submit', 'handleSubmit', 'form')
        .withEventListener('keydown', 'handleKeydown', 'window');
      const { code } = builder.build();

      const result = extractEventNames(code);

      expect(result.listeners.length).toBeGreaterThanOrEqual(3);
      expect(result.all.length).toBeGreaterThanOrEqual(3);
    });

    it('should extract .on() method calls', () => {
      const code = 'emitter.on("data", handleData);';

      const result = extractEventNames(code);

      expect(result.listeners.some(e => e.event === 'data')).toBe(true);
    });

    it('should extract .once() method calls', () => {
      const code = 'emitter.once("ready", init);';

      const result = extractEventNames(code);

      expect(result.listeners.some(e => e.event === 'ready')).toBe(true);
    });

    it('should extract CustomEvent dispatch', () => {
      const code = 'document.dispatchEvent(new CustomEvent("app:ready", { detail: {} }));';

      const result = extractEventNames(code);

      expect(result.emitters.some(e => e.event === 'app:ready')).toBe(true);
    });

    it('should extract Event dispatch', () => {
      const code = 'window.dispatchEvent(new Event("load"));';

      const result = extractEventNames(code);

      expect(result.emitters.some(e => e.event === 'load')).toBe(true);
    });

    it('should extract .emit() method calls', () => {
      const code = 'emitter.emit("update", payload);';

      const result = extractEventNames(code);

      expect(result.emitters.some(e => e.event === 'update')).toBe(true);
    });

    it('should return listeners and emitters arrays', () => {
      const builder = new EventBuilder();
      builder.withEventListener('click', 'handler')
        .withEmitMethod('update', 'data');
      const { code } = builder.build();

      const result = extractEventNames(code);

      expect(result).toHaveProperty('listeners');
      expect(result).toHaveProperty('emitters');
      expect(result).toHaveProperty('all');
      expect(Array.isArray(result.listeners)).toBe(true);
      expect(Array.isArray(result.emitters)).toBe(true);
      expect(Array.isArray(result.all)).toBe(true);
    });

    it('should include line numbers', () => {
      const code = `
        document.addEventListener('click', handler);
      `;

      const result = extractEventNames(code);

      expect(result.listeners[0].line).toBeGreaterThan(0);
    });

    it('should handle empty code', () => {
      const result = extractEventNames('');

      expect(result.listeners).toEqual([]);
      expect(result.emitters).toEqual([]);
      expect(result.all).toEqual([]);
    });

    it('should handle code with no events', () => {
      const code = 'const x = 1;';

      const result = extractEventNames(code);

      expect(result.listeners).toEqual([]);
      expect(result.emitters).toEqual([]);
    });

    it('should combine listeners and emitters in all', () => {
      const builder = new EventBuilder();
      builder.withEventListener('event1', 'handler')
        .withEmitMethod('event2', 'data');
      const { code } = builder.build();

      const result = extractEventNames(code);

      expect(result.all.length).toBe(result.listeners.length + result.emitters.length);
    });

    it('should extract events from EventBuilder DOM events', () => {
      const builder = new EventBuilder();
      builder.withDOMEvents();
      const { code, events } = builder.build();

      const result = extractEventNames(code);

      expect(result.all.length).toBeGreaterThanOrEqual(events.all.length);
    });

    it('should extract events from EventBuilder event bus', () => {
      const builder = new EventBuilder();
      builder.withEventBus();
      const { code, events } = builder.build();

      const result = extractEventNames(code);

      expect(result.all.length).toBeGreaterThanOrEqual(events.all.length);
    });
  });

  describe('extractEventListeners', () => {
    it('should return unique event names only', () => {
      const code = `
        document.addEventListener('click', handler1);
        document.addEventListener('click', handler2);
        document.addEventListener('submit', handler3);
      `;

      const result = extractEventListeners(code);

      expect(result).toContain('click');
      expect(result).toContain('submit');
    });

    it('should return array of strings', () => {
      const code = 'document.addEventListener("click", handler);';

      const result = extractEventListeners(code);

      expect(Array.isArray(result)).toBe(true);
      result.forEach(event => {
        expect(typeof event).toBe('string');
      });
    });

    it('should handle empty code', () => {
      const result = extractEventListeners('');

      expect(result).toEqual([]);
    });
  });

  describe('extractEventEmitters', () => {
    it('should return unique emitted event names', () => {
      const code = `
        emitter.emit('event1', data);
        emitter.emit('event1', moreData);
        emitter.emit('event2', data);
      `;

      const result = extractEventEmitters(code);

      expect(result).toContain('event1');
      expect(result).toContain('event2');
    });

    it('should include CustomEvent names', () => {
      const code = 'document.dispatchEvent(new CustomEvent("custom", {}));';

      const result = extractEventEmitters(code);

      expect(result).toContain('custom');
    });

    it('should include Event names', () => {
      const code = 'window.dispatchEvent(new Event("resize"));';

      const result = extractEventEmitters(code);

      expect(result).toContain('resize');
    });

    it('should handle empty code', () => {
      const result = extractEventEmitters('');

      expect(result).toEqual([]);
    });
  });

  describe('Event types', () => {
    it('should distinguish between listener and emitter', () => {
      const builder = new EventBuilder();
      builder.withEventListener('click', 'handler')
        .withEmitMethod('click', 'data');
      const { code } = builder.build();

      const result = extractEventNames(code);

      expect(result.listeners.every(e => e.type === 'listener')).toBe(true);
      expect(result.emitters.every(e => e.type === 'emitter')).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle null code', () => {
      expect(() => extractEventNames(null)).not.toThrow();
    });

    it('should handle undefined code', () => {
      expect(() => extractEventNames(undefined)).not.toThrow();
    });

    it('should handle complex event patterns', () => {
      const code = `
        // Multiple listeners
        document.addEventListener('DOMContentLoaded', init);
        window.addEventListener('resize', debounce(handleResize, 100));
        
        // Custom event emitter
        const event = new CustomEvent('user:login', { detail: user });
        document.dispatchEvent(event);
        
        // EventEmitter style
        eventBus.on('data:update', updateHandler);
        eventBus.emit('data:update', newData);
      `;

      const result = extractEventNames(code);

      expect(result.all.length).toBeGreaterThan(0);
      expect(result.listeners.length).toBeGreaterThan(0);
      expect(result.emitters.length).toBeGreaterThan(0);
    });

    it('should handle events with special characters in names', () => {
      const code = `
        emitter.on('user:login', handler);
        emitter.on('app:ready:init', init);
      `;

      const result = extractEventNames(code);

      expect(result.listeners.some(e => e.event === 'user:login')).toBe(true);
      expect(result.listeners.some(e => e.event === 'app:ready:init')).toBe(true);
    });
  });
});
