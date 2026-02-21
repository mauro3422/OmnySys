/**
 * @fileoverview builders.js (Barrel Export - DEPRECATED)
 * 
 * This file re-exports from the new modular builders directory.
 * Please update your imports to use the new structure.
 * 
 * @deprecated Use ./builders/index.js or specific builder modules
 * @module race-detector-test/builders-deprecated
 */

export {
  RaceScenarioBuilder,
  RacePatternFactory,
  RaceDetectorValidator,
  ProjectDataBuilder,
  RaceConditionBuilder,
  RaceStrategyBuilder,
  MitigationBuilder
} from './builders/index.js';
