/**
 * @fileoverview system-map.builder.js
 * 
 * Extended builder for complete system maps
 * 
 * @module tests/factories/graph-test/system-map
 */

import { GraphBuilder } from './graph.builder.js';

export class SystemMapBuilder {
    constructor() {
        this.graphBuilder = new GraphBuilder();
        this.typeDefinitions = {};
        this.enumDefinitions = {};
        this.constantExports = {};
        this.objectExports = {};
        this.typeUsages = {};
        this.metadata = {};
    }

    /**
     * Add a file node
     */
    withFile(path, options = {}) {
        this.graphBuilder.withFile(path, options);
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
     * Add a dependency
     */
    withDependency(from, to, options = {}) {
        this.graphBuilder.withDependency(from, to, options);
        return this;
    }

    /**
     * Create a cycle
     */
    withCycle(paths) {
        this.graphBuilder.withCycle(paths);
        return this;
    }

    /**
     * Add a function
     */
    withFunction(filePath, funcName, options = {}) {
        this.graphBuilder.withFunction(filePath, funcName, options);
        return this;
    }

    /**
     * Add a function link
     */
    withFunctionLink(fromFuncId, toFuncId, options = {}) {
        this.graphBuilder.withFunctionLink(fromFuncId, toFuncId, options);
        return this;
    }

    /**
     * Add type definitions for a file
     */
    withTypeDefinitions(filePath, types) {
        this.typeDefinitions[filePath] = types;
        return this;
    }

    /**
     * Add enum definitions for a file
     */
    withEnumDefinitions(filePath, enums) {
        this.enumDefinitions[filePath] = enums;
        return this;
    }

    /**
     * Add constant exports for a file
     */
    withConstantExports(filePath, constants) {
        this.constantExports[filePath] = constants;
        return this;
    }

    /**
     * Add object exports for a file
     */
    withObjectExports(filePath, objects) {
        this.objectExports[filePath] = objects;
        return this;
    }

    /**
     * Add type usages for a file
     */
    withTypeUsages(filePath, usages) {
        this.typeUsages[filePath] = usages;
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
     * Add parsed file info for building
     */
    withParsedFile(path, fileInfo = {}) {
        this.graphBuilder.withFile(path, fileInfo);

        if (fileInfo.functions) {
            for (const func of fileInfo.functions) {
                this.graphBuilder.withFunction(path, func.name, func);
            }
        }

        if (fileInfo.typeDefinitions) {
            this.withTypeDefinitions(path, fileInfo.typeDefinitions);
        }

        if (fileInfo.enumDefinitions) {
            this.withEnumDefinitions(path, fileInfo.enumDefinitions);
        }

        if (fileInfo.constantExports) {
            this.withConstantExports(path, fileInfo.constantExports);
        }

        if (fileInfo.objectExports) {
            this.withObjectExports(path, fileInfo.objectExports);
        }

        return this;
    }

    /**
     * Build the complete SystemMap
     */
    build() {
        const systemMap = this.graphBuilder.buildSystemMap();

        systemMap.typeDefinitions = this.typeDefinitions;
        systemMap.enumDefinitions = this.enumDefinitions;
        systemMap.constantExports = this.constantExports;
        systemMap.objectExports = this.objectExports;
        systemMap.typeUsages = this.typeUsages;

        // Update metadata
        systemMap.metadata = {
            ...systemMap.metadata,
            ...this.metadata,
            totalTypes: this.countItems(this.typeDefinitions),
            totalEnums: this.countItems(this.enumDefinitions),
            totalConstants: this.countItems(this.constantExports),
            totalSharedObjects: this.countItems(this.objectExports)
        };

        return systemMap;
    }

    /**
     * Count items in a map
     * @private
     */
    countItems(itemsMap) {
        let total = 0;
        for (const items of Object.values(itemsMap)) {
            if (Array.isArray(items)) {
                total += items.length;
            }
        }
        return total;
    }

    static create() {
        return new SystemMapBuilder();
    }
}
