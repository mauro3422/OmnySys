/**
 * @fileoverview molecular-chains-test.scenarios.js
 * 
 * Test Scenarios - Predefined complex scenarios
 * 
 * @module tests/factories/molecular-chains-scenarios
 */
import { ChainBuilderFactory } from './chain-builder.factory.js';
import { ArgumentMapperBuilder } from './argument-mapper.builder.js';
import { GraphNodeBuilder } from './graph-node.builder.js';
import { GraphEdgeBuilder } from './graph-edge.builder.js';

export class MolecularChainsTestScenarios {

    /**
     * Create a simple linear chain: A -> B -> C
     */
    static linearChain() {
        const factory = new ChainBuilderFactory();
        const { atoms } = factory.createMultiStepChain(['A', 'B', 'C']);
        return { factory, atoms, entry: atoms[0], exit: atoms[2] };
    }

    /**
     * Create a branching chain: A -> B, C
     */
    static branchingChain() {
        const factory = new ChainBuilderFactory();
        const { atoms, entry, branches } = factory.createBranchingChain('A', ['B', 'C']);
        return { factory, atoms, entry, branches };
    }

    /**
     * Create converging chain: A -> C, B -> C
     */
    static convergingChain() {
        const factory = new ChainBuilderFactory();
        const { atoms, sources, target } = factory.createConvergingChain(['A', 'B'], 'C');
        return { factory, atoms, sources, target };
    }

    /**
     * Create diamond pattern: A -> B,C -> D
     */
    static diamondPattern() {
        const factory = new ChainBuilderFactory();
        const { atoms, a, b, c, d } = factory.createDiamondChain('A', 'B', 'C', 'D');
        return { factory, atoms, a, b, c, d };
    }

    /**
     * Create deep chain with 10 levels
     */
    static deepChain() {
        const factory = new ChainBuilderFactory();
        const steps = Array.from({ length: 10 }, (_, i) => `step_${i}`);
        const { atoms, entry } = factory.createMultiStepChain(steps);
        return { factory, atoms, entry, steps, depth: steps.length };
    }

    /**
     * Create chain with data transformations
     */
    static chainWithTransforms() {
        const factory = new ChainBuilderFactory();
        const transforms = [
            [{ type: 'PARSE', from: 'input', to: 'parsed' }],
            [{ type: 'VALIDATE', from: 'parsed', to: 'validated' }],
            [{ type: 'TRANSFORM', from: 'validated', to: 'result' }]
        ];
        const { atoms, entry } = factory.createChainWithTransforms(
            'entry',
            ['process', 'validate', 'format'],
            transforms,
            {
                inputs: [{ name: 'rawInput', type: 'string' }]
            }
        );
        return { factory, atoms, entry, transforms };
    }

    /**
     * Create chain with argument mapping scenarios
     */
    static argumentMappingScenario() {
        const builder = ArgumentMapperBuilder.createDirectPass();
        const data = builder.build();
        return { builder, ...data };
    }

    /**
     * Create chain with complex argument flows
     */
    static complexArgumentFlow() {
        const builder = new ArgumentMapperBuilder()
            .withCaller('processData', {
                inputs: [
                    { name: 'config', type: 'object' },
                    { name: 'items', type: 'array' }
                ],
                transformations: [
                    { type: 'MAP', from: 'items', to: 'processedItems' },
                    { type: 'MERGE', from: 'config', to: 'mergedConfig' }
                ]
            })
            .withCallee('transformItems', {
                inputs: [
                    { name: 'data', type: 'simple' },
                    { name: 'options', type: 'destructured', properties: ['filter', 'sort'] }
                ]
            })
            .withCallInfo({
                args: [
                    { type: 'Identifier', name: 'processedItems' },
                    { type: 'Identifier', name: 'mergedConfig' }
                ]
            });

        return { builder, ...builder.build() };
    }

    /**
     * Create graph with multiple node types
     */
    static multiTypeGraph() {
        const builder = new GraphNodeBuilder()
            .withEntryNode('main')
            .withIntermediateNode('process')
            .withIntermediateNode('validate')
            .withExitNode('save')
            .withIsolatedNode('helper');

        return { builder, ...builder.buildGraph() };
    }

    /**
     * Create graph with complex edges
     */
    static complexEdgeGraph() {
        const nodeBuilder = new GraphNodeBuilder()
            .withEntryNode('api')
            .withIntermediateNode('service')
            .withIntermediateNode('repository')
            .withExitNode('database');

        const { atoms } = nodeBuilder.build();

        const edgeBuilder = new GraphEdgeBuilder();
        atoms.forEach(a => edgeBuilder.withAtom(a));

        edgeBuilder
            .withDirectEdge('api', 'service', {
                callSite: 10,
                dataMapping: [{ source: 'request', target: 'params', transform: 'DIRECT_PASS', confidence: 1.0 }],
                returnFlow: { isUsed: true, assignedTo: 'result', usages: 1 }
            })
            .withTransformEdge('service', 'repository', [
                { type: 'MAP', from: 'params', to: 'query', confidence: 0.9 }
            ])
            .withDirectEdge('repository', 'database', {
                dataMapping: [{ source: 'query', target: 'sql', transform: 'DIRECT_PASS', confidence: 1.0 }]
            });

        return { nodeBuilder, edgeBuilder, ...edgeBuilder.build() };
    }

    /**
     * Create complete cross-function scenario
     */
    static completeCrossFunctionScenario() {
        const chainFactory = new ChainBuilderFactory();
        const { atoms: chainAtoms } = chainFactory.createDiamondChain(
            'controller', 'serviceA', 'serviceB', 'repository'
        );

        const nodeBuilder = new GraphNodeBuilder();
        chainAtoms.forEach(atom => nodeBuilder.withAtom(atom));
        const { nodes } = nodeBuilder.build();

        const edgeBuilder = new GraphEdgeBuilder();
        chainAtoms.forEach(atom => edgeBuilder.withAtom(atom));

        edgeBuilder
            .withBranch('controller', ['serviceA', 'serviceB'])
            .withConverge(['serviceA', 'serviceB'], 'repository');

        return {
            chainFactory,
            nodeBuilder,
            edgeBuilder,
            atoms: chainAtoms,
            nodes,
            edges: edgeBuilder.buildEdges(),
            mappings: edgeBuilder.buildMappings()
        };
    }
}
