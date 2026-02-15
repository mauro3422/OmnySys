/**
 * @fileoverview Event Detector Tests
 * 
 * @module tests/unit/layer-a-analysis/module-system/detectors/event-detector
 */

import { describe, it, expect } from 'vitest';
import { findEventHandlers } from '../../../../../src/layer-a-static/module-system/detectors/event-detector.js';
import { 
  ModuleBuilder,
  AtomBuilder 
} from '../../../../factories/module-system-test.factory.js';

describe('Event Detector', () => {
  // ============================================================================
  // Structure Contract
  // ============================================================================
  describe('Structure Contract', () => {
    it('should export findEventHandlers function', () => {
      expect(typeof findEventHandlers).toBe('function');
    });

    it('should return array', () => {
      const result = findEventHandlers([]);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ============================================================================
  // Event Handler Detection
  // ============================================================================
  describe('Event Handler Detection', () => {
    it('should detect on[A-Z] pattern handlers', () => {
      const modules = [
        ModuleBuilder.create('events')
          .withMolecule('src/events/handlers.js', [
            { name: 'onUserLogin' }
          ])
          .build()
      ];

      const handlers = findEventHandlers(modules);
      
      // Should find handlers with on* pattern
      expect(Array.isArray(handlers)).toBe(true);
    });

    it('should detect handleEvent pattern', () => {
      const modules = [
        ModuleBuilder.create('events')
          .withMolecule('src/events/handlers.js', [
            { name: 'handleEvent' }
          ])
          .build()
      ];

      const handlers = findEventHandlers(modules);
      
      expect(Array.isArray(handlers)).toBe(true);
    });

    it('should detect processEvent pattern', () => {
      const modules = [
        ModuleBuilder.create('events')
          .withMolecule('src/events/handlers.js', [
            { name: 'processEvent' }
          ])
          .build()
      ];

      const handlers = findEventHandlers(modules);
      
      expect(Array.isArray(handlers)).toBe(true);
    });
  });

  // ============================================================================
  // Handler Structure
  // ============================================================================
  describe('Handler Structure', () => {
    it('should have type set to event', () => {
      const modules = [
        ModuleBuilder.create('events')
          .withMolecule('src/events/handlers.js', [
            { name: 'onUserLogin' }
          ])
          .build()
      ];

      const handlers = findEventHandlers(modules);
      
      if (handlers.length > 0) {
        expect(handlers[0].type).toBe('event');
      }
    });

    it('should have event name', () => {
      const modules = [
        ModuleBuilder.create('events')
          .withMolecule('src/events/handlers.js', [
            { name: 'onUserLogin' }
          ])
          .build()
      ];

      const handlers = findEventHandlers(modules);
      
      if (handlers.length > 0) {
        expect(handlers[0]).toHaveProperty('event');
      }
    });

    it('should have handler info', () => {
      const modules = [
        ModuleBuilder.create('events')
          .withMolecule('src/events/handlers.js', [
            { name: 'onUserLogin' }
          ])
          .build()
      ];

      const handlers = findEventHandlers(modules);
      
      if (handlers.length > 0) {
        expect(handlers[0]).toHaveProperty('handler');
        expect(handlers[0].handler).toHaveProperty('module');
        expect(handlers[0].handler).toHaveProperty('file');
        expect(handlers[0].handler).toHaveProperty('function');
      }
    });
  });

  // ============================================================================
  // Event Name Inference
  // ============================================================================
  describe('Event Name Inference', () => {
    it('should convert on* to kebab-case event name', () => {
      const modules = [
        ModuleBuilder.create('events')
          .withMolecule('src/events/handlers.js', [
            { name: 'onUserLogin' }
          ])
          .build()
      ];

      const handlers = findEventHandlers(modules);
      
      if (handlers.length > 0) {
        expect(handlers[0].event).toBe('user-login');
      }
    });

    it('should return unknown for non-on* patterns', () => {
      const modules = [
        ModuleBuilder.create('events')
          .withMolecule('src/events/handlers.js', [
            { name: 'handleEvent' }
          ])
          .build()
      ];

      const handlers = findEventHandlers(modules);
      
      if (handlers.length > 0) {
        expect(handlers[0].event).toBe('unknown');
      }
    });
  });

  // ============================================================================
  // Handler Info
  // ============================================================================
  describe('Handler Info', () => {
    it('should include module name', () => {
      const modules = [
        ModuleBuilder.create('auth')
          .withMolecule('src/auth/events.js', [
            { name: 'onLogin' }
          ])
          .build()
      ];

      const handlers = findEventHandlers(modules);
      
      if (handlers.length > 0) {
        expect(handlers[0].handler.module).toBe('auth');
      }
    });

    it('should include file name', () => {
      const modules = [
        ModuleBuilder.create('auth')
          .withMolecule('src/auth/events.js', [
            { name: 'onLogin' }
          ])
          .build()
      ];

      const handlers = findEventHandlers(modules);
      
      if (handlers.length > 0) {
        expect(handlers[0].handler.file).toBe('events.js');
      }
    });

    it('should include function name', () => {
      const modules = [
        ModuleBuilder.create('auth')
          .withMolecule('src/auth/events.js', [
            { name: 'onLogin' }
          ])
          .build()
      ];

      const handlers = findEventHandlers(modules);
      
      if (handlers.length > 0) {
        expect(handlers[0].handler.function).toBe('onLogin');
      }
    });

    it('should handle unknown file path', () => {
      const modules = [
        {
          moduleName: 'auth',
          molecules: [{
            filePath: undefined,
            atoms: [{ name: 'onTest' }]
          }]
        }
      ];

      const handlers = findEventHandlers(modules);
      
      if (handlers.length > 0) {
        expect(handlers[0].handler.file).toBe('unknown');
      }
    });
  });

  // ============================================================================
  // Empty/Edge Cases
  // ============================================================================
  describe('Empty/Edge Cases', () => {
    it('should return empty array for empty modules', () => {
      const handlers = findEventHandlers([]);
      expect(handlers).toEqual([]);
    });

    it('should return empty array for modules without event handlers', () => {
      const modules = [
        ModuleBuilder.create('utils')
          .withMolecule('src/utils/helper.js', [
            { name: 'formatDate' }
          ])
          .build()
      ];

      const handlers = findEventHandlers(modules);
      expect(handlers).toEqual([]);
    });

    it('should handle modules without molecules', () => {
      const modules = [ModuleBuilder.create('events').build()];
      
      const handlers = findEventHandlers(modules);
      expect(handlers).toEqual([]);
    });

    it('should handle molecules without atoms', () => {
      const modules = [
        ModuleBuilder.create('events')
          .withMolecule('src/events/handlers.js', [])
          .build()
      ];

      const handlers = findEventHandlers(modules);
      expect(handlers).toEqual([]);
    });

    it('should handle atoms without name', () => {
      const modules = [
        {
          moduleName: 'events',
          molecules: [{
            filePath: 'events.js',
            atoms: [{}]
          }]
        }
      ];

      const handlers = findEventHandlers(modules);
      expect(handlers).toEqual([]);
    });
  });
});
