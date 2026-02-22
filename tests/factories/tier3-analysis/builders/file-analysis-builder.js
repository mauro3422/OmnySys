/**
 * @fileoverview FileAnalysisBuilder - Builder for file analysis data
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
