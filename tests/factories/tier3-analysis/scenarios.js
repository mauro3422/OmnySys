/**
 * @fileoverview Tier3 Analysis Factory - Scenarios
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

export const RiskScenarios = {
  /**
   * Low risk file: simple, few imports, no side effects
   */
  lowRisk: () => ({
    fileAnalysis: FileAnalysisBuilder.create('utils/helpers.js')
      .withFunctions(2)
      .withImports(2)
      .withExports(1)
      .build(),
    semanticConnections: SemanticConnectionBuilder.create()
      .addConnection('./constants', 'import')
      .build(),
    sideEffects: { sideEffects: {} },
    graphMetrics: GraphMetricsBuilder.create().build()
  }),

  /**
   * Medium risk: moderate complexity, some side effects
   */
  mediumRisk: () => ({
    fileAnalysis: FileAnalysisBuilder.create('services/api.js')
      .withFunctions(12)
      .withImports(8)
      .withExports(3)
      .build(),
    semanticConnections: SemanticConnectionBuilder.create()
      .withHighConnectivity(5)
      .build(),
    sideEffects: SideEffectBuilder.create().withNetwork().withConsole().build(),
    graphMetrics: GraphMetricsBuilder.create().asHotspot('low').build()
  }),

  /**
   * High risk: high complexity, many connections, side effects
   */
  highRisk: () => ({
    fileAnalysis: FileAnalysisBuilder.create('core/manager.js')
      .withFunctions(25)
      .withImports(22)
      .withExports(8)
      .build(),
    semanticConnections: SemanticConnectionBuilder.create()
      .withHighConnectivity(15)
      .build(),
    sideEffects: SideEffectBuilder.create().withAll().build(),
    graphMetrics: GraphMetricsBuilder.create().asHotspot('high').withCoupling(20, 15).build()
  }),

  /**
   * Critical risk: extreme metrics across all factors
   */
  criticalRisk: () => ({
    fileAnalysis: FileAnalysisBuilder.create('god-module.js')
      .withFunctions(50)
      .withImports(35)
      .withExports(20)
      .build(),
    semanticConnections: SemanticConnectionBuilder.create()
      .withHighConnectivity(25)
      .build(),
    sideEffects: SideEffectBuilder.create().withAll().build(),
    graphMetrics: GraphMetricsBuilder.create()
      .asHotspot('high')
      .withCoupling(50, 40)
      .withCentrality(0.95)
      .build()
  })
};

/**
 * Factory helper for creating complete test scenarios
 */

