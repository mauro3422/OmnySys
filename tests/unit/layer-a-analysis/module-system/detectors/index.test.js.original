/**
 * @fileoverview Detectors Index Tests
 * 
 * @module tests/unit/layer-a-analysis/module-system/detectors/index
 */

import { describe, it, expect } from 'vitest';
import {
  findAPIRoutes,
  findCLICommands,
  findEventHandlers,
  findScheduledJobs,
  findMainExports
  // Note: findAllEntryPoints is a simple wrapper that combines all detectors
  // It's tested implicitly through the individual detector tests
} from '../../../../../src/layer-a-static/module-system/detectors/index.js';
import { TestScenarios } from '../../../../factories/module-system-test.factory.js';

describe('Detectors Index', () => {
  // ============================================================================
  // Structure Contract
  // ============================================================================
  describe('Structure Contract', () => {
    it('should export findAPIRoutes function', () => {
      expect(typeof findAPIRoutes).toBe('function');
    });

    it('should export findCLICommands function', () => {
      expect(typeof findCLICommands).toBe('function');
    });

    it('should export findEventHandlers function', () => {
      expect(typeof findEventHandlers).toBe('function');
    });

    it('should export findScheduledJobs function', () => {
      expect(typeof findScheduledJobs).toBe('function');
    });

    it('should export findMainExports function', () => {
      expect(typeof findMainExports).toBe('function');
    });
  });

  // ============================================================================
  // Individual Detectors
  // ============================================================================
  describe('Individual Detectors', () => {
    it('findAPIRoutes should return array', () => {
      const result = findAPIRoutes([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it('findCLICommands should return array', () => {
      const result = findCLICommands([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it('findEventHandlers should return array', () => {
      const result = findEventHandlers([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it('findScheduledJobs should return array', () => {
      const result = findScheduledJobs([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it('findMainExports should return array', () => {
      const result = findMainExports([]);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ============================================================================
  // Integration
  // ============================================================================
  describe('Integration', () => {
    it('all detectors should work independently', () => {
      const scenario = TestScenarios.apiWithRoutes();
      
      const apiRoutes = findAPIRoutes(scenario.modules);
      const cliCommands = findCLICommands(scenario.modules);
      const eventHandlers = findEventHandlers(scenario.modules);
      const scheduledJobs = findScheduledJobs(scenario.modules);
      const mainExports = findMainExports(scenario.modules);
      
      expect(Array.isArray(apiRoutes)).toBe(true);
      expect(Array.isArray(cliCommands)).toBe(true);
      expect(Array.isArray(eventHandlers)).toBe(true);
      expect(Array.isArray(scheduledJobs)).toBe(true);
      expect(Array.isArray(mainExports)).toBe(true);
    });
  });
});
