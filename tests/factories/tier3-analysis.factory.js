/**
 * @fileoverview Tier3 Analysis Factory (Modular Entry)
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
} from './tier3-analysis/builders.js';

export { RiskScenarios } from './tier3-analysis/scenarios.js';
export { Tier3AnalysisFactory } from './tier3-analysis/factory.js';

import { Tier3AnalysisFactory } from './tier3-analysis/factory.js';
export default Tier3AnalysisFactory;
