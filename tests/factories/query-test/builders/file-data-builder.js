/**
 * @fileoverview File Data Builder
 * Builder for creating file analysis data structures
 */

export class FileDataBuilder {
  constructor(filePath = 'test.js') {
    this.filePath = filePath;
    this.data = {
      path: filePath,
      hash: `hash-${Date.now()}`,
      atoms: [],
      atomIds: [],
      imports: [],
      exports: [],
      usedBy: [],
      complexity: 0,
      lines: 0,
      metadata: {}
    };
  }

  static create(filePath) {
    return new FileDataBuilder(filePath);
  }

  withPath(path) {
    this.filePath = path;
    this.data.path = path;
    return this;
  }

  withHash(hash) {
    this.data.hash = hash;
    return this;
  }

  withAtom(atom) {
    const atomData = {
      id: atom.id || `${this.filePath}::${atom.name}`,
      name: atom.name,
      type: atom.type || 'function',
      line: atom.line || 1,
      column: atom.column || 0,
      isExported: atom.isExported || false,
      complexity: atom.complexity || 1,
      archetype: atom.archetype || null,
      ...atom
    };
    this.data.atoms.push(atomData);
    this.data.atomIds.push(atomData.id);
    return this;
  }

  withAtoms(atoms) {
    for (const atom of atoms) {
      this.withAtom(atom);
    }
    return this;
  }

  withImport(source, options = {}) {
    this.data.imports.push({
      source,
      line: options.line || 1,
      resolvedPath: options.resolvedPath || null,
      type: options.type || 'static',
      ...options
    });
    return this;
  }

  withImports(imports) {
    for (const imp of imports) {
      if (typeof imp === 'string') {
        this.withImport(imp);
      } else {
        this.withImport(imp.source, imp);
      }
    }
    return this;
  }

  withExport(name, options = {}) {
    this.data.exports.push({
      name,
      line: options.line || 1,
      type: options.type || 'named',
      ...options
    });
    return this;
  }

  withExports(exports) {
    for (const exp of exports) {
      if (typeof exp === 'string') {
        this.withExport(exp);
      } else {
        this.withExport(exp.name, exp);
      }
    }
    return this;
  }

  withUsedBy(files) {
    this.data.usedBy = Array.isArray(files) ? files : [files];
    return this;
  }

  withComplexity(complexity) {
    this.data.complexity = complexity;
    return this;
  }

  withLines(lines) {
    this.data.lines = lines;
    return this;
  }

  withMetadata(metadata) {
    this.data.metadata = { ...this.data.metadata, ...metadata };
    return this;
  }

  build() {
    return this.data;
  }
}
