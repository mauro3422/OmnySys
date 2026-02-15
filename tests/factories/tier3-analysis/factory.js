/**
 * @fileoverview Tier3 Analysis Factory - Main Factory
 */

import {
  CouplingMetricsBuilder,
  EventPatternBuilder,
  FileAnalysisBuilder,
  GraphMetricsBuilder,
  IssueBuilder,
  ReportDataBuilder,
  RiskScoreBuilder,
  SemanticConnectionBuilder,
  SharedStateBuilder,
  SideEffectBuilder,
  SideEffectsResultBuilder
} from './builders.js';
import { RiskScenarios } from './scenarios.js';

export class Tier3AnalysisFactory {
  /**
   * Create a complete system map for testing
   */
  static createSystemMap(files = {}) {
    return {
      files: Object.fromEntries(
        Object.entries(files).map(([path, builder]) => [
          path,
          builder instanceof FileAnalysisBuilder ? builder.build() : builder
        ])
      )
    };
  }

  /**
   * Create risk score inputs
   */
  static createRiskInputs(scenario = 'mediumRisk') {
    return RiskScenarios[scenario] ? RiskScenarios[scenario]() : RiskScenarios.mediumRisk();
  }

  /**
   * Create multiple files with varying risk levels
   */
  static createMixedRiskSystem() {
    return {
      'low.js': RiskScenarios.lowRisk(),
      'medium.js': RiskScenarios.mediumRisk(),
      'high.js': RiskScenarios.highRisk(),
      'critical.js': RiskScenarios.criticalRisk()
    };
  }
}


