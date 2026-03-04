export class ErrorFlowBuilder {
    constructor() {
        this.throws = [];
        this.catches = [];
        this.tryBlocks = [];
        this.unhandledCalls = [];
        this.propagation = 'none';
    }

    addThrow(type, condition = 'unknown', source = 'explicit', confidence = 1.0) {
        this.throws.push({ type, condition, source, confidence });
        return this;
    }

    addCatch(variable = 'error', handling = {}) {
        this.catches.push({
            type: handling.type || 'generic',
            variable,
            rethrows: handling.rethrows || false,
            logs: handling.logs || false,
            returns: handling.returns || false,
            transforms: handling.transforms || false
        });
        return this;
    }

    addTryBlock(hasCatch = true, hasFinally = false, protectedCalls = []) {
        this.tryBlocks.push({
            hasCatch,
            hasFinally,
            lines: 10,
            protectedCalls
        });
        return this;
    }

    withPropagation(pattern) {
        this.propagation = pattern;
        return this;
    }

    addUnhandledCall(call, position = 0) {
        this.unhandledCalls.push({ call, position });
        return this;
    }

    build() {
        return {
            throws: this.throws,
            catches: this.catches,
            tryBlocks: this.tryBlocks,
            unhandledCalls: this.unhandledCalls,
            propagation: this.propagation
        };
    }

    static noErrorHandling() {
        return new ErrorFlowBuilder().withPropagation('none');
    }

    static fullPropagation() {
        return new ErrorFlowBuilder()
            .withPropagation('full')
            .addTryBlock(true, false)
            .addThrow('Error', 'unknown')
            .addCatch('e', { rethrows: true });
    }

    static partialPropagation() {
        return new ErrorFlowBuilder()
            .withPropagation('partial')
            .addTryBlock(true, false)
            .addCatch('e', { logs: true });
    }
}
