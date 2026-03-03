/**
 * @fileoverview molecular-chains-test.validators.js
 * 
 * Test Validators
 * 
 * @module tests/factories/molecular-chains-validators
 */

export class MolecularChainsValidators {

    /**
     * Validate a chain structure
     */
    static validateChain(chain) {
        if (!chain) return false;
        if (!chain.id) return false;
        if (!chain.entryFunction) return false;
        if (!chain.exitFunction) return false;
        if (!Array.isArray(chain.steps)) return false;
        if (chain.steps.length === 0) return false;

        for (const step of chain.steps) {
            if (!this.validateStep(step)) return false;
        }

        return true;
    }

    /**
     * Validate a chain step
     */
    static validateStep(step) {
        if (!step) return false;
        if (!step.function) return false;
        if (!step.atomId) return false;
        if (!step.input) return false;
        if (!step.output) return false;
        if (!Array.isArray(step.internalTransforms)) return false;
        if (!Array.isArray(step.calls)) return false;
        return true;
    }

    /**
     * Validate mapping result
     */
    static validateMapping(mapping) {
        if (!mapping) return false;
        if (!mapping.caller) return false;
        if (!mapping.callee) return false;
        if (!Array.isArray(mapping.mappings)) return false;
        if (typeof mapping.totalArgs !== 'number') return false;
        if (typeof mapping.totalParams !== 'number') return false;
        return true;
    }

    /**
     * Validate graph node
     */
    static validateNode(node) {
        if (!node) return false;
        if (!node.id) return false;
        if (!node.function) return false;
        if (!node.type) return false;
        if (!Array.isArray(node.chains)) return false;
        return true;
    }

    /**
     * Validate graph edge
     */
    static validateEdge(edge) {
        if (!edge) return false;
        if (!edge.id) return false;
        if (!edge.from) return false;
        if (!edge.to) return false;
        if (!edge.fromFunction) return false;
        if (!edge.toFunction) return false;
        if (!edge.type) return false;
        return true;
    }

    /**
     * Validate graph structure
     */
    static validateGraph(graph) {
        if (!graph) return false;
        if (!Array.isArray(graph.nodes)) return false;
        if (!Array.isArray(graph.edges)) return false;
        if (!graph.meta) return false;
        if (typeof graph.meta.totalNodes !== 'number') return false;
        if (typeof graph.meta.totalEdges !== 'number') return false;

        for (const node of graph.nodes) {
            if (!this.validateNode(node)) return false;
        }

        for (const edge of graph.edges) {
            if (!this.validateEdge(edge)) return false;
        }

        return true;
    }
}
