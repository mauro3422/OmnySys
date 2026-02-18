/**
 * @fileoverview Validation System Test Builders
 * 
 * Builders para testing del sistema de validacion
 * 
 * @module tests/factories/validation
 */

import { ValidationSeverity, ValidationType } from '../../../src/validation/core/results/constants.js';

export class ValidationResultBuilder {
  constructor() {
    this.result = {
      valid: true,
      type: ValidationType.SOURCE,
      layer: 'source',
      entity: null,
      field: null,
      message: '',
      severity: ValidationSeverity.INFO,
      expected: undefined,
      actual: undefined,
      details: {},
      timestamp: new Date().toISOString(),
      duration: 0,
      rule: null,
      fixable: false,
      fixApplied: false,
      fixedValue: undefined
    };
  }

  asValid() {
    this.result.valid = true;
    this.result.severity = ValidationSeverity.INFO;
    return this;
  }

  asInvalid() {
    this.result.valid = false;
    this.result.severity = ValidationSeverity.ERROR;
    return this;
  }

  asWarning() {
    this.result.valid = true;
    this.result.severity = ValidationSeverity.WARNING;
    return this;
  }

  asCritical() {
    this.result.valid = false;
    this.result.severity = ValidationSeverity.CRITICAL;
    return this;
  }

  withEntity(entityId) {
    this.result.entity = entityId;
    return this;
  }

  withField(field) {
    this.result.field = field;
    return this;
  }

  withMessage(message) {
    this.result.message = message;
    return this;
  }

  withExpected(value) {
    this.result.expected = value;
    return this;
  }

  withActual(value) {
    this.result.actual = value;
    return this;
  }

  withLayer(layer) {
    this.result.layer = layer;
    return this;
  }

  withRule(ruleId) {
    this.result.rule = ruleId;
    return this;
  }

  withDetails(details) {
    this.result.details = { ...this.result.details, ...details };
    return this;
  }

  asFixable() {
    this.result.fixable = true;
    return this;
  }

  asFixed(fixedValue) {
    this.result.fixApplied = true;
    this.result.fixedValue = fixedValue;
    this.result.valid = true;
    return this;
  }

  withDuration(ms) {
    this.result.duration = ms;
    return this;
  }

  build() {
    return { ...this.result };
  }

  static create() {
    return new ValidationResultBuilder();
  }
}

export class ValidationReportBuilder {
  constructor() {
    this.report = {
      projectPath: '',
      omnysysPath: '',
      startedAt: new Date().toISOString(),
      completedAt: null,
      results: [],
      invariantViolations: [],
      staleEntities: [],
      stats: { total: 0, passed: 0, warnings: 0, failed: 0, critical: 0, fixed: 0 },
      layers: {
        source: { results: [], stats: { passed: 0, failed: 0 } },
        derivation: { results: [], stats: { passed: 0, failed: 0 } },
        semantic: { results: [], stats: { passed: 0, failed: 0 } },
        crossMetadata: { results: [], stats: { passed: 0, failed: 0 } }
      },
      duration: 0
    };
  }

  withProjectPath(path) {
    this.report.projectPath = path;
    return this;
  }

  withOmnysysPath(path) {
    this.report.omnysysPath = path;
    return this;
  }

  withResult(result) {
    this.report.results.push(result);
    this.report.stats.total++;
    if (result.valid) {
      result.severity === ValidationSeverity.WARNING 
        ? this.report.stats.warnings++ 
        : this.report.stats.passed++;
    } else if (result.severity === ValidationSeverity.CRITICAL) {
      this.report.stats.critical++;
      this.report.invariantViolations.push(result);
    } else {
      this.report.stats.failed++;
    }
    if (result.fixApplied) this.report.stats.fixed++;
    return this;
  }

  withResults(results) {
    results.forEach(r => this.withResult(r));
    return this;
  }

  withStaleEntity(entityId, reason) {
    this.report.staleEntities.push({ entity: entityId, reason, timestamp: new Date().toISOString() });
    return this;
  }

  asCompleted() {
    this.report.completedAt = new Date().toISOString();
    this.report.duration = new Date(this.report.completedAt) - new Date(this.report.startedAt);
    return this;
  }

  build() {
    return { ...this.report };
  }

  static create() {
    return new ValidationReportBuilder();
  }
}

export class ValidationRuleBuilder {
  constructor() {
    this.rule = {
      id: 'test.rule',
      name: 'Test Rule',
      description: 'A test validation rule',
      layer: 'source',
      invariant: false,
      fixable: false,
      appliesTo: ['file'],
      requires: [],
      validate: async () => true
    };
  }

  withId(id) {
    this.rule.id = id;
    return this;
  }

  withName(name) {
    this.rule.name = name;
    return this;
  }

  withLayer(layer) {
    this.rule.layer = layer;
    return this;
  }

  asInvariant() {
    this.rule.invariant = true;
    return this;
  }

  asFixable() {
    this.rule.fixable = true;
    return this;
  }

  appliesTo(types) {
    this.rule.appliesTo = Array.isArray(types) ? types : [types];
    return this;
  }

  requires(fields) {
    this.rule.requires = Array.isArray(fields) ? fields : [fields];
    return this;
  }

  withValidateFn(fn) {
    this.rule.validate = fn;
    return this;
  }

  withFixFn(fn) {
    this.rule.fix = fn;
    this.rule.fixable = true;
    return this;
  }

  build() {
    return { ...this.rule };
  }

  static create() {
    return new ValidationRuleBuilder();
  }
}

export class FileEntityBuilder {
  constructor() {
    this.file = {
      id: 'src/test.js',
      type: 'file',
      path: 'src/test.js',
      exports: [],
      imports: [],
      usedBy: [],
      atoms: [],
      totalComplexity: 0,
      riskScore: 0
    };
  }

  withId(id) {
    this.file.id = id;
    return this;
  }

  withPath(path) {
    this.file.path = path;
    this.file.id = path;
    return this;
  }

  withExports(exports) {
    this.file.exports = exports.map(e => typeof e === 'string' ? { name: e, type: 'named' } : e);
    return this;
  }

  withImports(imports) {
    this.file.imports = imports.map(i => typeof i === 'string' ? { source: i } : i);
    return this;
  }

  withUsedBy(usedBy) {
    this.file.usedBy = Array.isArray(usedBy) ? usedBy : [usedBy];
    return this;
  }

  withAtoms(atoms) {
    this.file.atoms = Array.isArray(atoms) ? atoms : [atoms];
    return this;
  }

  withTotalComplexity(complexity) {
    this.file.totalComplexity = complexity;
    return this;
  }

  withRiskScore(score) {
    this.file.riskScore = score;
    return this;
  }

  withDefinitions(definitions) {
    this.file.definitions = definitions;
    return this;
  }

  build() {
    return { ...this.file };
  }

  static create() {
    return new FileEntityBuilder();
  }
}

export class AtomEntityBuilder {
  constructor() {
    this.atom = {
      id: 'src/test.js::myFunction',
      name: 'myFunction',
      type: 'atom',
      filePath: 'src/test.js',
      lineNumber: 1,
      complexity: 1,
      archetype: null
    };
  }

  withId(id) {
    this.atom.id = id;
    return this;
  }

  withName(name) {
    this.atom.name = name;
    return this;
  }

  withComplexity(complexity) {
    this.atom.complexity = complexity;
    return this;
  }

  withArchetype(archetype) {
    this.atom.archetype = typeof archetype === 'string' 
      ? { name: archetype, severity: 1 } 
      : archetype;
    return this;
  }

  withSeverity(severity) {
    if (!this.atom.archetype) {
      this.atom.archetype = { name: 'test', severity };
    } else {
      this.atom.archetype.severity = severity;
    }
    return this;
  }

  build() {
    return { ...this.atom };
  }

  static create() {
    return new AtomEntityBuilder();
  }
}

export class ValidationContextBuilder {
  constructor() {
    this.context = {
      projectPath: '/test/project',
      omnysysPath: '/test/project/.omnysysdata',
      files: new Map(),
      atoms: new Map(),
      molecules: new Map(),
      modules: new Map(),
      sourceCache: new Map(),
      index: {}
    };
  }

  withProjectPath(path) {
    this.context.projectPath = path;
    return this;
  }

  withOmnysysPath(path) {
    this.context.omnysysPath = path;
    return this;
  }

  withFile(file) {
    this.context.files.set(file.id || file.path, file);
    return this;
  }

  withAtom(atom) {
    this.context.atoms.set(atom.id, atom);
    return this;
  }

  withSourceCode(filePath, code) {
    this.context.sourceCache.set(filePath, code);
    return this;
  }

  withIndex(index) {
    this.context.index = index;
    return this;
  }

  build() {
    return { ...this.context };
  }

  static create() {
    return new ValidationContextBuilder();
  }
}

export class TempProjectBuilder {
  constructor() {
    this.files = new Map();
    this.omnysysData = new Map();
  }

  addSourceFile(relativePath, content) {
    this.files.set(relativePath, content);
    return this;
  }

  addOmnySysFile(relativePath, data) {
    this.omnysysData.set(relativePath, data);
    return this;
  }

  getFiles() {
    return this.files;
  }

  getOmnySysData() {
    return this.omnysysData;
  }

  static create() {
    return new TempProjectBuilder();
  }
}

export default {
  ValidationResultBuilder,
  ValidationReportBuilder,
  ValidationRuleBuilder,
  FileEntityBuilder,
  AtomEntityBuilder,
  ValidationContextBuilder,
  TempProjectBuilder
};
