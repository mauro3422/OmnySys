/**
 * @fileoverview graph-edge.builder.js
 * 
 * Factory for graph edge test data
 * 
 * @module tests/factories/graph-edge
 */

export class GraphEdgeBuilder {
    constructor() {
        this.edges = [];
        this.mappings = [];
        this.atoms = [];
    }

    /**
     * Add an atom reference
     */
    withAtom(atom) {
        this.atoms.push(atom);
        return this;
    }

    /**
     * Create a direct call edge
     */
    withDirectEdge(from, to, overrides = {}) {
        const fromAtom = this.findAtom(from);
        const toAtom = this.findAtom(to);

        const edge = {
            id: `edge_${fromAtom.id}_${toAtom.id}_${overrides.callSite || 1}`,
            from: fromAtom.id,
            to: toAtom.id,
            fromFunction: from,
            toFunction: to,
            type: 'direct_call',
            dataMapping: overrides.dataMapping || [],
            returnFlow: overrides.returnFlow || { isUsed: false, usages: 0 },
            callSite: overrides.callSite || 1,
            totalArgs: overrides.totalArgs || 0,
            totalParams: overrides.totalParams || 0,
            summary: overrides.summary || null,
            ...overrides
        };

        this.edges.push(edge);

        // Create corresponding mapping
        this.mappings.push({
            caller: from,
            callee: to,
            callSite: edge.callSite,
            mappings: edge.dataMapping.map(m => ({
                argument: { variable: m.source, code: m.source },
                parameter: { name: m.target },
                transform: { type: m.transform || 'DIRECT_PASS' },
                confidence: m.confidence || 1.0
            })),
            returnUsage: edge.returnFlow,
            totalArgs: edge.totalArgs,
            totalParams: edge.totalParams,
            summary: edge.summary
        });

        return this;
    }

    /**
     * Create a data transform edge
     */
    withTransformEdge(from, to, transforms, overrides = {}) {
        const dataMapping = transforms.map((t, i) => ({
            source: t.from || `arg_${i}`,
            target: t.to || `param_${i}`,
            transform: t.type || 'TRANSFORM',
            confidence: t.confidence || 0.8
        }));

        return this.withDirectEdge(from, to, {
            type: 'data_transform',
            dataMapping,
            ...overrides
        });
    }

    /**
     * Create a call edge (generic)
     */
    withCallEdge(from, to, overrides = {}) {
        return this.withDirectEdge(from, to, {
            type: 'call',
            ...overrides
        });
    }

    /**
     * Create a return flow edge
     */
    withReturnEdge(from, to, overrides = {}) {
        return this.withDirectEdge(from, to, {
            type: 'return_flow',
            returnFlow: {
                isUsed: true,
                assignedTo: overrides.assignedTo || 'result',
                usages: overrides.usages || 1,
                ...overrides.returnFlow
            },
            ...overrides
        });
    }

    /**
     * Create multiple edges
     */
    withEdges(edges) {
        for (const edge of edges) {
            this.withDirectEdge(edge.from, edge.to, edge);
        }
        return this;
    }

    /**
     * Create a chain of edges
     */
    withChain(functions, overrides = {}) {
        for (let i = 0; i < functions.length - 1; i++) {
            this.withDirectEdge(functions[i], functions[i + 1], {
                callSite: i + 1,
                ...overrides
            });
        }
        return this;
    }

    /**
     * Create branching edges (one to many)
     */
    withBranch(from, tos, overrides = {}) {
        for (let i = 0; i < tos.length; i++) {
            this.withDirectEdge(from, tos[i], {
                callSite: i + 1,
                ...overrides
            });
        }
        return this;
    }

    /**
     * Create converging edges (many to one)
     */
    withConverge(froms, to, overrides = {}) {
        for (let i = 0; i < froms.length; i++) {
            this.withDirectEdge(froms[i], to, {
                callSite: i + 1,
                ...overrides
            });
        }
        return this;
    }

    /**
     * Find atom by name
     */
    findAtom(name) {
        return this.atoms.find(a => a.name === name) || {
            id: `file::${name}`,
            name
        };
    }

    /**
     * Build edges
     */
    buildEdges() {
        return this.edges;
    }

    /**
     * Build mappings
     */
    buildMappings() {
        return this.mappings;
    }

    /**
     * Build complete structure
     */
    build() {
        return {
            edges: this.edges,
            mappings: this.mappings,
            meta: {
                totalEdges: this.edges.length,
                byType: this.edges.reduce((acc, e) => {
                    acc[e.type] = (acc[e.type] || 0) + 1;
                    return acc;
                }, {})
            }
        };
    }
}
