/**
 * @fileoverview index.js
 *
 * Race Condition Detector - Entry Point
 * 
 * Detects race conditions using modular trackers and strategies.
 * Refactored to follow SRP, OCP, and Fractal Architecture A→B→C.
 *
 * ARCHITECTURE:
 *   Layer A: Atomic metadata (from molecular-extractor.js)
 *   Layer B: Pattern detection (trackers + strategies)
 *   Layer C: Race results exposed via MCP tools
 *
 * @module race-detector/index
 * @version 5.0.0
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
import { logger } from '../../utils/logger.js';

/**
 * Race Detection Pipeline
 * Orchestrates trackers and strategies to detect race conditions
 */
export class RaceDetectionPipeline {
  constructor(projectData) {
    this.project = projectData;
    this.sharedState = new Map();
    this.races = [];
    this.warnings = [];

    // Initialize trackers (Layer B - State Identification)
    this.trackers = [
      new GlobalVariableTracker(projectData),
      new ModuleStateTracker(projectData),
      new ExternalResourceTracker(projectData),
      new SingletonTracker(projectData),
      new ClosureTracker(projectData)
    ];

    // Initialize strategies (Layer B - Pattern Detection)
    this.strategies = [
      new ReadWriteRaceStrategy(),
      new WriteWriteRaceStrategy(),
      new InitErrorStrategy()
    ];

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

    // Phase 1: Collect shared state (Layer B)
    this.collectSharedState();
    logger.info(`Found ${this.sharedState.size} shared state items`);

    // Phase 2: Detect races using strategies (Layer B)
    this.detectRaces();
    logger.info(`Detected ${this.races.length} potential races`);

    // Phase 3: Enrich with patterns (Layer B)
    this.enrichWithPatterns();

    // Phase 4: Check mitigations (Layer B)
    this.checkMitigations();

    // Phase 5: Calculate severities (Layer B)
    this.calculateSeverities();

    // Phase 6: Generate summary (Layer C)
    const summary = this.generateSummary();

    logger.info(`Race detection complete: ${this.races.length} races found`);

    return {
      races: this.races,
      warnings: this.warnings,
      summary
    };
  }

  /**
   * Phase 1: Collect shared state from all trackers
   * @private
   */
  collectSharedState() {
    for (const tracker of this.trackers) {
      const trackedState = tracker.track();
      
      // Merge into shared state map
      for (const [key, accesses] of trackedState) {
        if (!this.sharedState.has(key)) {
          this.sharedState.set(key, []);
        }
        this.sharedState.get(key).push(...accesses);
      }
    }
  }

  /**
   * Phase 2: Detect races using strategies
   * @private
   */
  detectRaces() {
    for (const strategy of this.strategies) {
      const detected = strategy.detect(this.sharedState, this.project);
      this.races.push(...detected);
    }
  }

  /**
   * Phase 3: Enrich races with pattern information
   * @private
   */
  enrichWithPatterns() {
    for (const race of this.races) {
      const patterns = this.patternMatcher.detectPatterns(race);
      
      if (patterns.length > 0) {
        race.pattern = patterns[0].key;
        race.patternName = patterns[0].name;
        race.allPatterns = patterns.map(p => p.key);
      }
    }
  }

  /**
   * Phase 4: Check for existing mitigations
   * @private
   */
  checkMitigations() {
    for (const race of this.races) {
      const mitigation = this.findMitigation(race);
      
      if (mitigation) {
        race.hasMitigation = true;
        race.mitigationType = mitigation.type;
      }
    }

    // Filter out mitigated races (unless critical)
    this.races = this.races.filter(race => 
      !race.hasMitigation || race.severity === 'critical'
    );
  }

  /**
   * Phase 5: Calculate severity for each race
   * @private
   */
  calculateSeverities() {
    for (const race of this.races) {
      race.severity = this.riskScorer.calculate(race, this.project);
    }
  }

  /**
   * Phase 6: Generate detection summary
   * @private
   */
  generateSummary() {
    const byType = {};
    const bySeverity = {};

    for (const race of this.races) {
      byType[race.type] = (byType[race.type] || 0) + 1;
      bySeverity[race.severity] = (bySeverity[race.severity] || 0) + 1;
    }

    return {
      totalRaces: this.races.length,
      totalWarnings: this.warnings.length,
      byType,
      bySeverity,
      sharedStateItems: this.sharedState.size,
      trackersUsed: this.trackers.length,
      strategiesUsed: this.strategies.length,
      analyzedAt: new Date().toISOString()
    };
  }

  /**
   * Find mitigation for a race
   * @private
   */
  findMitigation(race) {
    const [access1, access2] = race.accesses;

    // Check for locks
    if (this.hasLockProtection(access1) || this.hasLockProtection(access2)) {
      return { type: 'lock' };
    }

    // Check for atomic operations
    if (this.isAtomicOperation(access1) && this.isAtomicOperation(access2)) {
      return { type: 'atomic' };
    }

    // Check for transactions
    if (this.isInTransaction(access1) && this.isInTransaction(access2)) {
      return { type: 'transaction' };
    }

    // Check for async queue
    if (this.hasAsyncQueue(access1) || this.hasAsyncQueue(access2)) {
      return { type: 'queue' };
    }

    return null;
  }

  // Mitigation detection helpers

  hasLockProtection(access) {
    const atom = this.findAtomById(access.atom);
    if (!atom?.code) return false;

    const lockPatterns = [
      /\b(mutex|lock|semaphore)\./i,
      /\bLock\s*\(/i,
      /\bacquire\s*\(/i,
      /\bwithLock\s*\(/i,
      /await\s+.*\.lock\(/i,
      /Atomics\./i,
      /navigator\.locks/i
    ];

    return lockPatterns.some(p => p.test(atom.code));
  }

  isAtomicOperation(access) {
    const atom = this.findAtomById(access.atom);
    if (!atom?.code) return false;

    const atomicPatterns = [
      /Atomics\.(add|sub|and|or|xor|exchange|compareExchange|load|store)\(/i,
      /atomic\w*\s*\(/i,
      /CAS\s*\(/i,
      /getAndSet\s*\(/i
    ];

    return atomicPatterns.some(p => p.test(atom.code));
  }

  isInTransaction(access) {
    const atom = this.findAtomById(access.atom);
    if (!atom?.code) return false;

    const transactionPatterns = [
      /\btransaction\s*\(/i,
      /beginTransaction/i,
      /startTransaction/i,
      /\.transaction\s*\(/i,
      /db\.transaction/i,
      /prisma\.(\$transaction|\$queryRaw)/i,
      /withTransaction\s*\(/i
    ];

    return transactionPatterns.some(p => p.test(atom.code));
  }

  hasAsyncQueue(access) {
    const atom = this.findAtomById(access.atom);
    if (!atom?.code) return false;

    const queuePatterns = [
      /(queue|Queue)\s*\(/i,
      /async\.queue/i,
      /p-queue/i,
      /bull|bullmq|bee-queue/i,
      /queue\.add\s*\(/i,
      /concurrent\s*:\s*\d+/i
    ];

    return queuePatterns.some(p => p.test(atom.code));
  }

  /**
   * Find atom by its ID
   * @private
   */
  findAtomById(atomId) {
    const [filePath, functionName] = atomId.split('::');
    
    for (const module of this.project.modules || []) {
      for (const molecule of module.files || []) {
        if (molecule.filePath?.endsWith(filePath)) {
          for (const atom of molecule.atoms || []) {
            if (atom.name === functionName || atom.id === atomId) {
              return atom;
            }
          }
        }
      }
    }
    
    return null;
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
 * @returns {Object} - Detection results
 */
export function detectRaceConditions(projectData) {
  const pipeline = new RaceDetectionPipeline(projectData);
  return pipeline.detect();
}

export default RaceDetectionPipeline;
