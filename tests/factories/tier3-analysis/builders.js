/**
 * @fileoverview builders.js (Barrel Export - DEPRECATED)
 * 
 * This file re-exports from the new modular builders directory.
 * Please update your imports to use the new structure:
 * 
 * Before:
 *   import { FileAnalysisBuilder } from './builders.js';
 * 
 * After:
 *   import { FileAnalysisBuilder } from './builders/index.js';
 *   or
 *   import { FileAnalysisBuilder } from './builders/file-analysis-builder.js';
 * 
 * @deprecated Use ./builders/index.js or specific builder modules
 * @module tier3-analysis/builders-deprecated
 */

export {
  FileAnalysisBuilder,
  SemanticConnectionBuilder,
  SideEffectBuilder,
  GraphMetricsBuilder,
  RiskScoreBuilder,
  ReportDataBuilder,
  EventPatternBuilder,
  SharedStateBuilder,
  SideEffectsResultBuilder,
  CouplingMetricsBuilder,
  IssueBuilder
} from './builders/index.js';
