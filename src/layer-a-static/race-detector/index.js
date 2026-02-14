/**
 * @fileoverview Race Condition Detector - Entry Point
 * 
 * Detects race conditions using modular phases and strategies.
 * Refactored to follow SOLID, SRP, and Fractal Architecture A→B→C.
 * 
 * ARCHITECTURE:
 *   Layer A: Atomic metadata (from molecular-extractor.js)
 *   Layer B: Pattern detection (trackers + strategies + phases)
 *   Layer C: Race results exposed via MCP tools
 * 
 * @module race-detector/index
 * @version 6.0.0
 * @phase 4
 */

import { 
  GlobalVariableTracker,
  ModuleStateTracker,
  ExternalResourceTracker,
  SingletonTracker,
  ClosureTracker
} from './trackers/index.js';

import {
  ReadWriteRaceStrategy,
  WriteWriteRaceStrategy,
  InitErrorStrategy
} from './strategies/index.js';

import { RacePatternMatcher } from './race-pattern-matcher.js';
import { RiskScorer } from './risk-scorer.js';
import { createLogger } from '#utils/logger.js';

// Pipeline phases
import {
  CollectPhase,
  DetectPhase,
  EnrichPhase,
  MitigationPhase,
  SeverityPhase,
  SummaryPhase
} from './phases/index.js';

const logger = createLogger('race-detector');

/**
 * Configuration for the race detection pipeline
 * Extensible configuration object for future enhancements
 */
export const DEFAULT_CONFIG = {
  trackers: [
    GlobalVariableTracker,
    ModuleStateTracker,
    ExternalResourceTracker,
    SingletonTracker,
    ClosureTracker
  ],
  strategies: [
    ReadWriteRaceStrategy,
    WriteWriteRaceStrategy,
    InitErrorStrategy
  ],
  enableMitigationCheck: true,
  enablePatternEnrichment: true,
  filterMitigatedRaces: true,
  minSeverity: 'low' // 'low' | 'medium' | 'high' | 'critical'
};

/**
 * Race Detection Pipeline
 * Orchestrates phases to detect race conditions
 * 
 * @example
 * const pipeline = new RaceDetectionPipeline(projectData);
 * const results = pipeline.detect();
 * 
 * @example
 * const pipeline = new RaceDetectionPipeline(projectData, {
 *   enableMitigationCheck: false
 * });
 */
export class RaceDetectionPipeline {
  /**
   * @param {Object} projectData - Project data with modules/atoms
   * @param {Object} options - Configuration options
   */
  constructor(projectData, options = {}) {
    this.project = projectData;
    this.config = { ...DEFAULT_CONFIG, ...options };
    
    // State
    this.sharedState = new Map();
    this.races = [];
    this.warnings = [];
    
    // Initialize components
    this._initializeComponents();
    
    logger.debug('RaceDetectionPipeline initialized');
  }
  
  /**
   * Initialize pipeline components
   * @private
   */
  _initializeComponents() {
    // Initialize trackers
    this.trackers = this.config.trackers.map(Tracker => 
      new Tracker(this.project)
    );
    
    // Initialize strategies
    this.strategies = this.config.strategies.map(Strategy => 
      new Strategy()
    );
    
    // Supporting components
    this.patternMatcher = new RacePatternMatcher();
    this.riskScorer = new RiskScorer();
  }
  
  /**
   * Execute the complete race detection pipeline
   * @returns {Object} - Detection results
   */
  detect() {
    logger.info('Starting race condition detection pipeline...');
    
    // Phase 1: Collect shared state
    this._runCollectPhase();
    
    // Phase 2: Detect races
    this._runDetectPhase();
    
    // Phase 3: Enrich with patterns
    if (this.config.enablePatternEnrichment) {
      this._runEnrichPhase();
    }
    
    // Phase 4: Check mitigations
    if (this.config.enableMitigationCheck) {
      this._runMitigationPhase();
    }
    
    // Phase 5: Calculate severities
    this._runSeverityPhase();
    
    // Phase 6: Generate summary
    const summary = this._runSummaryPhase();
    
    logger.info(`Race detection complete: ${this.races.length} races found`);
    
    return {
      races: this.races,
      warnings: this.warnings,
      summary
    };
  }
  
  /**
   * Phase 1: Collect shared state
   * @private
   */
  _runCollectPhase() {
    const phase = new CollectPhase(this.trackers);
    this.sharedState = phase.execute();
    logger.info(`Found ${this.sharedState.size} shared state items`);
  }
  
  /**
   * Phase 2: Detect races
   * @private
   */
  _runDetectPhase() {
    const phase = new DetectPhase(this.strategies, this.sharedState, this.project);
    this.races = phase.execute();
    logger.info(`Detected ${this.races.length} potential races`);
  }
  
  /**
   * Phase 3: Enrich with patterns
   * @private
   */
  _runEnrichPhase() {
    const phase = new EnrichPhase(this.races, this.patternMatcher);
    this.races = phase.execute();
  }
  
  /**
   * Phase 4: Check mitigations
   * @private
   */
  _runMitigationPhase() {
    const phase = new MitigationPhase(this.races, this.project, this.warnings);
    this.races = phase.execute();
    logger.info(`After mitigation filter: ${this.races.length} races remain`);
  }
  
  /**
   * Phase 5: Calculate severities
   * @private
   */
  _runSeverityPhase() {
    const phase = new SeverityPhase(this.races, this.riskScorer, this.project);
    this.races = phase.execute();
  }
  
  /**
   * Phase 6: Generate summary
   * @private
   */
  _runSummaryPhase() {
    const phase = new SummaryPhase(this.races, this.warnings, this.sharedState, {
      trackers: this.trackers,
      strategies: this.strategies
    });
    return phase.execute();
  }
  
  /**
   * Get current detection state
   * @returns {Object} - Current state
   */
  getState() {
    return {
      sharedStateSize: this.sharedState.size,
      racesCount: this.races.length,
      warningsCount: this.warnings.length,
      trackersCount: this.trackers.length,
      strategiesCount: this.strategies.length
    };
  }
  
  /**
   * Add a custom tracker
   * @param {Class} TrackerClass - Tracker class
   */
  addTracker(TrackerClass) {
    this.trackers.push(new TrackerClass(this.project));
    logger.debug(`Added tracker: ${TrackerClass.name}`);
  }
  
  /**
   * Add a custom strategy
   * @param {Class} StrategyClass - Strategy class
   */
  addStrategy(StrategyClass) {
    this.strategies.push(new StrategyClass());
    logger.debug(`Added strategy: ${StrategyClass.name}`);
  }
}

/**
 * Legacy class name for backwards compatibility
 * @deprecated Use RaceDetectionPipeline instead
 */
export class RaceConditionDetector extends RaceDetectionPipeline {}

/**
 * Convenience function for quick detection
 * @param {Object} projectData - Project data with modules/atoms
 * @param {Object} options - Detection options
 * @returns {Object} - Detection results
 * 
 * @example
 * const results = detectRaceConditions(projectData);
 * 
 * @example
 * const results = detectRaceConditions(projectData, {
 *   enableMitigationCheck: false
 * });
 */
export function detectRaceConditions(projectData, options = {}) {
  const pipeline = new RaceDetectionPipeline(projectData, options);
  return pipeline.detect();
}

/**
 * Create a configured pipeline instance
 * @param {Object} projectData - Project data
 * @param {Object} config - Custom configuration
 * @returns {RaceDetectionPipeline} - Configured pipeline
 * 
 * @example
 * const pipeline = createPipeline(projectData, {
 *   minSeverity: 'high'
 * });
 */
export function createPipeline(projectData, config = {}) {
  return new RaceDetectionPipeline(projectData, config);
}

export default RaceDetectionPipeline;
