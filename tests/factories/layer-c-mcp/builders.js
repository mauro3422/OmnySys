/**
 * @fileoverview Layer C MCP Tools Factory
 * 
 * Builders para testing de herramientas MCP
 * 
 * @module tests/factories/layer-c-mcp
 */

/**
 * Builder para respuestas de herramientas MCP
 */
export class MCPToolResponseBuilder {
  constructor() {
    this.response = {
      content: [],
      isError: false
    };
  }

  withContent(content) {
    this.response.content = Array.isArray(content) ? content : [content];
    return this;
  }

  withError(error) {
    this.response.isError = true;
    this.response.content = [{ type: 'text', text: error }];
    return this;
  }

  asSuccess() {
    this.response.isError = false;
    return this;
  }

  asError(message = 'Operation failed') {
    this.response.isError = true;
    this.response.content = [{ type: 'text', text: message }];
    return this;
  }

  withTextContent(text) {
    this.response.content = [{ type: 'text', text }];
    return this;
  }

  build() {
    return { ...this.response };
  }

  static create() {
    return new MCPToolResponseBuilder();
  }
}

/**
 * Builder para resultados de impact map
 */
export class ImpactMapBuilder {
  constructor() {
    this.result = {
      file: '',
      directlyAffects: [],
      transitiveAffects: [],
      semanticConnections: [],
      totalAffected: 0,
      riskLevel: 'low',
      subsystem: 'unknown',
      exports: []
    };
  }

  withFile(filePath) {
    this.result.file = filePath;
    return this;
  }

  withDependents(dependents) {
    this.result.directlyAffects = Array.isArray(dependents) ? dependents : [dependents];
    this.result.totalAffected = this.result.directlyAffects.length + this.result.transitiveAffects.length;
    return this;
  }

  withDependencies(dependencies) {
    this.result.transitiveAffects = Array.isArray(dependencies) ? dependencies : [dependencies];
    this.result.totalAffected = this.result.directlyAffects.length + this.result.transitiveAffects.length;
    return this;
  }

  withScore(severity) {
    this.result.riskLevel = severity;
    return this;
  }

  withExports(exports) {
    this.result.exports = Array.isArray(exports) ? exports : [exports];
    return this;
  }

  withSubsystem(subsystem) {
    this.result.subsystem = subsystem;
    return this;
  }

  build() {
    return { ...this.result };
  }

  static create() {
    return new ImpactMapBuilder();
  }
}

/**
 * Builder para evaluaciones de riesgo
 */
export class RiskAssessmentBuilder {
  constructor() {
    this.assessment = {
      summary: {
        totalFiles: 0,
        totalIssues: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0
      },
      topRiskFiles: [],
      recommendation: 'Risk levels acceptable'
    };
  }

  withLevel(level, count) {
    const levelMap = {
      critical: 'criticalCount',
      high: 'highCount',
      medium: 'mediumCount',
      low: 'lowCount'
    };
    if (levelMap[level]) {
      this.assessment.summary[levelMap[level]] = count;
      this.assessment.summary.totalIssues = 
        this.assessment.summary.criticalCount +
        this.assessment.summary.highCount +
        this.assessment.summary.mediumCount +
        this.assessment.summary.lowCount;
    }
    return this;
  }

  withIssues(issues) {
    this.assessment.topRiskFiles = Array.isArray(issues) ? issues : [issues];
    return this;
  }

  withRecommendations(recommendation) {
    this.assessment.recommendation = recommendation;
    return this;
  }

  withTotalFiles(count) {
    this.assessment.summary.totalFiles = count;
    return this;
  }

  asLowRisk() {
    this.assessment.summary.criticalCount = 0;
    this.assessment.summary.highCount = 0;
    this.assessment.summary.mediumCount = 2;
    this.assessment.summary.lowCount = 5;
    this.assessment.summary.totalIssues = 7;
    this.assessment.recommendation = 'Risk levels acceptable';
    return this;
  }

  asHighRisk() {
    this.assessment.summary.criticalCount = 3;
    this.assessment.summary.highCount = 8;
    this.assessment.summary.mediumCount = 15;
    this.assessment.summary.lowCount = 20;
    this.assessment.summary.totalIssues = 46;
    this.assessment.recommendation = 'Critical issues detected - Review high-risk files';
    return this;
  }

  build() {
    return { ...this.assessment };
  }

  static create() {
    return new RiskAssessmentBuilder();
  }
}

/**
 * Builder para resultados de call graph
 */
export class CallGraphBuilder {
  constructor() {
    this.result = {
      symbol: '',
      definedIn: '',
      exportType: 'named',
      summary: {
        totalCallSites: 0,
        uniqueFiles: 0,
        isWidelyUsed: false,
        isIsolated: true
      },
      callSites: [],
      byFile: {},
      impact: {
        level: 'none',
        description: 'Symbol is not used anywhere (orphan)'
      }
    };
  }

  withFunction(name) {
    this.result.symbol = name;
    return this;
  }

  withCallers(callers) {
    const callerArray = Array.isArray(callers) ? callers : [callers];
    this.result.callSites = callerArray.map(c => ({
      file: c.file || c,
      line: c.line || 1,
      column: c.column || 0,
      code: c.code || `${this.result.symbol}()`,
      type: c.type || 'call'
    }));
    this.result.summary.totalCallSites = this.result.callSites.length;
    this.result.summary.uniqueFiles = [...new Set(this.result.callSites.map(s => s.file))].length;
    this.result.summary.isWidelyUsed = this.result.summary.totalCallSites > 10;
    this.result.summary.isIsolated = this.result.summary.totalCallSites === 0;
    return this;
  }

  withCallees(callees) {
    this.result.byFile = {};
    const calleeArray = Array.isArray(callees) ? callees : [callees];
    for (const callee of calleeArray) {
      const file = callee.file || 'unknown.js';
      if (!this.result.byFile[file]) {
        this.result.byFile[file] = [];
      }
      this.result.byFile[file].push({
        line: callee.line || 1,
        column: callee.column || 0,
        code: callee.code || `${this.result.symbol}()`,
        type: callee.type || 'call'
      });
    }
    return this;
  }

  withContext(filePath) {
    this.result.definedIn = filePath;
    return this;
  }

  withExportType(type) {
    this.result.exportType = type;
    return this;
  }

  withImpact(level, description) {
    this.result.impact.level = level;
    this.result.impact.description = description;
    return this;
  }

  build() {
    return { ...this.result };
  }

  static create() {
    return new CallGraphBuilder();
  }
}

/**
 * Builder para resultados de atomic edit
 */
export class AtomicEditResultBuilder {
  constructor() {
    this.result = {
      success: true,
      file: '',
      message: '',
      impact: {
        affectedFiles: 0,
        changedSymbols: [],
        severity: 'low'
      },
      validation: {
        syntaxValid: true,
        timestamp: Date.now()
      }
    };
  }

  withFile(filePath) {
    this.result.file = filePath;
    return this;
  }

  asValid() {
    this.result.success = true;
    this.result.validation.syntaxValid = true;
    this.result.message = 'Atomic edit successful';
    return this;
  }

  asInvalid(error = 'Syntax error') {
    this.result.success = false;
    this.result.validation.syntaxValid = false;
    this.result.error = 'SYNTAX_ERROR';
    this.result.message = error;
    this.result.severity = 'critical';
    return this;
  }

  withValidationErrors(errors) {
    this.result.validation.syntaxValid = false;
    this.result.validationErrors = Array.isArray(errors) ? errors : [errors];
    return this;
  }

  withVibration(affectedFiles, changedSymbols = [], severity = 'medium') {
    this.result.impact.affectedFiles = affectedFiles;
    this.result.impact.changedSymbols = changedSymbols;
    this.result.impact.severity = severity;
    return this;
  }

  withMessage(message) {
    this.result.message = message;
    return this;
  }

  build() {
    return { ...this.result };
  }

  static create() {
    return new AtomicEditResultBuilder();
  }
}

/**
 * Exportación default
 */
export default {
  MCPToolResponseBuilder,
  ImpactMapBuilder,
  RiskAssessmentBuilder,
  CallGraphBuilder,
  AtomicEditResultBuilder
};
