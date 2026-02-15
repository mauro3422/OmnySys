/**
 * @fileoverview Config Manager Tests
 * 
 * Tests for ConfigManager from engine/ConfigManager.js.
 * 
 * @module tests/unit/layer-a-analysis/pattern-detection/engine/ConfigManager
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ConfigManager } from '#layer-a/pattern-detection/engine/ConfigManager.js';

describe('ConfigManager', () => {
  let configManager;

  beforeEach(() => {
    configManager = new ConfigManager({});
  });

  /**
   * ============================================
   * STRUCTURE CONTRACT
   * ============================================
   */

  describe('Structure Contract', () => {
    it('should be instantiable', () => {
      expect(configManager).toBeInstanceOf(ConfigManager);
    });

    it('should have config property', () => {
      expect(configManager).toHaveProperty('config');
    });

    it('should have mergeConfig method', () => {
      expect(typeof configManager.mergeConfig).toBe('function');
    });

    it('should have detectProjectType method', () => {
      expect(typeof configManager.detectProjectType).toBe('function');
    });

    it('should have getThresholds method', () => {
      expect(typeof configManager.getThresholds).toBe('function');
    });

    it('should have getConfig method', () => {
      expect(typeof configManager.getConfig).toBe('function');
    });

    it('should have getProjectType method', () => {
      expect(typeof configManager.getProjectType).toBe('function');
    });
  });

  /**
   * ============================================
   * INITIALIZATION CONTRACT
   * ============================================
   */

  describe('Initialization Contract', () => {
    it('should use default config when no custom config provided', () => {
      expect(configManager.getConfig()).toBeDefined();
      expect(configManager.getConfig().thresholds).toBeDefined();
      expect(configManager.getConfig().weights).toBeDefined();
    });

    it('should merge custom config with defaults', () => {
      const customManager = new ConfigManager({
        projectType: 'microservices',
        customField: 'value'
      });

      expect(customManager.getConfig().projectType).toBe('microservices');
      expect(customManager.getConfig().customField).toBe('value');
      expect(customManager.getConfig().thresholds).toBeDefined(); // from defaults
    });

    it('should merge nested threshold config', () => {
      const customManager = new ConfigManager({
        thresholds: {
          deepChains: {
            minDepth: 10
          }
        }
      });

      expect(customManager.getConfig().thresholds.deepChains.minDepth).toBe(10);
      expect(customManager.getConfig().thresholds.deepChains.maxAcceptable).toBeDefined(); // from defaults
    });

    it('should merge nested weights config', () => {
      const customManager = new ConfigManager({
        weights: {
          deepChains: 0.25
        }
      });

      expect(customManager.getConfig().weights.deepChains).toBe(0.25);
      expect(customManager.getConfig().weights.sharedObjects).toBeDefined(); // from defaults
    });

    it('should merge nested features config', () => {
      const customManager = new ConfigManager({
        features: {
          enableHistory: true
        }
      });

      expect(customManager.getConfig().features.enableHistory).toBe(true);
      expect(customManager.getConfig().features.enableHeuristics).toBeDefined(); // from defaults
    });
  });

  /**
   * ============================================
   * PROJECT TYPE DETECTION CONTRACT
   * ============================================
   */

  describe('Project Type Detection Contract', () => {
    it('should detect microservices project', () => {
      const systemMap = {
        files: {
          'src/services/userService.js': {},
          'src/gateway/apiGateway.js': {},
          'src/broker/messageBroker.js': {}
        }
      };

      configManager.detectProjectType(systemMap);
      expect(configManager.getProjectType()).toBe('microservices');
    });

    it('should detect library project', () => {
      const systemMap = {
        files: {
          'src/index.js': {},
          'src/utils.js': {},
          'src/helpers.js': {}
        }
      };

      configManager.detectProjectType(systemMap);
      expect(configManager.getProjectType()).toBe('library');
    });

    it('should default to standard project type', () => {
      const systemMap = {
        files: {
          'src/app.js': {},
          'src/components/Button.js': {},
          'src/test/Button.test.js': {}
        }
      };

      configManager.detectProjectType(systemMap);
      expect(configManager.getProjectType()).toBe('standard');
    });

    it('should detect project with many test files as standard', () => {
      const files = {
        'src/index.js': {}
      };
      // Add many test files (> 30% of total)
      for (let i = 0; i < 10; i++) {
        files[`src/test${i}.test.js`] = {};
      }

      const systemMap = { files };
      configManager.detectProjectType(systemMap);
      expect(configManager.getProjectType()).toBe('standard');
    });

    it('should return detected project type', () => {
      const systemMap = {
        files: {
          'src/services/testService.js': {}
        }
      };

      const result = configManager.detectProjectType(systemMap);
      expect(result).toBe('microservices');
    });
  });

  /**
   * ============================================
   * THRESHOLDS RETRIEVAL CONTRACT
   * ============================================
   */

  describe('Thresholds Retrieval Contract', () => {
    it('should get thresholds for existing detector', () => {
      const thresholds = configManager.getThresholds('deepChains');
      expect(thresholds).toBeDefined();
      expect(thresholds).toHaveProperty('minDepth');
    });

    it('should return empty object for unknown detector', () => {
      const thresholds = configManager.getThresholds('unknown-detector');
      expect(thresholds).toEqual({});
    });

    it('should get thresholds with merged custom values', () => {
      const customManager = new ConfigManager({
        thresholds: {
          customDetector: {
            threshold: 50
          }
        }
      });

      const thresholds = customManager.getThresholds('customDetector');
      expect(thresholds.threshold).toBe(50);
    });
  });

  /**
   * ============================================
   * CONFIG RETRIEVAL CONTRACT
   * ============================================
   */

  describe('Config Retrieval Contract', () => {
    it('should return full config', () => {
      const config = configManager.getConfig();
      expect(config).toHaveProperty('thresholds');
      expect(config).toHaveProperty('weights');
      expect(config).toHaveProperty('projectType');
      expect(config).toHaveProperty('features');
    });

    it('should return same config object on multiple calls', () => {
      const config1 = configManager.getConfig();
      const config2 = configManager.getConfig();
      expect(config1).toBe(config2);
    });
  });

  /**
   * ============================================
   * MERGE CONFIG CONTRACT
   * ============================================
   */

  describe('Merge Config Contract', () => {
    it('should merge top-level properties', () => {
      const merged = configManager.mergeConfig(
        { a: 1, b: 2 },
        { b: 3, c: 4 }
      );
      expect(merged).toEqual({ a: 1, b: 3, c: 4 });
    });

    it('should deeply merge thresholds', () => {
      const merged = configManager.mergeConfig(
        { thresholds: { a: { x: 1 }, b: { y: 2 } } },
        { thresholds: { a: { z: 3 } } }
      );
      expect(merged.thresholds).toEqual({
        a: { x: 1, z: 3 },
        b: { y: 2 }
      });
    });

    it('should deeply merge weights', () => {
      const merged = configManager.mergeConfig(
        { weights: { a: 0.5, b: 0.3 } },
        { weights: { b: 0.4 } }
      );
      expect(merged.weights).toEqual({ a: 0.5, b: 0.4 });
    });

    it('should deeply merge features', () => {
      const merged = configManager.mergeConfig(
        { features: { a: true, b: false } },
        { features: { b: true } }
      );
      expect(merged.features).toEqual({ a: true, b: true });
    });
  });

  /**
   * ============================================
   * ERROR HANDLING CONTRACT
   * ============================================
   */

  describe('Error Handling Contract', () => {
    it('should handle null systemMap in detectProjectType', () => {
      expect(() => configManager.detectProjectType(null)).not.toThrow();
    });

    it('should handle empty systemMap in detectProjectType', () => {
      configManager.detectProjectType({});
      expect(configManager.getProjectType()).toBe('standard');
    });

    it('should handle systemMap without files', () => {
      configManager.detectProjectType({ functions: {} });
      expect(configManager.getProjectType()).toBe('standard');
    });

    it('should handle null custom config', () => {
      const nullManager = new ConfigManager(null);
      expect(nullManager.getConfig()).toBeDefined();
    });

    it('should handle undefined custom config values', () => {
      const undefinedManager = new ConfigManager({
        projectType: undefined,
        thresholds: undefined
      });
      expect(undefinedManager.getConfig().projectType).toBe('standard');
    });
  });
});
