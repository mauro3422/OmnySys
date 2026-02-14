/**
 * @fileoverview Race Detector Phases - Index
 * 
 * Pipeline phases for race condition detection.
 * Each phase is independent and composable.
 * 
 * @module race-detector/phases
 * @version 1.0.0
 */

// Phase functions
export { collectSharedState, CollectPhase } from './collect-phase.js';
export { detectRaces, DetectPhase } from './detect-phase.js';
export { enrichWithPatterns, EnrichPhase } from './enrich-phase.js';
export { checkMitigations, MitigationPhase } from './mitigation-phase.js';
export { calculateSeverities, SeverityPhase } from './severity-phase.js';
export { generateSummary, SummaryPhase } from './summary-phase.js';

// Phase registry for dynamic pipeline construction
export const PHASES = {
  COLLECT: 'collect',
  DETECT: 'detect',
  ENRICH: 'enrich',
  MITIGATION: 'mitigation',
  SEVERITY: 'severity',
  SUMMARY: 'summary'
};

// Default pipeline order
export const DEFAULT_PIPELINE_ORDER = [
  PHASES.COLLECT,
  PHASES.DETECT,
  PHASES.ENRICH,
  PHASES.MITIGATION,
  PHASES.SEVERITY,
  PHASES.SUMMARY
];
