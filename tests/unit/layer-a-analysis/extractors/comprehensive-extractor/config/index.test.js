/**
 * @fileoverview config/index.test.js
 * 
 * Tests for the config module index exports
 * 
 * @module tests/unit/layer-a-analysis/extractors/comprehensive-extractor/config/index
 */

import { describe, it, expect } from 'vitest';
import * as ConfigModule from '#layer-a/extractors/comprehensive-extractor/config/index.js';

describe('Config Module - Index', () => {
  describe('Exports', () => {
    it('should export DEFAULT_CONFIG', () => {
      expect(ConfigModule.DEFAULT_CONFIG).toBeDefined();
      expect(typeof ConfigModule.DEFAULT_CONFIG).toBe('object');
    });

    it('should export EXTRACTOR_STATS', () => {
      expect(ConfigModule.EXTRACTOR_STATS).toBeDefined();
      expect(typeof ConfigModule.EXTRACTOR_STATS).toBe('object');
    });

    it('should export DETAIL_LEVELS', () => {
      expect(ConfigModule.DETAIL_LEVELS).toBeDefined();
      expect(typeof ConfigModule.DETAIL_LEVELS).toBe('object');
    });

    it('should export mergeConfig function', () => {
      expect(ConfigModule.mergeConfig).toBeDefined();
      expect(typeof ConfigModule.mergeConfig).toBe('function');
    });
  });

  describe('Re-export Integrity', () => {
    it('should re-export from defaults.js', () => {
      // Verify the exports match what's expected from defaults
      expect(ConfigModule.DEFAULT_CONFIG.extractors).toBeDefined();
      expect(ConfigModule.DEFAULT_CONFIG.detailLevel).toBe('standard');
    });

    it('mergeConfig should work correctly', () => {
      const result = ConfigModule.mergeConfig({ detailLevel: 'detailed' });
      expect(result.detailLevel).toBe('detailed');
      expect(result.extractors.functions).toBe(true);
    });
  });
});
