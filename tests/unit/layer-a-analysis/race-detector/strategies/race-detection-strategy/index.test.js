/**
 * @fileoverview race-detection-strategy/index.test.js
 * 
 * Tests for race detection strategy module index.
 * 
 * @module tests/unit/layer-a-analysis/race-detector/strategies/race-detection-strategy/index
 */

import { describe, it, expect } from 'vitest';

describe('RaceDetectionStrategy Module Index', () => {
  describe('Module Exports', () => {
    it('should export RaceDetectionStrategy', async () => {
      const { RaceDetectionStrategy } = await import('#layer-a/race-detector/strategies/race-detection-strategy/index.js');
      expect(RaceDetectionStrategy).toBeDefined();
      expect(typeof RaceDetectionStrategy).toBe('function');
    });

    it('should export RaceFactory', async () => {
      const { RaceFactory } = await import('#layer-a/race-detector/strategies/race-detection-strategy/index.js');
      expect(RaceFactory).toBeDefined();
      expect(typeof RaceFactory).toBe('function');
    });

    it('should export PatternRegistry', async () => {
      const { PatternRegistry } = await import('#layer-a/race-detector/strategies/race-detection-strategy/index.js');
      expect(PatternRegistry).toBeDefined();
      expect(typeof PatternRegistry).toBe('function');
    });

    it('should export defaultRegistry', async () => {
      const { defaultRegistry } = await import('#layer-a/race-detector/strategies/race-detection-strategy/index.js');
      expect(defaultRegistry).toBeDefined();
    });

    it('should export SharedStateAnalyzer', async () => {
      const { SharedStateAnalyzer } = await import('#layer-a/race-detector/strategies/race-detection-strategy/index.js');
      expect(SharedStateAnalyzer).toBeDefined();
      expect(typeof SharedStateAnalyzer).toBe('function');
    });

    it('should export TimingAnalyzer', async () => {
      const { TimingAnalyzer } = await import('#layer-a/race-detector/strategies/race-detection-strategy/index.js');
      expect(TimingAnalyzer).toBeDefined();
      expect(typeof TimingAnalyzer).toBe('function');
    });

    it('should export LockAnalyzer', async () => {
      const { LockAnalyzer } = await import('#layer-a/race-detector/strategies/race-detection-strategy/index.js');
      expect(LockAnalyzer).toBeDefined();
      expect(typeof LockAnalyzer).toBe('function');
    });

    it('should export PatternMatcher', async () => {
      const { PatternMatcher } = await import('#layer-a/race-detector/strategies/race-detection-strategy/index.js');
      expect(PatternMatcher).toBeDefined();
      expect(typeof PatternMatcher).toBe('function');
    });

    it('should export default as RaceDetectionStrategy', async () => {
      const module = await import('#layer-a/race-detector/strategies/race-detection-strategy/index.js');
      expect(module.default).toBe(module.RaceDetectionStrategy);
    });
  });

  describe('Default Registry', () => {
    it('should have default severity mappings', async () => {
      const { defaultRegistry } = await import('#layer-a/race-detector/strategies/race-detection-strategy/index.js');
      
      expect(defaultRegistry.getSeverity('WW')).toBe('high');
      expect(defaultRegistry.getSeverity('RW')).toBe('high');
      expect(defaultRegistry.getSeverity('IE')).toBe('critical');
      expect(defaultRegistry.getSeverity('EH')).toBe('medium');
    });

    it('should have default mitigation strategies', async () => {
      const { defaultRegistry } = await import('#layer-a/race-detector/strategies/race-detection-strategy/index.js');
      
      const wwMitigations = defaultRegistry.getMitigationStrategies('WW');
      expect(wwMitigations).toContain('locking');
      expect(wwMitigations).toContain('atomic-operations');
      
      const ieMitigations = defaultRegistry.getMitigationStrategies('IE');
      expect(ieMitigations).toContain('double-checked-locking');
    });
  });
});
