/**
 * @fileoverview argument-mapper.builder.js
 * 
 * Factory for argument mapping test data
 * 
 * @module tests/factories/argument-mapper
 */

export class ArgumentMapperBuilder {
    constructor() {
        this.caller = null;
        this.callee = null;
        this.callInfo = null;
    }

    /**
     * Create a caller atom with arguments
     */
    withCaller(name, overrides = {}) {
        this.caller = {
            id: `file::${name}`,
            name,
            type: 'function',
            isExported: true,
            dataFlow: {
                inputs: overrides.inputs || [],
                outputs: overrides.outputs || [],
                transformations: overrides.transformations || []
            },
            calls: [],
            ...overrides
        };
        return this;
    }

    /**
     * Create a callee atom with parameters
     */
    withCallee(name, overrides = {}) {
        this.callee = {
            id: `file::${name}`,
            name,
            type: 'function',
            dataFlow: {
                inputs: overrides.inputs || [],
                outputs: overrides.outputs || [],
                transformations: overrides.transformations || []
            },
            ...overrides
        };
        return this;
    }

    /**
     * Define call information
     */
    withCallInfo(overrides = {}) {
        this.callInfo = {
            name: overrides.name || this.callee?.name || 'callee',
            type: 'internal',
            line: overrides.line || 1,
            column: overrides.column || 0,
            args: overrides.args || [],
            ...overrides
        };
        return this;
    }

    /**
     * Add simple argument (identifier)
     */
    withIdentifierArg(name, overrides = {}) {
        const arg = {
            type: 'Identifier',
            name,
            ...overrides
        };
        this.callInfo = this.callInfo || { args: [] };
        this.callInfo.args.push(arg);
        return this;
    }

    /**
     * Add member expression argument (obj.prop)
     */
    withMemberArg(object, property, overrides = {}) {
        const arg = {
            type: 'MemberExpression',
            object: { name: object },
            property,
            ...overrides
        };
        this.callInfo = this.callInfo || { args: [] };
        this.callInfo.args.push(arg);
        return this;
    }

    /**
     * Add call expression argument (func())
     */
    withCallArg(callee, args = [], overrides = {}) {
        const arg = {
            type: 'CallExpression',
            callee,
            arguments: args,
            ...overrides
        };
        this.callInfo = this.callInfo || { args: [] };
        this.callInfo.args.push(arg);
        return this;
    }

    /**
     * Add literal argument
     */
    withLiteralArg(value, overrides = {}) {
        const arg = {
            type: 'Literal',
            value,
            ...overrides
        };
        this.callInfo = this.callInfo || { args: [] };
        this.callInfo.args.push(arg);
        return this;
    }

    /**
     * Add spread argument (...args)
     */
    withSpreadArg(name, overrides = {}) {
        const arg = {
            type: 'spread',
            name,
            ...overrides
        };
        this.callInfo = this.callInfo || { args: [] };
        this.callInfo.args.push(arg);
        return this;
    }

    /**
     * Set callee parameters
     */
    withParams(params) {
        if (!this.callee) {
            throw new Error('Callee must be defined before setting params');
        }
        this.callee.dataFlow.inputs = params.map((p, i) =>
            typeof p === 'string'
                ? { name: p, type: 'simple', position: i }
                : { name: p.name, type: p.type || 'simple', position: i, ...p }
        );
        return this;
    }

    /**
     * Set caller transformations
     */
    withCallerTransforms(transforms) {
        if (!this.caller) {
            throw new Error('Caller must be defined before setting transforms');
        }
        this.caller.dataFlow.transformations = transforms.map(t =>
            typeof t === 'string'
                ? { type: t, from: 'input', to: 'output' }
                : t
        );
        return this;
    }

    /**
     * Create direct pass mapping (no transformation)
     */
    static createDirectPass() {
        return new ArgumentMapperBuilder()
            .withCaller('caller', { inputs: [{ name: 'data', type: 'simple' }] })
            .withCallee('callee', { inputs: [{ name: 'param', type: 'simple' }] })
            .withCallInfo({ args: [{ type: 'Identifier', name: 'data' }] });
    }

    /**
     * Create transform mapping (argument is transformed before passing)
     */
    static createWithTransform() {
        return new ArgumentMapperBuilder()
            .withCaller('caller', {
                inputs: [{ name: 'raw', type: 'simple' }],
                transformations: [{ type: 'MAP', from: 'raw', to: 'processed' }]
            })
            .withCallee('callee', { inputs: [{ name: 'param', type: 'simple' }] })
            .withCallInfo({ args: [{ type: 'Identifier', name: 'processed' }] });
    }

    /**
     * Create destructuring parameter mapping
     */
    static createDestructuringMapping() {
        return new ArgumentMapperBuilder()
            .withCaller('caller')
            .withCallee('callee', {
                inputs: [
                    { name: 'config', type: 'destructured', properties: ['a', 'b'] }
                ]
            })
            .withCallInfo({ args: [{ type: 'Identifier', name: 'config' }] });
    }

    /**
     * Build the mapping test data
     */
    build() {
        return {
            caller: this.caller,
            callee: this.callee,
            callInfo: this.callInfo
        };
    }
}
