/**
 * @fileoverview Shared Module Builders
 * 
 * Builders for testing shared/ modules with REAL functionality.
 * NO MOCKS - uses real files and data structures.
 * 
 * @module tests/factories/shared/builders
 */

import fs from 'fs/promises';
import path from 'path';

export class AtomBuilder {
  constructor(id = 'src/utils/helper.js::processData') {
    const [filePath, name] = id.split('::');
    this.atom = {
      id,
      name: name || 'processData',
      type: 'atom',
      filePath: filePath || 'src/utils/helper.js',
      line: 1,
      complexity: 5,
      isExported: true,
      isAsync: false,
      isPure: true,
      calls: [],
      calledBy: [],
      hasNetworkCalls: false,
      hasDomManipulation: false,
      hasStorageAccess: false,
      hasSideEffects: false,
      parentMolecule: filePath || 'src/utils/helper.js',
      archetype: {
        type: 'standard',
        severity: 1,
        confidence: 1.0
      }
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

  withFilePath(filePath) {
    this.atom.filePath = filePath;
    this.atom.parentMolecule = filePath;
    return this;
  }

  withComplexity(complexity) {
    this.atom.complexity = complexity;
    return this;
  }

  asExported(isExported = true) {
    this.atom.isExported = isExported;
    return this;
  }

  asAsync(isAsync = true) {
    this.atom.isAsync = isAsync;
    return this;
  }

  withCalls(calls) {
    this.atom.calls = Array.isArray(calls) ? calls : [calls];
    return this;
  }

  withCalledBy(calledBy) {
    this.atom.calledBy = Array.isArray(calledBy) ? calledBy : [calledBy];
    return this;
  }

  withNetworkCalls(hasCalls = true) {
    this.atom.hasNetworkCalls = hasCalls;
    this.atom.hasSideEffects = hasCalls;
    return this;
  }

  withDomManipulation(hasDom = true) {
    this.atom.hasDomManipulation = hasDom;
    this.atom.hasSideEffects = hasDom;
    return this;
  }

  withStorageAccess(hasStorage = true) {
    this.atom.hasStorageAccess = hasStorage;
    this.atom.hasSideEffects = hasStorage;
    return this;
  }

  withArchetype(type, severity = 5, confidence = 1.0) {
    this.atom.archetype = { type, severity, confidence, source: 'test' };
    return this;
  }

  asGodFunction() {
    this.atom.archetype = { type: 'god-function', severity: 10, confidence: 0.9, source: 'test' };
    this.atom.complexity = 50;
    this.atom.calls = Array(20).fill(0).map((_, i) => `func${i}`);
    return this;
  }

  asFragileNetwork() {
    this.atom.archetype = { type: 'fragile-network', severity: 8, confidence: 0.95, source: 'test' };
    this.atom.hasNetworkCalls = true;
    this.atom.hasSideEffects = true;
    return this;
  }

  asHotPath() {
    this.atom.archetype = { type: 'hot-path', severity: 7, confidence: 0.9, source: 'test' };
    return this;
  }

  asValidator() {
    this.atom.archetype = { type: 'validator', severity: 4, confidence: 0.85, source: 'test' };
    return this;
  }

  withoutField(field) {
    delete this.atom[field];
    return this;
  }

  withInvalidType(field, value) {
    this.atom[field] = value;
    return this;
  }

  build() {
    return { ...this.atom };
  }

  static create(id) {
    return new AtomBuilder(id);
  }
}

export class MoleculeBuilder {
  constructor(filePath = 'src/components/TestComponent.js') {
    this.molecule = {
      id: filePath,
      type: 'molecule',
      filePath,
      exportCount: 2,
      dependentCount: 5,
      atoms: [],
      archetype: {
        type: 'standard',
        severity: 1
      },
      totalComplexity: 10,
      hasSideEffects: false,
      hasNetworkCalls: false,
      derivedAt: new Date().toISOString()
    };
  }

  withFilePath(filePath) {
    this.molecule.filePath = filePath;
    this.molecule.id = filePath;
    return this;
  }

  withAtoms(atoms) {
    this.molecule.atoms = Array.isArray(atoms) ? atoms : [atoms];
    this.molecule.totalComplexity = this.molecule.atoms.reduce((sum, a) => sum + (a.complexity || 0), 0);
    return this;
  }

  withExports(count) {
    this.molecule.exportCount = count;
    return this;
  }

  withDependents(count) {
    this.molecule.dependentCount = count;
    return this;
  }

  asNetworkHub() {
    this.molecule.archetype = { type: 'network-hub', severity: 8 };
    this.molecule.hasNetworkCalls = true;
    return this;
  }

  asGodObject() {
    this.molecule.archetype = { type: 'god-object', severity: 10 };
    this.molecule.exportCount = 15;
    this.molecule.dependentCount = 20;
    return this;
  }

  build() {
    return { ...this.molecule };
  }

  static create(filePath) {
    return new MoleculeBuilder(filePath);
  }
}

export class ProjectFileBuilder {
  constructor(tempDir) {
    this.tempDir = tempDir;
    this.files = [];
  }

  addPackageJson(name, dependencies = {}, devDependencies = {}) {
    const content = {
      name,
      version: '1.0.0',
      dependencies,
      devDependencies
    };
    this.files.push({
      path: 'package.json',
      content: JSON.stringify(content, null, 2)
    });
    return this;
  }

  addJsFile(relativePath, content) {
    this.files.push({
      path: relativePath,
      content: typeof content === 'object' ? JSON.stringify(content, null, 2) : content
    });
    return this;
  }

  addAtomFile(relativePath, atom) {
    const content = typeof atom === 'object' ? JSON.stringify(atom, null, 2) : atom;
    this.files.push({
      path: relativePath,
      content
    });
    return this;
  }

  async write() {
    for (const file of this.files) {
      const fullPath = path.join(this.tempDir, file.path);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, file.content, 'utf-8');
    }
    return this.files.map(f => path.join(this.tempDir, f.path));
  }

  static create(tempDir) {
    return new ProjectFileBuilder(tempDir);
  }
}

export class OmnySystemDataBuilder {
  constructor(tempDir) {
    this.tempDir = tempDir;
    this.omnysysPath = path.join(tempDir, '.omnysysdata');
    this.atoms = [];
    this.molecules = [];
  }

  addAtom(atom) {
    this.atoms.push(atom);
    return this;
  }

  addMolecule(molecule) {
    this.molecules.push(molecule);
    return this;
  }

  async write() {
    const atomsPath = path.join(this.omnysysPath, 'atoms');
    const moleculesPath = path.join(this.omnysysPath, 'molecules');

    for (const atom of this.atoms) {
      const filePath = atom.filePath || atom.parentMolecule || 'unknown.js';
      const fileDir = filePath.replace(/\//g, '_').replace(/\\/g, '_');
      const atomDir = path.join(atomsPath, fileDir);
      await fs.mkdir(atomDir, { recursive: true });
      
      const atomFileName = `${atom.name || 'unknown'}.json`;
      await fs.writeFile(
        path.join(atomDir, atomFileName),
        JSON.stringify(atom, null, 2),
        'utf-8'
      );
    }

    for (const molecule of this.molecules) {
      await fs.mkdir(moleculesPath, { recursive: true });
      const moleculeFileName = molecule.filePath.replace(/\//g, '_').replace(/\\/g, '_') + '.molecule.json';
      await fs.writeFile(
        path.join(moleculesPath, moleculeFileName),
        JSON.stringify(molecule, null, 2),
        'utf-8'
      );
    }

    return this.omnysysPath;
  }

  static create(tempDir) {
    return new OmnySystemDataBuilder(tempDir);
  }
}

export class ValidationResultBuilder {
  constructor() {
    this.result = {
      valid: true,
      errors: [],
      warnings: [],
      stats: {
        atomsChecked: 0,
        moleculesChecked: 0,
        filesChecked: 0,
        referencesChecked: 0
      }
    };
  }

  addError(message, context = {}) {
    this.result.valid = false;
    this.result.errors.push({ message, context, timestamp: new Date().toISOString() });
    return this;
  }

  addWarning(message, context = {}) {
    this.result.warnings.push({ message, context, timestamp: new Date().toISOString() });
    return this;
  }

  withStats(stats) {
    Object.assign(this.result.stats, stats);
    return this;
  }

  build() {
    return { ...this.result };
  }

  static create() {
    return new ValidationResultBuilder();
  }
}

export default {
  AtomBuilder,
  MoleculeBuilder,
  ProjectFileBuilder,
  OmnySystemDataBuilder,
  ValidationResultBuilder
};
