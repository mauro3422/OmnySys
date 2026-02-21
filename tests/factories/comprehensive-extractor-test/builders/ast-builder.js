/**
 * @fileoverview AST Builder
 * 
 * Builder for AST structures and mock nodes.
 * 
 * @module tests/factories/comprehensive-extractor-test/builders/ast-builder
 */

export class ASTBuilder {
  constructor() {
    this.nodes = [];
  }

  withFunctionDeclaration(name, params = [], options = {}) {
    const { async = false, generator = false } = options;
    
    this.nodes.push({
      type: 'FunctionDeclaration',
      id: { name },
      async,
      generator,
      params: params.map(p => ({ name: p })),
      start: 0,
      end: 100
    });
    
    return this;
  }

  withArrowFunction(name, params = [], options = {}) {
    const { async = false } = options;
    
    this.nodes.push({
      type: 'ArrowFunctionExpression',
      id: { name },
      async,
      params: params.map(p => ({ name: p })),
      start: 0,
      end: 100
    });
    
    return this;
  }

  withClassDeclaration(name, options = {}) {
    const { superClass = null } = options;
    
    this.nodes.push({
      type: 'ClassDeclaration',
      id: { name },
      superClass: superClass ? { name: superClass } : null,
      start: 0,
      end: 100
    });
    
    return this;
  }

  withImportDeclaration(names, source, importType = 'named') {
    this.nodes.push({
      type: 'ImportDeclaration',
      source: { value: source },
      specifiers: names.map(name => ({
        type: importType === 'default' ? 'ImportDefaultSpecifier' : 'ImportSpecifier',
        local: { name }
      })),
      start: 0,
      end: 100
    });
    
    return this;
  }

  withExportDeclaration(name, exportType = 'named') {
    this.nodes.push({
      type: 'ExportNamedDeclaration',
      declaration: {
        type: 'VariableDeclaration',
        declarations: [{
          id: { name }
        }]
      },
      exportKind: exportType,
      start: 0,
      end: 100
    });
    
    return this;
  }

  build() {
    return {
      type: 'File',
      program: {
        type: 'Program',
        body: this.nodes,
        sourceType: 'module'
      }
    };
  }

  buildNode(type) {
    return this.nodes.find(n => n.type === type) || null;
  }
}

export default ASTBuilder;
