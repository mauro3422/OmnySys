/**
 * @fileoverview edge.builder.js
 * 
 * Builder for graph edges (dependencies)
 * 
 * @module tests/factories/graph-test/edge
 */

import { createDependency } from '../../../../src/layer-graph/core/types.js';

export class EdgeBuilder {
    constructor(from, to, options = {}) {
        this.from = from;
        this.to = to;
        this.type = options.type || 'import';
        this.symbols = options.symbols || [];
        this.reason = options.reason;
        this.dynamic = options.dynamic || false;
        this.confidence = options.confidence || 1.0;
    }

    /**
     * Set dependency type
     */
    ofType(type) {
        this.type = type;
        return this;
    }

    /**
     * Set as dynamic import
     */
    asDynamic(dynamic = true) {
        this.dynamic = dynamic;
        return this;
    }

    /**
     * Add imported symbols
     */
    withSymbols(symbols) {
        this.symbols = symbols;
        return this;
    }

    /**
     * Set confidence level
     */
    withConfidence(confidence) {
        this.confidence = confidence;
        return this;
    }

    /**
     * Set reason for dependency
     */
    because(reason) {
        this.reason = reason;
        return this;
    }

    /**
     * Build the dependency
     */
    build() {
        return createDependency(this.from, this.to, {
            type: this.type,
            symbols: this.symbols,
            reason: this.reason,
            dynamic: this.dynamic,
            confidence: this.confidence
        });
    }

    static create(from, to, options = {}) {
        return new EdgeBuilder(from, to, options);
    }
}
