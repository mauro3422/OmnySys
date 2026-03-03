/**
 * @fileoverview graph.builder.js
 * 
 * Builder for complete graph structures
 * 
 * @module tests/factories/graph-test/graph
 */

import { createEmptySystemMap, createFunctionLink } from '../../../../src/layer-graph/core/types.js';
import { NodeBuilder } from './node.builder.js';
import { EdgeBuilder } from './edge.builder.js';

export class GraphBuilder {
    constructor() {
        this.files = {};
        this.dependencies = [];
        this.functions = {};
        this.function_links = [];
        this.unresolvedImports = {};
        this.reexportChains = [];
        this.exportIndex = {};
    }

    /**
     * Add a file node to the graph
     */
    withFile(path, options = {}) {
        const nodeBuilder = new NodeBuilder(path, options);
        this.files[path] = nodeBuilder.build();
        return this;
    }

    /**
     * Add a file node using a NodeBuilder
     */
    withNode(nodeBuilder) {
        const node = nodeBuilder.build();
        this.files[node.path] = node;
        return this;
    }

    /**
     * Add multiple files at once
     */
    withFiles(paths) {
        for (const path of paths) {
            this.withFile(path);
        }
        return this;
    }

    /**
     * Add a dependency between files
     */
    withDependency(from, to, options = {}) {
        const edgeBuilder = new EdgeBuilder(from, to, options);
        this.dependencies.push(edgeBuilder.build());

        // Update bidirectional relationships
        if (this.files[from]) {
            this.files[from].dependsOn.push(to);
        }
        if (this.files[to]) {
            this.files[to].usedBy.push(from);
        }

        return this;
    }

    /**
     * Create a chain of dependencies
     */
    withDependencyChain(paths) {
        for (let i = 0; i < paths.length - 1; i++) {
            this.withDependency(paths[i], paths[i + 1]);
        }
        return this;
    }

    /**
     * Create a circular dependency
     */
    withCycle(paths) {
        if (paths.length < 2) return this;

        // Ensure all files exist
        for (const path of paths) {
            if (!this.files[path]) {
                this.withFile(path);
            }
        }

        // Create circular dependency
        for (let i = 0; i < paths.length; i++) {
            const from = paths[i];
            const to = paths[(i + 1) % paths.length];
            this.withDependency(from, to);
        }

        return this;
    }

    /**
     * Add a function to a file
     */
    withFunction(filePath, funcName, options = {}) {
        if (!this.functions[filePath]) {
            this.functions[filePath] = [];
        }

        const func = {
            id: `${filePath}::${funcName}`,
            name: funcName,
            file: filePath,
            line: options.line || 1,
            isExported: options.isExported || false,
            isAsync: options.isAsync || false,
            calls: options.calls || [],
            ...options
        };

        this.functions[filePath].push(func);
        return this;
    }

    /**
     * Add a function link
     */
    withFunctionLink(fromFuncId, toFuncId, options = {}) {
        const link = createFunctionLink(fromFuncId, toFuncId, {
            line: options.line,
            fileFrom: options.fileFrom,
            fileTo: options.fileTo
        });
        this.function_links.push(link);
        return this;
    }

    /**
     * Add unresolved imports for a file
     */
    withUnresolvedImports(filePath, imports) {
        this.unresolvedImports[filePath] = imports.map(source => ({
            source,
            type: 'unresolved',
            reason: 'Module not found',
            severity: 'HIGH'
        }));
        return this;
    }

    /**
     * Set transitive dependencies for a file
     */
    withTransitiveDependencies(filePath, deps) {
        if (this.files[filePath]) {
            this.files[filePath].transitiveDepends = deps;
        }
        return this;
    }

    /**
     * Set transitive dependents for a file
     */
    withTransitiveDependents(filePath, dependents) {
        if (this.files[filePath]) {
            this.files[filePath].transitiveDependents = dependents;
        }
        return this;
    }

    /**
     * Add export to export index
     */
    withExport(filePath, name, options = {}) {
        if (!this.exportIndex[filePath]) {
            this.exportIndex[filePath] = {};
        }

        this.exportIndex[filePath][name] = {
            type: options.type || 'direct',
            sourceFile: options.sourceFile || filePath,
            sourceName: options.sourceName || name
        };

        return this;
    }

    /**
     * Build the complete graph structure
     */
    build() {
        return {
            files: this.files,
            dependencies: this.dependencies,
            functions: this.functions,
            function_links: this.function_links,
            unresolvedImports: this.unresolvedImports,
            reexportChains: this.reexportChains,
            exportIndex: this.exportIndex
        };
    }

    /**
     * Build as a complete SystemMap
     */
    buildSystemMap() {
        const systemMap = createEmptySystemMap();
        systemMap.files = this.files;
        systemMap.dependencies = this.dependencies;
        systemMap.functions = this.functions;
        systemMap.function_links = this.function_links;
        systemMap.unresolvedImports = this.unresolvedImports;
        systemMap.reexportChains = this.reexportChains;
        systemMap.exportIndex = this.exportIndex;

        // Update metadata
        systemMap.metadata.totalFiles = Object.keys(this.files).length;
        systemMap.metadata.totalDependencies = this.dependencies.length;
        systemMap.metadata.totalFunctionLinks = this.function_links.length;

        let totalFunctions = 0;
        for (const funcs of Object.values(this.functions)) {
            totalFunctions += funcs.length;
        }
        systemMap.metadata.totalFunctions = totalFunctions;

        const totalUnresolved = Object.values(this.unresolvedImports)
            .reduce((sum, arr) => sum + arr.length, 0);
        systemMap.metadata.totalUnresolved = totalUnresolved;

        return systemMap;
    }

    static create() {
        return new GraphBuilder();
    }
}
