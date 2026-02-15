/**
 * @fileoverview Tier3 Analysis Factory - Builders
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
 * Builder for risk scores
 */
export class RiskScoreBuilder {
  constructor(filePath = 'test.js') {
    this.filePath = filePath;
    this.total = 0;
    this.severity = 'low';
    this.explanation = '';
    this.breakdown = {
      complexity: 0,
      semanticConnections: 0,
      sideEffects: 0,
      graphMetrics: 0
    };
  }

  withTotal(score) {
    this.total = score;
    return this;
  }

  withSeverity(severity) {
    this.severity = severity;
    return this;
  }

  withExplanation(explanation) {
    this.explanation = explanation;
    return this;
  }

  withBreakdown(breakdown) {
    this.breakdown = { ...this.breakdown, ...breakdown };
    return this;
  }

  asLowRisk() {
    this.total = 2;
    this.severity = 'low';
    this.explanation = '';
    return this;
  }

  asMediumRisk() {
    this.total = 5;
    this.severity = 'medium';
    this.explanation = 'Medium risk file';
    return this;
  }

  asHighRisk() {
    this.total = 8;
    this.severity = 'high';
    this.explanation = 'High risk file';
    return this;
  }

  asCriticalRisk() {
    this.total = 10;
    this.severity = 'critical';
    this.explanation = 'Critical risk file';
    return this;
  }

  build() {
    return {
      file: this.filePath,
      total: this.total,
      severity: this.severity,
      explanation: this.explanation,
      breakdown: this.breakdown
    };
  }

  static create(filePath) {
    return new RiskScoreBuilder(filePath);
  }
}

/**
 * Builder for report data
 */
export class ReportDataBuilder {
  constructor() {
    this.riskScores = {};
  }

  withRiskScore(filePath, score) {
    if (score instanceof RiskScoreBuilder) {
      this.riskScores[filePath] = score.build();
    } else {
      this.riskScores[filePath] = score;
    }
    return this;
  }

  withMultipleScores(count, severity = 'low') {
    for (let i = 0; i < count; i++) {
      const builder = RiskScoreBuilder.create(`file${i}.js`);
      switch (severity) {
        case 'critical':
          builder.asCriticalRisk();
          break;
        case 'high':
          builder.asHighRisk();
          break;
        case 'medium':
          builder.asMediumRisk();
          break;
        default:
          builder.asLowRisk();
      }
      this.riskScores[`file${i}.js`] = builder.build();
    }
    return this;
  }

  withMixedRiskScores() {
    this.riskScores['low.js'] = RiskScoreBuilder.create('low.js').asLowRisk().build();
    this.riskScores['medium.js'] = RiskScoreBuilder.create('medium.js').asMediumRisk().build();
    this.riskScores['high.js'] = RiskScoreBuilder.create('high.js').asHighRisk().build();
    this.riskScores['critical.js'] = RiskScoreBuilder.create('critical.js').asCriticalRisk().build();
    return this;
  }

  build() {
    return this.riskScores;
  }

  static create() {
    return new ReportDataBuilder();
  }
}

/**
 * Builder for event patterns
 */
export class EventPatternBuilder {
  constructor() {
    this.listeners = [];
    this.emitters = [];
  }

  addListener(eventName, options = {}) {
    const {
      pattern = 'on',
      objectName = 'eventBus',
      confidence = 1.0,
      filePath = 'test.js',
      line = 1,
      column = 1,
      functionContext = null
    } = options;

    this.listeners.push({
      eventName,
      pattern,
      objectName,
      confidence,
      filePath,
      line,
      column,
      functionContext
    });
    return this;
  }

  addEmitter(eventName, options = {}) {
    const {
      pattern = 'emit',
      objectName = 'eventBus',
      confidence = 1.0,
      filePath = 'test.js',
      line = 1,
      column = 1,
      functionContext = null
    } = options;

    this.emitters.push({
      eventName,
      pattern,
      objectName,
      confidence,
      filePath,
      line,
      column,
      functionContext
    });
    return this;
  }

  withStandardEvent(eventName, filePath = 'test.js') {
    this.addListener(eventName, { pattern: 'on', filePath });
    this.addEmitter(eventName, { pattern: 'emit', filePath });
    return this;
  }

  withMultipleEvents(count, prefix = 'event') {
    for (let i = 0; i < count; i++) {
      this.withStandardEvent(`${prefix}-${i}`);
    }
    return this;
  }

  build() {
    return {
      eventListeners: this.listeners,
      eventEmitters: this.emitters
    };
  }

  static create() {
    return new EventPatternBuilder();
  }
}

/**
 * Builder for shared state data
 */
export class SharedStateBuilder {
  constructor() {
    this.globalAccess = [];
    this.readProperties = [];
    this.writeProperties = [];
  }

  addRead(property, objectName = 'window', options = {}) {
    const { filePath = 'test.js', line = 1, column = 1, functionContext = null } = options;

    this.globalAccess.push({
      objectName,
      propName: property,
      type: 'read',
      fullReference: `${objectName}.${property}`,
      filePath,
      line,
      column,
      functionContext
    });
    this.readProperties.push(property);
    return this;
  }

  addWrite(property, objectName = 'window', options = {}) {
    const { filePath = 'test.js', line = 1, column = 1, functionContext = null } = options;

    this.globalAccess.push({
      objectName,
      propName: property,
      type: 'write',
      fullReference: `${objectName}.${property}`,
      filePath,
      line,
      column,
      functionContext
    });
    this.writeProperties.push(property);
    return this;
  }

  withMultipleReads(properties, objectName = 'window') {
    properties.forEach(prop => this.addRead(prop, objectName));
    return this;
  }

  withMultipleWrites(properties, objectName = 'window') {
    properties.forEach(prop => this.addWrite(prop, objectName));
    return this;
  }

  build() {
    const propertyAccessMap = {};
    
    [...this.readProperties, ...this.writeProperties].forEach(prop => {
      if (!propertyAccessMap[prop]) {
        propertyAccessMap[prop] = { reads: [], writes: [] };
      }
    });

    this.globalAccess.forEach(access => {
      if (access.type === 'read') {
        propertyAccessMap[access.propName].reads.push(access);
      } else {
        propertyAccessMap[access.propName].writes.push(access);
      }
    });

    return {
      globalAccess: this.globalAccess,
      readProperties: [...new Set(this.readProperties)],
      writeProperties: [...new Set(this.writeProperties)],
      propertyAccessMap
    };
  }

  static create() {
    return new SharedStateBuilder();
  }
}

/**
 * Builder for side effects detection results
 */
export class SideEffectsResultBuilder {
  constructor() {
    this.sideEffects = {
      hasGlobalAccess: false,
      modifiesDOM: false,
      makesNetworkCalls: false,
      usesLocalStorage: false,
      accessesWindow: false,
      modifiesGlobalState: false,
      hasEventListeners: false,
      usesTimers: false
    };
    this.details = {
      globalAccessLocations: [],
      domModificationLocations: [],
      networkCallLocations: [],
      storageAccessLocations: [],
      globalStateModificationLocations: [],
      eventListenerLocations: [],
      timerLocations: []
    };
    this.severity = 'low';
  }

  withGlobalAccess(object = 'window', property = 'test') {
    this.sideEffects.hasGlobalAccess = true;
    this.sideEffects.accessesWindow = object === 'window';
    this.details.globalAccessLocations.push({ object, property });
    return this;
  }

  withDOMModification(method = 'getElementById') {
    this.sideEffects.modifiesDOM = true;
    this.details.domModificationLocations.push({ method });
    return this;
  }

  withNetworkCall(api = 'fetch') {
    this.sideEffects.makesNetworkCalls = true;
    this.details.networkCallLocations.push({ api });
    return this;
  }

  withStorageAccess(storage = 'localStorage') {
    this.sideEffects.usesLocalStorage = true;
    this.details.storageAccessLocations.push({ storage });
    return this;
  }

  withGlobalStateModification(target = 'window.config') {
    this.sideEffects.modifiesGlobalState = true;
    this.details.globalStateModificationLocations.push({ target });
    return this;
  }

  withEventListener(method = 'addEventListener') {
    this.sideEffects.hasEventListeners = true;
    this.details.eventListenerLocations.push({ method });
    return this;
  }

  withTimer(timer = 'setTimeout') {
    this.sideEffects.usesTimers = true;
    this.details.timerLocations.push({ timer });
    return this;
  }

  withSeverity(severity) {
    this.severity = severity;
    return this;
  }

  build() {
    const count = Object.values(this.sideEffects).filter(v => v === true).length;
    return {
      sideEffects: this.sideEffects,
      details: this.details,
      severity: this.severity,
      count
    };
  }

  static create() {
    return new SideEffectsResultBuilder();
  }
}

/**
 * Builder for coupling metrics
 */
export class CouplingMetricsBuilder {
  constructor() {
    this.problematicCycles = 0;
    this.coupledFiles = 0;
  }

  withCircularDependencies(count) {
    this.problematicCycles = count;
    return this;
  }

  withCoupledFiles(count) {
    this.coupledFiles = count;
    return this;
  }

  build() {
    return {
      problematicCycles: this.problematicCycles,
      coupledFiles: this.coupledFiles
    };
  }

  static create() {
    return new CouplingMetricsBuilder();
  }
}

/**
 * Builder for issues
 */
export class IssueBuilder {
  constructor() {
    this.issues = [];
  }

  addIssue(options = {}) {
    const {
      sourceFile = 'test.js',
      file = null,
      message = 'Test issue',
      severity = 'MEDIUM',
      line = 1
    } = options;

    this.issues.push({
      sourceFile,
      file,
      message,
      severity,
      line
    });
    return this;
  }

  withMultipleIssues(count, options = {}) {
    for (let i = 0; i < count; i++) {
      this.addIssue({ ...options, message: `Issue ${i + 1}` });
    }
    return this;
  }

  withMixedSeverities() {
    this.addIssue({ severity: 'HIGH', message: 'High severity issue' });
    this.addIssue({ severity: 'MEDIUM', message: 'Medium severity issue' });
    this.addIssue({ severity: 'LOW', message: 'Low severity issue' });
    return this;
  }

  build() {
    return this.issues;
  }

  static create() {
    return new IssueBuilder();
  }
}

/**
 * Predefined scenarios for common test cases
 */

