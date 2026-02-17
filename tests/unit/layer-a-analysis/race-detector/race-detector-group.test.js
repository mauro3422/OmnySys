/**
 * @fileoverview Race Detector System - Meta-Factory Test Suite
 * 
 * Agrupa TODOS los módulos de race detection:
 * - Scorers (RiskScorer, TypeScorer, AsyncScorer, etc.)
 * - Strategies (RaceDetectionStrategy, ReadWriteRaceStrategy, etc.)
 * - Phases (Collect, Detect, Enrich, Mitigation, Severity, Summary)
 * - Trackers (SharedState, GlobalVariable, ModuleState)
 * - Mitigation (Checkers for locks, immutable, atomic, flow, queue, transaction)
 * - Integration
 * 
 * @module tests/unit/layer-a-analysis/race-detector/race-detector-group
 */

import { describe, it, expect } from 'vitest';
import * as raceDetector from '#layer-a/race-detector/index.js';
import * as scorers from '#layer-a/race-detector/scorers/index.js';
import * as strategies from '#layer-a/race-detector/strategies/index.js';
import * as phases from '#layer-a/race-detector/phases/index.js';
import * as trackers from '#layer-a/race-detector/trackers/index.js';
import * as mitigation from '#layer-a/race-detector/mitigation/index.js';
import * as utils from '#layer-a/race-detector/utils/index.js';
import * as integration from '#layer-a/race-detector/integration.js';

describe('Race Detector - Main Exports', () => {
  it('exports all scorer classes', () => {
    expect(typeof raceDetector.RiskScorer).toBe('function');
    expect(typeof raceDetector.TypeScorer).toBe('function');
    expect(typeof raceDetector.AsyncScorer).toBe('function');
    expect(typeof raceDetector.DataIntegrityScorer).toBe('function');
    expect(typeof raceDetector.ScopeScorer).toBe('function');
    expect(typeof raceDetector.ImpactScorer).toBe('function');
    expect(typeof raceDetector.FrequencyScorer).toBe('function');
    expect(typeof raceDetector.TestingAdvisor).toBe('function');
  });

  it('exports ScoreWeights class', () => {
    expect(typeof raceDetector.ScoreWeights).toBe('function');
  });

  it('exports default RiskScorer', () => {
    expect(typeof raceDetector.default).toBe('function');
    expect(raceDetector.default).toBe(raceDetector.RiskScorer);
  });
});

describe('Race Detector - Scorers', () => {
  it('all scorer classes are constructors', () => {
    expect(typeof scorers.RiskScorer).toBe('function');
    expect(typeof scorers.TypeScorer).toBe('function');
    expect(typeof scorers.AsyncScorer).toBe('function');
    expect(typeof scorers.DataIntegrityScorer).toBe('function');
    expect(typeof scorers.ScopeScorer).toBe('function');
    expect(typeof scorers.ImpactScorer).toBe('function');
    expect(typeof scorers.FrequencyScorer).toBe('function');
    expect(typeof scorers.TestingAdvisor).toBe('function');
  });
});

describe('Race Detector - Strategies', () => {
  it('exports all race detection strategies', () => {
    expect(typeof strategies.RaceDetectionStrategy).toBe('function');
    expect(typeof strategies.ReadWriteRaceStrategy).toBe('function');
    expect(typeof strategies.WriteWriteRaceStrategy).toBe('function');
    expect(typeof strategies.InitErrorStrategy).toBe('function');
  });
});

describe('Race Detector - Phases', () => {
  it('exports all pipeline phases', () => {
    expect(typeof phases.collectSharedState).toBe('function');
    expect(typeof phases.CollectPhase).toBe('function');
    expect(typeof phases.detectRaces).toBe('function');
    expect(typeof phases.DetectPhase).toBe('function');
    expect(typeof phases.enrichWithPatterns).toBe('function');
    expect(typeof phases.EnrichPhase).toBe('function');
    expect(typeof phases.checkMitigations).toBe('function');
    expect(typeof phases.MitigationPhase).toBe('function');
    expect(typeof phases.calculateSeverities).toBe('function');
    expect(typeof phases.SeverityPhase).toBe('function');
    expect(typeof phases.generateSummary).toBe('function');
    expect(typeof phases.SummaryPhase).toBe('function');
  });

  it('exports PHASES constants', () => {
    expect(typeof phases.PHASES).toBe('object');
    expect(phases.PHASES.COLLECT).toBe('collect');
    expect(phases.PHASES.DETECT).toBe('detect');
    expect(phases.PHASES.ENRICH).toBe('enrich');
    expect(phases.PHASES.MITIGATION).toBe('mitigation');
    expect(phases.PHASES.SEVERITY).toBe('severity');
    expect(phases.PHASES.SUMMARY).toBe('summary');
  });

  it('exports DEFAULT_PIPELINE_ORDER array', () => {
    expect(Array.isArray(phases.DEFAULT_PIPELINE_ORDER)).toBe(true);
    expect(phases.DEFAULT_PIPELINE_ORDER.length).toBe(6);
  });
});

describe('Race Detector - Trackers', () => {
  it('exports all tracker classes', () => {
    expect(typeof trackers.GlobalVariableTracker).toBe('function');
    expect(typeof trackers.ModuleStateTracker).toBe('function');
    expect(typeof trackers.BaseTracker).toBe('function');
    expect(typeof trackers.ClosureTracker).toBe('function');
    expect(typeof trackers.SingletonTracker).toBe('function');
    expect(typeof trackers.ExternalResourceTracker).toBe('function');
  });
});

describe('Race Detector - Mitigation', () => {
  it('exports MitigationChecker class', () => {
    expect(typeof mitigation.MitigationChecker).toBe('function');
  });

  it('exports lock checker functions', () => {
    expect(typeof mitigation.hasLockProtection).toBe('function');
    expect(typeof mitigation.getLockDetails).toBe('function');
  });

  it('exports atomic checker functions', () => {
    expect(typeof mitigation.isAtomicOperation).toBe('function');
    expect(typeof mitigation.getAtomicDetails).toBe('function');
  });

  it('exports transaction checker functions', () => {
    expect(typeof mitigation.isInTransaction).toBe('function');
    expect(typeof mitigation.sameTransaction).toBe('function');
    expect(typeof mitigation.findTransactionContext).toBe('function');
  });

  it('exports queue checker functions', () => {
    expect(typeof mitigation.hasAsyncQueue).toBe('function');
    expect(typeof mitigation.sameQueue).toBe('function');
    expect(typeof mitigation.getQueueDetails).toBe('function');
  });

  it('exports immutable checker functions', () => {
    expect(typeof mitigation.usesImmutableData).toBe('function');
    expect(typeof mitigation.getImmutableDetails).toBe('function');
  });

  it('exports flow checker functions', () => {
    expect(typeof mitigation.sameBusinessFlow).toBe('function');
    expect(typeof mitigation.analyzeBusinessFlow).toBe('function');
  });
});

describe('Race Detector - Utils', () => {
  it('exports all utility functions', () => {
    expect(typeof utils.findAtomById).toBe('function');
    expect(typeof utils.extractQueueName).toBe('function');
    expect(typeof utils.isSharedStateVariable).toBe('function');
    expect(typeof utils.isJavaScriptKeyword).toBe('function');
  });
});

describe('Race Detector - Integration', () => {
  it('exports integration function', () => {
    expect(typeof integration.analyzeProjectRaces).toBe('function');
  });
});
