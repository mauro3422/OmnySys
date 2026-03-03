/**
 * @fileoverview node.builder.js
 * 
 * Builder for graph nodes (file nodes)
 * 
 * @module tests/factories/graph-test/node
 */

import { createFileNode } from '../../../../src/layer-graph/core/types.js';

export class NodeBuilder {
    constructor(path, options = {}) {
        this.path = path;
        this.displayPath = options.displayPath || path;
        this.exports = options.exports || [];
        this.imports = options.imports || [];
        this.definitions = options.definitions || [];
        this.usedBy = options.usedBy || [];
        this.dependsOn = options.dependsOn || [];
        this.calls = options.calls || [];
        this.identifierRefs = options.identifierRefs || [];
        this.transitiveDepends = options.transitiveDepends || [];
        this.transitiveDependents = options.transitiveDependents || [];
        this.metadata = options.metadata || {};
    }

    /**
     * Set display path
     */
    withDisplayPath(displayPath) {
        this.displayPath = displayPath;
        return this;
    }

    /**
     * Add an export
     */
    withExport(name, type = 'named') {
        this.exports.push({ name, type });
        return this;
    }

    /**
     * Add multiple exports
     */
    withExports(names) {
        for (const name of names) {
            this.withExport(name);
        }
        return this;
    }

    /**
     * Add an import
     */
    withImport(source, options = {}) {
        this.imports.push({
            source,
            type: options.type || 'static',
            symbols: options.symbols || [],
            line: options.line || 1
        });
        return this;
    }

    /**
     * Add a usedBy reference
     */
    usedByFile(filePath) {
        this.usedBy.push(filePath);
        return this;
    }

    /**
     * Add a dependsOn reference
     */
    dependsOnFile(filePath) {
        this.dependsOn.push(filePath);
        return this;
    }

    /**
     * Set transitive dependencies
     */
    withTransitiveDepends(deps) {
        this.transitiveDepends = deps;
        return this;
    }

    /**
     * Set transitive dependents
     */
    withTransitiveDependents(dependents) {
        this.transitiveDependents = dependents;
        return this;
    }

    /**
     * Set metadata
     */
    withMetadata(metadata) {
        this.metadata = { ...this.metadata, ...metadata };
        return this;
    }

    /**
     * Build the file node
     */
    build() {
        return createFileNode(this.path, this.displayPath, {
            exports: this.exports,
            imports: this.imports,
            definitions: this.definitions,
            calls: this.calls,
            identifierRefs: this.identifierRefs
        });
    }

    static create(path, options = {}) {
        return new NodeBuilder(path, options);
    }
}
