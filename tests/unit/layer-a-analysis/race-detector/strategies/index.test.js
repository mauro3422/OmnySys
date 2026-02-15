/**
 * @fileoverview strategies/index.test.js
 * 
 * Tests for strategy index exports.
 * 
 * @module tests/unit/layer-a-analysis/race-detector/strategies/index
 */

import { describe, it, expect } from 'vitest';

describe('Strategies Index', () => {
  describe('Module Exports', () => {
    it('should export RaceDetectionStrategy', async () => {
      const { RaceDetectionStrategy } = await import('#layer-a/race-detector/strategies/index.js');
      expect(RaceDetectionStrategy).toBeDefined();
      expect(typeof RaceDetectionStrategy).toBe('function');
    });

    it('should export ReadWriteRaceStrategy', async () => {
      const { ReadWriteRaceStrategy } = await import('#layer-a/race-detector/strategies/index.js');
      expect(ReadWriteRaceStrategy).toBeDefined();
      expect(typeof ReadWriteRaceStrategy).toBe('function');
    });

    it('should export WriteWriteRaceStrategy', async () => {
      const { WriteWriteRaceStrategy } = await import('#layer-a/race-detector/strategies/index.js');
      expect(WriteWriteRaceStrategy).toBeDefined();
      expect(typeof WriteWriteRaceStrategy).toBe('function');
    });

    it('should export InitErrorStrategy', async () => {
      const { InitErrorStrategy } = await import('#layer-a/race-detector/strategies/index.js');
      expect(InitErrorStrategy).toBeDefined();
      expect(typeof InitErrorStrategy).toBe('function');
    });
  });

  describe('Strategy Inheritance', () => {
    it('all strategies should extend RaceDetectionStrategy', async () => {
      const { 
        RaceDetectionStrategy, 
        ReadWriteRaceStrategy, 
        WriteWriteRaceStrategy, 
        InitErrorStrategy 
      } = await import('#layer-a/race-detector/strategies/index.js');
      
      const rwStrategy = new ReadWriteRaceStrategy();
      const wwStrategy = new WriteWriteRaceStrategy();
      const ieStrategy = new InitErrorStrategy();
      
      expect(rwStrategy).toBeInstanceOf(RaceDetectionStrategy);
      expect(wwStrategy).toBeInstanceOf(RaceDetectionStrategy);
      expect(ieStrategy).toBeInstanceOf(RaceDetectionStrategy);
    });

    it('all strategies should implement getRaceType', async () => {
      const { ReadWriteRaceStrategy, WriteWriteRaceStrategy, InitErrorStrategy } = 
        await import('#layer-a/race-detector/strategies/index.js');
      
      expect(new ReadWriteRaceStrategy().getRaceType()).toBe('RW');
      expect(new WriteWriteRaceStrategy().getRaceType()).toBe('WW');
      expect(new InitErrorStrategy().getRaceType()).toBe('IE');
    });

    it('all strategies should implement detect method', async () => {
      const { ReadWriteRaceStrategy, WriteWriteRaceStrategy, InitErrorStrategy } = 
        await import('#layer-a/race-detector/strategies/index.js');
      
      expect(typeof new ReadWriteRaceStrategy().detect).toBe('function');
      expect(typeof new WriteWriteRaceStrategy().detect).toBe('function');
      expect(typeof new InitErrorStrategy().detect).toBe('function');
    });
  });
});
