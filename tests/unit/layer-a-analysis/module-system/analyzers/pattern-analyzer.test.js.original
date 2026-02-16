/**
 * @fileoverview Pattern Analyzer Tests
 * 
 * @module tests/unit/layer-a-analysis/module-system/analyzers/pattern-analyzer
 */

import { describe, it, expect } from 'vitest';
import { detectArchitecturalPatterns } from '../../../../../src/layer-a-static/module-system/analyzers/pattern-analyzer.js';
import { 
  ModuleBuilder,
  TestScenarios 
} from '../../../../factories/module-system-test.factory.js';

describe('Pattern Analyzer', () => {
  // ============================================================================
  // Structure Contract
  // ============================================================================
  describe('Structure Contract', () => {
    it('should export detectArchitecturalPatterns function', () => {
      expect(typeof detectArchitecturalPatterns).toBe('function');
    });

    it('should return array', () => {
      const result = detectArchitecturalPatterns([]);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ============================================================================
  // Layered Architecture Detection
  // ============================================================================
  describe('Layered Architecture Detection', () => {
    it('should detect layered architecture when layers exist', () => {
      const modules = [
        ModuleBuilder.create('controllers').build(),
        ModuleBuilder.create('services').build(),
        ModuleBuilder.create('repositories').build()
      ];

      const patterns = detectArchitecturalPatterns(modules);
      
      const layered = patterns.find(p => p.name === 'Layered Architecture');
      expect(layered).toBeDefined();
      expect(layered.confidence).toBeGreaterThan(0);
    });

    it('should detect layered with controllers only', () => {
      const modules = [ModuleBuilder.create('controllers').build()];

      const patterns = detectArchitecturalPatterns(modules);
      
      const layered = patterns.find(p => p.name === 'Layered Architecture');
      expect(layered).toBeDefined();
    });

    it('should detect layered with services only', () => {
      const modules = [ModuleBuilder.create('services').build()];

      const patterns = detectArchitecturalPatterns(modules);
      
      const layered = patterns.find(p => p.name === 'Layered Architecture');
      expect(layered).toBeDefined();
    });

    it('should not detect layered without layer modules', () => {
      const modules = [
        ModuleBuilder.create('utils').build(),
        ModuleBuilder.create('helpers').build()
      ];

      const patterns = detectArchitecturalPatterns(modules);
      
      const layered = patterns.find(p => p.name === 'Layered Architecture');
      expect(layered).toBeUndefined();
    });

    it('should have high confidence for layered architecture', () => {
      const modules = [
        ModuleBuilder.create('controllers').build(),
        ModuleBuilder.create('services').build(),
        ModuleBuilder.create('repositories').build(),
        ModuleBuilder.create('models').build()
      ];

      const patterns = detectArchitecturalPatterns(modules);
      
      const layered = patterns.find(p => p.name === 'Layered Architecture');
      expect(layered.confidence).toBe(0.8);
    });
  });

  // ============================================================================
  // Service-Oriented Detection
  // ============================================================================
  describe('Service-Oriented Detection', () => {
    it('should detect service-oriented with 3+ service modules', () => {
      const modules = [
        ModuleBuilder.create('user-service').build(),
        ModuleBuilder.create('order-service').build(),
        ModuleBuilder.create('payment-service').build()
      ];

      const patterns = detectArchitecturalPatterns(modules);
      
      const service = patterns.find(p => p.name === 'Service-Oriented');
      expect(service).toBeDefined();
    });

    it('should not detect service-oriented with less than 3 services', () => {
      const modules = [
        ModuleBuilder.create('user-service').build(),
        ModuleBuilder.create('order-service').build()
      ];

      const patterns = detectArchitecturalPatterns(modules);
      
      const service = patterns.find(p => p.name === 'Service-Oriented');
      expect(service).toBeUndefined();
    });

    it('should detect services by export type', () => {
      const modules = [
        ModuleBuilder.create('auth').withExport('AuthService', { type: 'service' }).build(),
        ModuleBuilder.create('users').withExport('UserService', { type: 'service' }).build(),
        ModuleBuilder.create('orders').withExport('OrderService', { type: 'service' }).build()
      ];

      const patterns = detectArchitecturalPatterns(modules);
      
      const service = patterns.find(p => p.name === 'Service-Oriented');
      expect(service).toBeDefined();
    });

    it('should have moderate confidence for service-oriented', () => {
      const modules = [
        ModuleBuilder.create('user-service').build(),
        ModuleBuilder.create('order-service').build(),
        ModuleBuilder.create('payment-service').build(),
        ModuleBuilder.create('notification-service').build()
      ];

      const patterns = detectArchitecturalPatterns(modules);
      
      const service = patterns.find(p => p.name === 'Service-Oriented');
      expect(service.confidence).toBe(0.7);
    });
  });

  // ============================================================================
  // Event-Driven Detection
  // ============================================================================
  describe('Event-Driven Detection', () => {
    it('should detect event-driven with events module', () => {
      const modules = [ModuleBuilder.create('events').build()];

      const patterns = detectArchitecturalPatterns(modules);
      
      const eventDriven = patterns.find(p => p.name === 'Event-Driven Elements');
      expect(eventDriven).toBeDefined();
    });

    it('should detect event-driven with event files', () => {
      const modules = [
        ModuleBuilder.create('auth')
          .withFile('src/auth/event-handlers.js')
          .build()
      ];

      const patterns = detectArchitecturalPatterns(modules);
      
      const eventDriven = patterns.find(p => p.name === 'Event-Driven Elements');
      expect(eventDriven).toBeDefined();
    });

    it('should not detect event-driven without events', () => {
      const modules = [
        ModuleBuilder.create('auth').build(),
        ModuleBuilder.create('users').build()
      ];

      const patterns = detectArchitecturalPatterns(modules);
      
      const eventDriven = patterns.find(p => p.name === 'Event-Driven Elements');
      expect(eventDriven).toBeUndefined();
    });

    it('should have lower confidence for event-driven', () => {
      const modules = [ModuleBuilder.create('events').build()];

      const patterns = detectArchitecturalPatterns(modules);
      
      const eventDriven = patterns.find(p => p.name === 'Event-Driven Elements');
      expect(eventDriven.confidence).toBe(0.6);
    });
  });

  // ============================================================================
  // Pattern Structure
  // ============================================================================
  describe('Pattern Structure', () => {
    it('should have name property', () => {
      const scenario = TestScenarios.layeredArchitecture();
      const patterns = detectArchitecturalPatterns(scenario.modules);
      
      if (patterns.length > 0) {
        expect(patterns[0]).toHaveProperty('name');
        expect(typeof patterns[0].name).toBe('string');
      }
    });

    it('should have confidence property', () => {
      const scenario = TestScenarios.layeredArchitecture();
      const patterns = detectArchitecturalPatterns(scenario.modules);
      
      if (patterns.length > 0) {
        expect(patterns[0]).toHaveProperty('confidence');
        expect(typeof patterns[0].confidence).toBe('number');
        expect(patterns[0].confidence).toBeGreaterThan(0);
        expect(patterns[0].confidence).toBeLessThanOrEqual(1);
      }
    });

    it('should have evidence property', () => {
      const scenario = TestScenarios.layeredArchitecture();
      const patterns = detectArchitecturalPatterns(scenario.modules);
      
      if (patterns.length > 0) {
        expect(patterns[0]).toHaveProperty('evidence');
        expect(typeof patterns[0].evidence).toBe('string');
      }
    });
  });

  // ============================================================================
  // Combined Patterns
  // ============================================================================
  describe('Combined Patterns', () => {
    it('should detect multiple patterns', () => {
      const modules = [
        ModuleBuilder.create('controllers').build(),
        ModuleBuilder.create('services').build(),
        ModuleBuilder.create('user-service').build(),
        ModuleBuilder.create('order-service').build(),
        ModuleBuilder.create('payment-service').build(),
        ModuleBuilder.create('events').build()
      ];

      const patterns = detectArchitecturalPatterns(modules);
      
      expect(patterns.length).toBeGreaterThanOrEqual(2);
    });

    it('should return all applicable patterns', () => {
      const modules = [
        ModuleBuilder.create('controllers').build(),
        ModuleBuilder.create('services').build(),
        ModuleBuilder.create('user-service').build(),
        ModuleBuilder.create('order-service').build(),
        ModuleBuilder.create('payment-service').build()
      ];

      const patterns = detectArchitecturalPatterns(modules);
      
      const patternNames = patterns.map(p => p.name);
      expect(patternNames).toContain('Layered Architecture');
      expect(patternNames).toContain('Service-Oriented');
    });
  });

  // ============================================================================
  // Empty/Edge Cases
  // ============================================================================
  describe('Empty/Edge Cases', () => {
    it('should return empty array for empty modules', () => {
      const patterns = detectArchitecturalPatterns([]);
      expect(patterns).toEqual([]);
    });

    it('should handle modules without exports', () => {
      const modules = [
        { moduleName: 'test', files: [] }
      ];
      const patterns = detectArchitecturalPatterns(modules);
      expect(Array.isArray(patterns)).toBe(true);
    });
  });
});
