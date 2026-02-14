/**
 * @fileoverview Tier 3 Analysis Factory
 * 
 * Factory for creating mock data and scenarios for Tier 3 analysis testing.
 * Follows the same pattern as AnalysisFactory.
 * 
 * @module tests/factories/tier3-analysis.factory
 */

/**
 * Builder for creating file analysis mock data
 */
export class FileAnalysisBuilder {
  constructor(path = 'test.js') {
    this.path = path;
    this.functions = [];
    this.imports = [];
    this.exports = [];
    this.complexity = 0;
    this.lines = 0;
  }

  withFunctions(count, options = {}) {
    const { complexity = 1, exported = false, async = false } = options;
    for (let i = 0; i < count; i++) {
      this.functions.push({
        name: `func${i}`,
        complexity,
        isExported: exported,
        isAsync: async,
        line: 10 + i * 5
      });
    }
    return this;
  }

  withImports(count, options = {}) {
    const { external = false, types = [] } = options;
    for (let i = 0; i < count; i++) {
      this.imports.push({
        source: external ? `external-lib-${i}` : `./local-${i}`,
        type: types[i] || 'default',
        items: [`item${i}`]
      });
    }
    return this;
  }

  withExports(count, options = {}) {
    const { type = 'named' } = options;
    for (let i = 0; i < count; i++) {
      this.exports.push({
        name: `export${i}`,
        type
      });
    }
    return this;
  }

  withComplexity(score) {
    this.complexity = score;
    return this;
  }

  withLines(count) {
    this.lines = count;
    return this;
  }

  build() {
    return {
      path: this.path,
      functions: this.functions,
      imports: this.imports,
      exports: this.exports,
      complexity: this.complexity,
      lines: this.lines
    };
  }

  static create(path) {
    return new FileAnalysisBuilder(path);
  }
}

/**
 * Builder for semantic connections
 */
export class SemanticConnectionBuilder {
  constructor() {
    this.connections = [];
  }

  addConnection(target, type = 'import', strength = 1) {
    this.connections.push({ target, type, strength });
    return this;
  }

  withHighConnectivity(count) {
    for (let i = 0; i < count; i++) {
      this.addConnection(`module${i}`, 'import', 2);
    }
    return this;
  }

  withBidirectionalConnections(pairs) {
    pairs.forEach(([a, b]) => {
      this.addConnection(a, 'export', 2);
      this.addConnection(b, 'import', 2);
    });
    return this;
  }

  build() {
    return this.connections;
  }

  static create() {
    return new SemanticConnectionBuilder();
  }
}

/**
 * Builder for side effects
 */
export class SideEffectBuilder {
  constructor() {
    this.effects = {
      network: false,
      storage: false,
      dom: false,
      global: false,
      console: false,
      file: false,
      externalCalls: []
    };
  }

  withNetwork() {
    this.effects.network = true;
    this.effects.externalCalls.push('fetch', 'axios');
    return this;
  }

  withStorage() {
    this.effects.storage = true;
    this.effects.externalCalls.push('localStorage', 'sessionStorage');
    return this;
  }

  withDOM() {
    this.effects.dom = true;
    this.effects.externalCalls.push('document.querySelector', 'document.createElement');
    return this;
  }

  withGlobal() {
    this.effects.global = true;
    return this;
  }

  withConsole() {
    this.effects.console = true;
    return this;
  }

  withFile() {
    this.effects.file = true;
    this.effects.externalCalls.push('fs.readFile', 'fs.writeFile');
    return this;
  }

  withAll() {
    return this.withNetwork().withStorage().withDOM().withGlobal().withConsole().withFile();
  }

  build() {
    return {
      sideEffects: this.effects,
      hasSideEffects: Object.values(this.effects).some(v => v === true)
    };
  }

  static create() {
    return new SideEffectBuilder();
  }
}

/**
 * Builder for graph metrics
 */
export class GraphMetricsBuilder {
  constructor() {
    this.metrics = {
      centrality: 0,
      fanIn: 0,
      fanOut: 0,
      pageRank: 0,
      betweenness: 0
    };
  }

  asHotspot(level = 'medium') {
    const levels = {
      low: { centrality: 0.3, fanIn: 5, fanOut: 3, pageRank: 0.02 },
      medium: { centrality: 0.6, fanIn: 15, fanOut: 8, pageRank: 0.05 },
      high: { centrality: 0.9, fanIn: 30, fanOut: 20, pageRank: 0.15 }
    };
    this.metrics = { ...this.metrics, ...levels[level] };
    return this;
  }

  withCoupling(afferent = 0, efferent = 0) {
    this.metrics.fanIn = afferent;
    this.metrics.fanOut = efferent;
    this.metrics.instability = efferent / (afferent + efferent || 1);
    return this;
  }

  withCentrality(score) {
    this.metrics.centrality = score;
    return this;
  }

  build() {
    return this.metrics;
  }

  static create() {
    return new GraphMetricsBuilder();
  }
}

/**
 * Predefined scenarios for common test cases
 */
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

export default Tier3AnalysisFactory;
