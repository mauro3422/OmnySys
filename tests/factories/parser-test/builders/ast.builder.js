/**
 * @fileoverview ast.builder.js
 * 
 * Builder for creating AST structures
 * 
 * @module tests/factories/parser-test/ast
 */

import { parse } from '@babel/parser';

export class ASTBuilder {
    constructor() {
        this.nodes = [];
    }

    static parse(code, options = {}) {
        const defaultOptions = {
            sourceType: 'module',
            allowImportExportEverywhere: true,
            plugins: ['jsx', 'objectRestSpread', 'decorators', 'classProperties', 'typescript']
        };
        return parse(code, { ...defaultOptions, ...options });
    }

    static createMockNodePath(node, parent = null) {
        return {
            node,
            parent,
            parentPath: parent ? { node: parent, type: parent.type } : null,
            isReferencedIdentifier: () => true,
            traverse: () => { }
        };
    }

    static buildFileInfo(overrides = {}) {
        return {
            filePath: '/test/file.js',
            fileName: 'file.js',
            ext: '.js',
            imports: [],
            exports: [],
            definitions: [],
            calls: [],
            functions: [],
            identifierRefs: [],
            typeDefinitions: [],
            enumDefinitions: [],
            constantExports: [],
            objectExports: [],
            typeUsages: [],
            ...overrides
        };
    }
}
