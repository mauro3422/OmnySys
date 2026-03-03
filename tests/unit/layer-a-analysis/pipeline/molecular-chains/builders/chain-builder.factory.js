/**
 * @fileoverview chain-builder.factory.js
 * 
 * Factory for creating molecular chains of mock atoms
 * 
 * @module tests/factories/chain-builder
 */

export class ChainBuilderFactory {
    constructor() {
        this.atoms = [];
        this.chainId = 0;
    }

    /**
     * Create a simple atom
     */
    createAtom(overrides = {}) {
        const id = overrides.id || `atom_${Date.now()}_${this.atoms.length}`;
        const atom = {
            id,
            name: overrides.name || `function_${this.atoms.length}`,
            type: overrides.type || 'function',
            isExported: overrides.isExported ?? false,
            line: overrides.line || 1,
            column: overrides.column || 0,
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
        this.atoms.push(atom);
        return atom;
    }

    /**
     * Create an entry point atom (exported function)
     */
    createEntryPoint(name, overrides = {}) {
        return this.createAtom({
            name,
            isExported: true,
            calledBy: [],
            ...overrides
        });
    }

    /**
     * Create an intermediate function (called by others, calls others)
     */
    createIntermediate(name, calledBy, calls, overrides = {}) {
        return this.createAtom({
            name,
            calledBy: calledBy.map(c => typeof c === 'string' ? `file::${c}` : c),
            calls: calls.map(c => ({
                name: typeof c === 'string' ? c : c.name,
                type: 'internal',
                line: 1,
                ...(typeof c === 'object' ? c : {})
            })),
            ...overrides
        });
    }

    /**
     * Create an exit function (leaf node, doesn't call internal functions)
     */
    createExit(name, calledBy, overrides = {}) {
        return this.createAtom({
            name,
            calledBy: calledBy.map(c => typeof c === 'string' ? `file::${c}` : c),
            calls: [],
            ...overrides
        });
    }

    /**
     * Create a complex multi-step chain scenario
     */
    createMultiStepChain(steps, options = {}) {
        const atoms = [];
        const entryName = steps[0];

        // Create entry point
        const entry = this.createEntryPoint(entryName, {
            calls: steps.slice(1).map(s => ({ name: s })),
            ...options.entryOverrides
        });
        atoms.push(entry);

        // Create intermediate steps
        for (let i = 1; i < steps.length - 1; i++) {
            const step = this.createIntermediate(
                steps[i],
                [steps[i - 1]],
                [{ name: steps[i + 1] }],
                options.stepOverrides?.[i - 1] || {}
            );
            atoms.push(step);
        }

        // Create exit point
        if (steps.length > 1) {
            const exit = this.createExit(
                steps[steps.length - 1],
                [steps[steps.length - 2]],
                options.exitOverrides || {}
            );
            atoms.push(exit);
        }

        return { atoms, entry, steps };
    }

    /**
     * Create a chain with branches (one function calls multiple)
     */
    createBranchingChain(entryName, branches, options = {}) {
        const entry = this.createEntryPoint(entryName, {
            calls: branches.map(b => typeof b === 'string' ? { name: b } : b),
            ...options.entryOverrides
        });

        const branchAtoms = branches.map((branch, i) => {
            const branchName = typeof branch === 'string' ? branch : branch.name;
            return this.createExit(branchName, [entryName], {
                ...options.branchOverrides?.[i]
            });
        });

        return { atoms: [entry, ...branchAtoms], entry, branches: branchAtoms };
    }

    /**
     * Create a chain with converging calls (multiple functions call one)
     */
    createConvergingChain(sourceNames, targetName, options = {}) {
        const sources = sourceNames.map((name, i) =>
            this.createEntryPoint(name, {
                calls: [{ name: targetName }],
                ...options.sourceOverrides?.[i]
            })
        );

        const target = this.createIntermediate(
            targetName,
            sourceNames,
            [],
            options.targetOverrides || {}
        );

        return { atoms: [...sources, target], sources, target };
    }

    /**
     * Create a diamond pattern: A -> B,C -> D
     */
    createDiamondChain(a, b, c, d, options = {}) {
        const atomA = this.createEntryPoint(a, {
            calls: [{ name: b }, { name: c }],
            ...options.aOverrides
        });

        const atomB = this.createIntermediate(b, [a], [{ name: d }], options.bOverrides || {});
        const atomC = this.createIntermediate(c, [a], [{ name: d }], options.cOverrides || {});

        const atomD = this.createExit(d, [b, c], options.dOverrides || {});

        return {
            atoms: [atomA, atomB, atomC, atomD],
            a: atomA, b: atomB, c: atomC, d: atomD
        };
    }

    /**
     * Create circular dependency chain
     */
    createCircularChain(names, options = {}) {
        const atoms = names.map((name, i) => {
            const nextIndex = (i + 1) % names.length;
            return this.createAtom({
                name,
                calledBy: [`file::${names[(i - 1 + names.length) % names.length]}`],
                calls: [{ name: names[nextIndex], type: 'internal' }],
                ...options.overrides?.[i]
            });
        });
        return { atoms };
    }

    /**
     * Create chain with external dependencies
     */
    createChainWithExternalDeps(entryName, externalCalls, internalCalls = [], options = {}) {
        const entry = this.createEntryPoint(entryName, {
            calls: [
                ...externalCalls.map(c => ({ name: c, type: 'external' })),
                ...internalCalls.map(c => ({ name: c, type: 'internal' }))
            ],
            ...options.overrides
        });

        const internalAtoms = internalCalls.map((name, i) =>
            this.createExit(name, [entryName], options.internalOverrides?.[i])
        );

        return { atoms: [entry, ...internalAtoms], entry, internalAtoms };
    }

    /**
     * Create chain with data transformations
     */
    createChainWithTransforms(entryName, steps, transforms, options = {}) {
        const atoms = [];

        // Entry with transformations
        const entry = this.createEntryPoint(entryName, {
            calls: steps.slice(1).map(s => ({ name: s })),
            dataFlow: {
                inputs: options.inputs || [{ name: 'input', type: 'simple' }],
                outputs: [{ type: 'return' }],
                transformations: transforms[0] || []
            },
            ...options.entryOverrides
        });
        atoms.push(entry);

        // Intermediate steps with transformations
        for (let i = 1; i < steps.length; i++) {
            const atom = this.createAtom({
                name: steps[i],
                calledBy: [`file::${steps[i - 1]}`],
                calls: i < steps.length - 1 ? [{ name: steps[i + 1] }] : [],
                dataFlow: {
                    inputs: [{ name: 'param', type: 'simple' }],
                    outputs: [{ type: 'return' }],
                    transformations: transforms[i] || []
                },
                ...options.stepOverrides?.[i - 1]
            });
            atoms.push(atom);
        }

        return { atoms, entry, steps };
    }

    /**
     * Get all created atoms
     */
    getAtoms() {
        return this.atoms;
    }

    /**
     * Reset factory state
     */
    reset() {
        this.atoms = [];
        this.chainId = 0;
        return this;
    }
}
