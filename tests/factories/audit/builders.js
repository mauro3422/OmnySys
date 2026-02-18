/**
 * @fileoverview Audit Module Builders
 * 
 * Builders for testing audit/ modules with REAL functionality.
 * NO MOCKS - uses real files and data structures.
 * 
 * @module tests/factories/audit/builders
 */

import fs from 'fs/promises';
import path from 'path';

export class AnalysisDataBuilder {
  constructor() {
    this.data = {
      id: 'src/utils/helper.js::processData',
      path: 'src/utils/helper.js',
      name: 'processData',
      content: 'export function processData(input) { return input; }',
      exports: [{ name: 'processData', type: 'named' }],
      imports: [],
      dependencies: [],
      dependents: []
    };
  }

  withId(id) {
    this.data.id = id;
    return this;
  }

  withPath(filePath) {
    this.data.path = filePath;
    return this;
  }

  withName(name) {
    this.data.name = name;
    return this;
  }

  withContent(content) {
    this.data.content = content;
    return this;
  }

  withExports(exports) {
    this.data.exports = exports;
    return this;
  }

  withImports(imports) {
    this.data.imports = imports;
    return this;
  }

  withDependencies(deps) {
    this.data.dependencies = deps;
    return this;
  }

  withDependents(deps) {
    this.data.dependents = deps;
    return this;
  }

  withMetadata(metadata) {
    this.data.metadata = metadata;
    return this;
  }

  withCompleteMetadata() {
    this.data.metadata = {
      exportCount: 1,
      dependentCount: 0,
      importCount: 0,
      functionCount: 1,
      hasJSDoc: false,
      hasAsync: false,
      hasErrors: false
    };
    return this;
  }

  withPartialMetadata(missingFields = []) {
    const full = {
      exportCount: 1,
      dependentCount: 0,
      importCount: 0,
      functionCount: 1,
      hasJSDoc: false,
      hasAsync: false,
      hasErrors: false
    };
    for (const field of missingFields) {
      delete full[field];
    }
    this.data.metadata = full;
    return this;
  }

  withAnalysis(analysis) {
    this.data.analysis = analysis;
    return this;
  }

  withCompleteAnalysis() {
    this.data.analysis = {
      confidence: 0.95,
      reasoning: 'Function is straightforward',
      analysisType: 'static'
    };
    return this;
  }

  withPartialAnalysis(missingFields = []) {
    const full = {
      confidence: 0.95,
      reasoning: 'Function is straightforward',
      analysisType: 'static'
    };
    for (const field of missingFields) {
      delete full[field];
    }
    this.data.analysis = full;
    return this;
  }

  withQuality(quality) {
    this.data.quality = quality;
    return this;
  }

  withCompleteQuality() {
    this.data.quality = {
      qualityScore: 95,
      issues: [],
      unusedExports: [],
      isDeadCode: false
    };
    return this;
  }

  withPartialQuality(missingFields = []) {
    const full = {
      qualityScore: 95,
      issues: [],
      unusedExports: [],
      isDeadCode: false
    };
    for (const field of missingFields) {
      delete full[field];
    }
    this.data.quality = full;
    return this;
  }

  withSemantic(semantic) {
    this.data.semantic = semantic;
    return this;
  }

  withCompleteSemantic() {
    this.data.semantic = {
      localStorageKeys: [],
      eventNames: [],
      sharedState: [],
      connections: []
    };
    return this;
  }

  withPartialSemantic(missingFields = []) {
    const full = {
      localStorageKeys: [],
      eventNames: [],
      sharedState: [],
      connections: []
    };
    for (const field of missingFields) {
      delete full[field];
    }
    this.data.semantic = full;
    return this;
  }

  missingField(field) {
    delete this.data[field];
    return this;
  }

  missingBasicFields(fields) {
    for (const field of fields) {
      delete this.data[field];
    }
    return this;
  }

  buildComplete() {
    return this.withCompleteMetadata()
      .withCompleteAnalysis()
      .withCompleteQuality()
      .withCompleteSemantic()
      .build();
  }

  buildMinimal() {
    return { ...this.data };
  }

  build() {
    return { ...this.data };
  }

  static create() {
    return new AnalysisDataBuilder();
  }
}

export class AuditProjectBuilder {
  constructor(tempDir) {
    this.tempDir = tempDir;
    this.omnysysPath = path.join(tempDir, '.omnysysdata');
    this.atoms = [];
    this.molecules = [];
  }

  addAtom(atomData, fileName = null) {
    const name = fileName || atomData.name || 'atom';
    this.atoms.push({ data: atomData, fileName: name });
    return this;
  }

  addMolecule(moleculeData, fileName = null) {
    const name = fileName || moleculeData.name || path.basename(moleculeData.path || 'molecule.json');
    this.molecules.push({ data: moleculeData, fileName: name });
    return this;
  }

  async write() {
    const atomsDir = path.join(this.omnysysPath, 'atoms');
    const moleculesDir = path.join(this.omnysysPath, 'molecules');

    await fs.mkdir(atomsDir, { recursive: true });
    await fs.mkdir(moleculesDir, { recursive: true });

    for (const atom of this.atoms) {
      const atomPath = path.join(atomsDir, `${atom.fileName}.json`);
      await fs.writeFile(atomPath, JSON.stringify(atom.data, null, 2), 'utf-8');
    }

    for (const molecule of this.molecules) {
      const molPath = path.join(moleculesDir, `${molecule.fileName}.json`);
      await fs.writeFile(molPath, JSON.stringify(molecule.data, null, 2), 'utf-8');
    }

    return this.omnysysPath;
  }

  static create(tempDir) {
    return new AuditProjectBuilder(tempDir);
  }
}

export class AuditTestFileBuilder {
  constructor(tempDir) {
    this.tempDir = tempDir;
    this.files = [];
  }

  addJsonFile(name, data) {
    this.files.push({ name, data, type: 'json' });
    return this;
  }

  addInvalidJsonFile(name, content) {
    this.files.push({ name, content, type: 'invalid' });
    return this;
  }

  async write() {
    const paths = [];
    for (const file of this.files) {
      const filePath = path.join(this.tempDir, file.name);
      const content = file.type === 'json' 
        ? JSON.stringify(file.data, null, 2) 
        : file.content;
      await fs.writeFile(filePath, content, 'utf-8');
      paths.push(filePath);
    }
    return paths;
  }

  static create(tempDir) {
    return new AuditTestFileBuilder(tempDir);
  }
}

export class FieldCheckResultBuilder {
  constructor() {
    this.result = {
      missingFields: [],
      presentFields: [],
      score: 0,
      maxScore: 0
    };
  }

  withPresentFields(fields) {
    this.result.presentFields = fields;
    this.result.score = fields.length;
    return this;
  }

  withMissingFields(fields) {
    this.result.missingFields = fields;
    return this;
  }

  withMaxScore(score) {
    this.result.maxScore = score;
    return this;
  }

  withScore(score) {
    this.result.score = score;
    return this;
  }

  complete() {
    this.result.missingFields = [];
    this.result.score = this.result.maxScore;
    return this;
  }

  build() {
    return { ...this.result };
  }

  static create() {
    return new FieldCheckResultBuilder();
  }
}

export default {
  AnalysisDataBuilder,
  AuditProjectBuilder,
  AuditTestFileBuilder,
  FieldCheckResultBuilder
};
