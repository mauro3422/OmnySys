/**
 * @fileoverview Tests for race-detector/strategies/index.js - Meta-Factory Pattern
 * 
 * Barrel export for all race detection strategies
 * 
 * @module tests/unit/layer-a-analysis/race-detector/strategies/index
 */

import { createUtilityTestSuite } from '#test-factories/test-suite-generator';
import { 
  RaceDetectionStrategy, 
  ReadWriteRaceStrategy, 
  WriteWriteRaceStrategy, 
  InitErrorStrategy 
} from '#layer-a/race-detector/strategies/index.js';

createUtilityTestSuite({
  module: 'race-detector/strategies/index',
  exports: { 
    RaceDetectionStrategy, 
    ReadWriteRaceStrategy, 
    WriteWriteRaceStrategy, 
    InitErrorStrategy 
  },
  fn: null,
  expectedSafeResult: null,
  specificTests: [
    {
      name: 'exports RaceDetectionStrategy class',
      fn: () => {
        expect(RaceDetectionStrategy).toBeDefined();
        expect(typeof RaceDetectionStrategy).toBe('function');
      }
    },
    {
      name: 'exports ReadWriteRaceStrategy class',
      fn: () => {
        expect(ReadWriteRaceStrategy).toBeDefined();
        expect(typeof ReadWriteRaceStrategy).toBe('function');
      }
    },
    {
      name: 'exports WriteWriteRaceStrategy class',
      fn: () => {
        expect(WriteWriteRaceStrategy).toBeDefined();
        expect(typeof WriteWriteRaceStrategy).toBe('function');
      }
    },
    {
      name: 'exports InitErrorStrategy class',
      fn: () => {
        expect(InitErrorStrategy).toBeDefined();
        expect(typeof InitErrorStrategy).toBe('function');
      }
    },
    {
      name: 'all strategies extend RaceDetectionStrategy',
      fn: () => {
        const rwStrategy = new ReadWriteRaceStrategy({});
        const wwStrategy = new WriteWriteRaceStrategy({});
        const ieStrategy = new InitErrorStrategy({});
        
        expect(rwStrategy).toBeInstanceOf(RaceDetectionStrategy);
        expect(wwStrategy).toBeInstanceOf(RaceDetectionStrategy);
        expect(ieStrategy).toBeInstanceOf(RaceDetectionStrategy);
      }
    },
    {
      name: 'all strategies implement getRaceType',
      fn: () => {
        expect(new ReadWriteRaceStrategy({}).getRaceType()).toBe('RW');
        expect(new WriteWriteRaceStrategy({}).getRaceType()).toBe('WW');
        expect(new InitErrorStrategy({}).getRaceType()).toBe('IE');
      }
    },
    {
      name: 'all strategies implement detect method',
      fn: () => {
        expect(typeof new ReadWriteRaceStrategy({}).detect).toBe('function');
        expect(typeof new WriteWriteRaceStrategy({}).detect).toBe('function');
        expect(typeof new InitErrorStrategy({}).detect).toBe('function');
      }
    }
  ]
});
