/**
 * @fileoverview File Processing Builder - For file processing scenarios
 */

export class FileProcessingBuilder {
  constructor() {
    this.filePath = 'src/utils/helper.js';
    this.fileName = 'helper.js';
    this.content = '';
    this.parsedResult = null;
    this.imports = [];
    this.exports = [];
    this.definitions = [];
    this.metadata = {};
    this.atoms = [];
  }

  withFilePath(path) {
    this.filePath = path;
    this.fileName = path.split('/').pop();
    return this;
  }

  withContent(content) {
    this.content = content;
    return this;
  }

  withJavaScriptFunction(name, params = [], body = '// implementation') {
    this.content = `
      export function ${name}(${params.join(', ')}) {
        ${body}
      }
    `;
    this.definitions.push({
      type: 'function',
      name,
      params,
      exported: true
    });
    return this;
  }

  withClass(name, methods = []) {
    this.content = `
      export class ${name} {
        ${methods.map(m => `
          ${m.name}(${m.params?.join(', ') || ''}) {
            ${m.body || '// method body'}
          }
        `).join('\n')}
      }
    `;
    this.definitions.push({
      type: 'class',
      name,
      methods: methods.length
    });
    return this;
  }

  withImport(source, specifiers = [], type = 'local') {
    this.imports.push({
      source,
      specifiers,
      type
    });
    return this;
  }

  withExport(name, type = 'function') {
    this.exports.push({
      name,
      type
    });
    return this;
  }

  withParsedResult(overrides = {}) {
    this.parsedResult = {
      filePath: this.filePath,
      imports: this.imports,
      exports: this.exports,
      definitions: this.definitions,
      source: this.content,
      ...overrides
    };
    return this;
  }

  withAtom(atom = {}) {
    this.atoms.push({
      id: `atom-${this.atoms.length}`,
      name: `function${this.atoms.length}`,
      type: 'function',
      filePath: this.filePath,
      startLine: 1,
      endLine: 10,
      complexity: 1,
      linesOfCode: 10,
      isExported: true,
      ...atom
    });
    return this;
  }

  withMetadata(metadata = {}) {
    this.metadata = {
      jsdoc: { all: [] },
      async: { all: [] },
      errors: { all: [] },
      build: { envVars: [] },
      ...metadata
    };
    return this;
  }

  build() {
    return {
      filePath: this.filePath,
      fileName: this.fileName,
      ext: `.${this.fileName.split('.').pop()}`,
      content: this.content,
      parsed: this.parsedResult || {
        filePath: this.filePath,
        imports: this.imports,
        exports: this.exports,
        definitions: this.definitions,
        source: this.content
      },
      imports: this.imports,
      exports: this.exports,
      definitions: this.definitions,
      metadata: this.metadata,
      atoms: this.atoms,
      totalAtoms: this.atoms.length,
      atomsByType: this.atoms.reduce((acc, atom) => {
        acc[atom.type] = (acc[atom.type] || 0) + 1;
        return acc;
      }, {}),
      analyzedAt: new Date().toISOString()
    };
  }

  buildAnalysisResult(overrides = {}) {
    const base = this.build();
    return {
      filePath: base.filePath,
      fileName: base.fileName,
      ext: base.ext,
      imports: base.imports.map(imp => ({
        source: imp.source,
        resolvedPath: imp.source,
        type: imp.type,
        specifiers: imp.specifiers || []
      })),
      exports: base.exports,
      definitions: base.definitions,
      semanticConnections: [],
      metadata: base.metadata,
      atoms: base.atoms,
      totalAtoms: base.totalAtoms,
      atomsByType: base.atomsByType,
      analyzedAt: base.analyzedAt,
      ...overrides
    };
  }
}
