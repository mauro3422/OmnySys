/**
 * @fileoverview graph-node.builder.js
 * 
 * Factory for graph node test data
 * 
 * @module tests/factories/graph-node
 */

export class GraphNodeBuilder {
    constructor() {
        this.nodes = [];
        this.atoms = [];
        this.chains = [];
    }

    /**
     * Add an atom as a node
     */
    withAtom(atom, overrides = {}) {
        const node = {
            id: atom.id,
            function: atom.name,
            type: overrides.type || 'unknown',
            inputs: atom.dataFlow?.inputs?.map(i => ({ ...i })) || [],
            outputs: atom.dataFlow?.outputs?.map(o => ({ ...o })) || [],
            complexity: atom.complexity || 0,
            hasSideEffects: atom.hasSideEffects || false,
            isExported: atom.isExported || false,
            chains: [],
            position: overrides.position || {},
            ...overrides
        };
        this.nodes.push(node);
        this.atoms.push(atom);
        return this;
    }

    /**
     * Add an entry node
     */
    withEntryNode(name, overrides = {}) {
        const atom = this.createMockAtom(name, {
            isExported: true,
            ...overrides.atom
        });
        return this.withAtom(atom, { type: 'entry', ...overrides.node });
    }

    /**
     * Add an exit node
     */
    withExitNode(name, overrides = {}) {
        const atom = this.createMockAtom(name, {
            calls: [],
            ...overrides.atom
        });
        return this.withAtom(atom, { type: 'exit', ...overrides.node });
    }

    /**
     * Add an intermediate node
     */
    withIntermediateNode(name, overrides = {}) {
        const atom = this.createMockAtom(name, {
            calledBy: ['file::caller'],
            calls: [{ name: 'callee', type: 'internal' }],
            ...overrides.atom
        });
        return this.withAtom(atom, { type: 'intermediate', ...overrides.node });
    }

    /**
     * Add an isolated node
     */
    withIsolatedNode(name, overrides = {}) {
        const atom = this.createMockAtom(name, {
            calledBy: [],
            calls: [],
            ...overrides.atom
        });
        return this.withAtom(atom, { type: 'isolated', ...overrides.node });
    }

    /**
     * Associate chains with nodes
     */
    withChains(chainIds) {
        if (this.nodes.length > 0) {
            this.nodes[this.nodes.length - 1].chains = chainIds;
        }
        return this;
    }

    /**
     * Set position in chains for last node
     */
    withPosition(position) {
        if (this.nodes.length > 0) {
            this.nodes[this.nodes.length - 1].position = position;
        }
        return this;
    }

    /**
     * Create a mock atom
     */
    createMockAtom(name, overrides = {}) {
        return {
            id: `file::${name}`,
            name,
            type: 'function',
            isExported: overrides.isExported ?? false,
            line: 1,
            column: 0,
            complexity: overrides.complexity || 1,
            hasSideEffects: overrides.hasSideEffects ?? false,
            calledBy: overrides.calledBy || [],
            calls: overrides.calls || [],
            dataFlow: {
                inputs: overrides.inputs || [],
                outputs: overrides.outputs || [],
                transformations: overrides.transformations || []
            },
            ...overrides
        };
    }

    /**
     * Create multiple nodes at once
     */
    withNodes(count, prefix = 'node') {
        for (let i = 0; i < count; i++) {
            const name = `${prefix}_${i}`;
            const atom = this.createMockAtom(name);
            this.withAtom(atom);
        }
        return this;
    }

    /**
     * Build and return all nodes
     */
    build() {
        return {
            nodes: this.nodes,
            atoms: this.atoms
        };
    }

    /**
     * Build a complete graph structure
     */
    buildGraph() {
        return {
            nodes: this.nodes,
            meta: {
                totalNodes: this.nodes.length,
                entryNodes: this.nodes.filter(n => n.type === 'entry').length,
                exitNodes: this.nodes.filter(n => n.type === 'exit').length,
                intermediateNodes: this.nodes.filter(n => n.type === 'intermediate').length,
                isolatedNodes: this.nodes.filter(n => n.type === 'isolated').length
            }
        };
    }
}
