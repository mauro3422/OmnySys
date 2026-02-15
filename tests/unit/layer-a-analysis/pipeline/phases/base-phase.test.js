/**
 * @fileoverview Base Phase Tests
 * 
 * Tests for the ExtractionPhase base class.
 * 
 * @module tests/unit/layer-a-analysis/pipeline/phases/base-phase
 */

import { describe, it, expect } from 'vitest';
import { ExtractionPhase } from '../../../../../src/layer-a-static/pipeline/phases/base-phase.js';

describe('Base Phase (ExtractionPhase)', () => {
  // ============================================================================
  // Structure Contract
  // ============================================================================
  describe('Structure Contract', () => {
    it('should export ExtractionPhase class', () => {
      expect(ExtractionPhase).toBeDefined();
      expect(typeof ExtractionPhase).toBe('function');
    });

    it('should be instantiable with name', () => {
      const phase = new ExtractionPhase('test-phase');
      expect(phase).toBeDefined();
      expect(phase.name).toBe('test-phase');
    });

    it('should store phase name', () => {
      const phase = new ExtractionPhase('custom-phase');
      expect(phase.name).toBe('custom-phase');
    });
  });

  // ============================================================================
  // Abstract Methods Contract
  // ============================================================================
  describe('Abstract Methods Contract', () => {
    it('should throw when execute() is not implemented', async () => {
      const phase = new ExtractionPhase('test');
      await expect(phase.execute({})).rejects.toThrow('Phase test must implement execute()');
    });

    it('should have execute method', () => {
      const phase = new ExtractionPhase('test');
      expect(typeof phase.execute).toBe('function');
    });
  });

  // ============================================================================
  // canExecute() Contract
  // ============================================================================
  describe('canExecute() Contract', () => {
    it('should have canExecute method', () => {
      const phase = new ExtractionPhase('test');
      expect(typeof phase.canExecute).toBe('function');
    });

    it('should return true by default', () => {
      const phase = new ExtractionPhase('test');
      expect(phase.canExecute({})).toBe(true);
    });

    it('should return true with null context', () => {
      const phase = new ExtractionPhase('test');
      expect(phase.canExecute(null)).toBe(true);
    });

    it('should return true with empty object', () => {
      const phase = new ExtractionPhase('test');
      expect(phase.canExecute({})).toBe(true);
    });

    it('should return true with any context', () => {
      const phase = new ExtractionPhase('test');
      expect(phase.canExecute({ atoms: [], filePath: 'test.js' })).toBe(true);
    });
  });

  // ============================================================================
  // validateContext() Contract
  // ============================================================================
  describe('validateContext() Contract', () => {
    it('should have validateContext method', () => {
      const phase = new ExtractionPhase('test');
      expect(typeof phase.validateContext).toBe('function');
    });

    it('should return true for valid object context', () => {
      const phase = new ExtractionPhase('test');
      expect(phase.validateContext({})).toBe(true);
    });

    it('should return true for context with properties', () => {
      const phase = new ExtractionPhase('test');
      expect(phase.validateContext({ atoms: [], filePath: 'test.js' })).toBe(true);
    });

    it('should return false for null context', () => {
      const phase = new ExtractionPhase('test');
      expect(phase.validateContext(null)).toBe(false);
    });

    it('should return false for undefined context', () => {
      const phase = new ExtractionPhase('test');
      expect(phase.validateContext(undefined)).toBe(false);
    });

    it('should return false for string context', () => {
      const phase = new ExtractionPhase('test');
      expect(phase.validateContext('invalid')).toBe(false);
    });

    it('should return false for number context', () => {
      const phase = new ExtractionPhase('test');
      expect(phase.validateContext(123)).toBe(false);
    });

    it('should return false for array context', () => {
      const phase = new ExtractionPhase('test');
      expect(phase.validateContext([])).toBe(true); // Arrays are objects
    });
  });

  // ============================================================================
  // handleError() Contract
  // ============================================================================
  describe('handleError() Contract', () => {
    it('should have handleError method', () => {
      const phase = new ExtractionPhase('test');
      expect(typeof phase.handleError).toBe('function');
    });

    it('should re-throw error by default', () => {
      const phase = new ExtractionPhase('test');
      const error = new Error('Test error');
      expect(() => phase.handleError(error, {})).toThrow('Test error');
    });

    it('should preserve error message', () => {
      const phase = new ExtractionPhase('test');
      const error = new Error('Custom error message');
      expect(() => phase.handleError(error, {})).toThrow('Custom error message');
    });

    it('should preserve error type', () => {
      const phase = new ExtractionPhase('test');
      const error = new TypeError('Type error');
      expect(() => phase.handleError(error, {})).toThrow(TypeError);
    });
  });

  // ============================================================================
  // Error Handling Contract
  // ============================================================================
  describe('Error Handling Contract', () => {
    it('should handle empty phase name', () => {
      const phase = new ExtractionPhase('');
      expect(phase.name).toBe('');
    });

    it('should handle very long phase name', () => {
      const longName = 'a'.repeat(1000);
      const phase = new ExtractionPhase(longName);
      expect(phase.name).toBe(longName);
    });

    it('should handle special characters in phase name', () => {
      const name = 'phase-with_special.chars';
      const phase = new ExtractionPhase(name);
      expect(phase.name).toBe(name);
    });

    it('should handle error with null context', () => {
      const phase = new ExtractionPhase('test');
      const error = new Error('Error');
      expect(() => phase.handleError(error, null)).toThrow();
    });

    it('should handle error with undefined context', () => {
      const phase = new ExtractionPhase('test');
      const error = new Error('Error');
      expect(() => phase.handleError(error, undefined)).toThrow();
    });
  });

  // ============================================================================
  // Extensibility Contract
  // ============================================================================
  describe('Extensibility Contract', () => {
    it('should be extendable', () => {
      class CustomPhase extends ExtractionPhase {
        async execute(context) {
          return { ...context, custom: true };
        }
      }
      
      const phase = new CustomPhase('custom');
      expect(phase.name).toBe('custom');
    });

    it('should allow overriding canExecute', () => {
      class ConditionalPhase extends ExtractionPhase {
        canExecute(context) {
          return context?.atoms?.length > 0;
        }
        
        async execute(context) {
          return context;
        }
      }
      
      const phase = new ConditionalPhase('conditional');
      expect(phase.canExecute({ atoms: [] })).toBe(false);
      expect(phase.canExecute({ atoms: [{}] })).toBe(true);
    });

    it('should allow overriding validateContext', () => {
      class StrictPhase extends ExtractionPhase {
        validateContext(context) {
          return context && typeof context.filePath === 'string';
        }
        
        async execute(context) {
          return context;
        }
      }
      
      const phase = new StrictPhase('strict');
      expect(phase.validateContext({ filePath: 'test.js' })).toBe(true);
      expect(phase.validateContext({})).toBe(false);
    });

    it('should allow overriding handleError', () => {
      class SafePhase extends ExtractionPhase {
        handleError(error, context) {
          return { error: error.message, context };
        }
        
        async execute(context) {
          return context;
        }
      }
      
      const phase = new SafePhase('safe');
      const result = phase.handleError(new Error('Test'), {});
      expect(result.error).toBe('Test');
    });

    it('should support async execute in subclasses', async () => {
      class AsyncPhase extends ExtractionPhase {
        async execute(context) {
          await new Promise(resolve => setTimeout(resolve, 1));
          return { ...context, processed: true };
        }
      }
      
      const phase = new AsyncPhase('async');
      const result = await phase.execute({});
      expect(result.processed).toBe(true);
    });
  });

  // ============================================================================
  // Integration - Real-world patterns
  // ============================================================================
  describe('Integration - Real-world patterns', () => {
    it('should work as base for complete phase implementation', async () => {
      class CompletePhase extends ExtractionPhase {
        constructor() {
          super('complete');
        }

        canExecute(context) {
          return context && typeof context.filePath === 'string';
        }

        validateContext(context) {
          return super.validateContext(context) && !!context.filePath;
        }

        async execute(context) {
          if (!this.validateContext(context)) {
            throw new Error('Invalid context');
          }
          return { ...context, executed: true };
        }

        handleError(error, context) {
          return { error: error.message, context, success: false };
        }
      }

      const phase = new CompletePhase();
      
      // Test canExecute
      expect(phase.canExecute({ filePath: 'test.js' })).toBe(true);
      expect(phase.canExecute({})).toBe(false);
      
      // Test validateContext
      expect(phase.validateContext({ filePath: 'test.js' })).toBe(true);
      expect(phase.validateContext({})).toBe(false);
      
      // Test execute
      const result = await phase.execute({ filePath: 'test.js' });
      expect(result.executed).toBe(true);
      
      // Test error handling
      const errorResult = phase.handleError(new Error('Test'), {});
      expect(errorResult.success).toBe(false);
    });

    it('should support phase chaining pattern', async () => {
      const phases = [];
      
      class Phase1 extends ExtractionPhase {
        async execute(ctx) {
          return { ...ctx, phase1: true };
        }
      }
      
      class Phase2 extends ExtractionPhase {
        canExecute(ctx) {
          return ctx.phase1 === true;
        }
        
        async execute(ctx) {
          return { ...ctx, phase2: true };
        }
      }
      
      phases.push(new Phase1('p1'));
      phases.push(new Phase2('p2'));
      
      let context = { data: 'initial' };
      
      for (const phase of phases) {
        if (phase.canExecute(context)) {
          context = await phase.execute(context);
        }
      }
      
      expect(context.phase1).toBe(true);
      expect(context.phase2).toBe(true);
    });
  });
});
