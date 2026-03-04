export class TemporalBuilder {
    constructor() {
        this.patterns = {
            timers: [],
            asyncPatterns: null,
            events: [],
            lifecycleHooks: [],
            executionOrder: null
        };
    }

    addTimeout(delay, category = 'normal') {
        this.patterns.timers.push({
            type: 'setTimeout',
            delay,
            delayCategory: category
        });
        return this;
    }

    addInterval(interval) {
        this.patterns.timers.push({
            type: 'setInterval',
            interval
        });
        return this;
    }

    withAsyncPatterns(patterns) {
        this.patterns.asyncPatterns = {
            isAsync: patterns.isAsync ?? false,
            hasAwait: patterns.hasAwait ?? false,
            hasPromiseChain: patterns.hasPromiseChain ?? false,
            hasPromiseAll: patterns.hasPromiseAll ?? false,
            hasPromiseRace: patterns.hasPromiseRace ?? false,
            hasNewPromise: patterns.hasNewPromise ?? false,
            parallelOperations: patterns.parallelOperations || [],
            sequentialOperations: patterns.sequentialOperations || []
        };
        return this;
    }

    addEvent(type, target) {
        this.patterns.events.push({ type, target });
        return this;
    }

    withExecutionOrder(mustRunBefore = [], mustRunAfter = []) {
        this.patterns.executionOrder = {
            mustRunBefore,
            mustRunAfter,
            isInitializer: mustRunBefore.length > 0
        };
        return this;
    }

    build() {
        return { ...this.patterns };
    }

    static syncFunction() {
        return new TemporalBuilder()
            .withAsyncPatterns({ isAsync: false, hasAwait: false });
    }

    static asyncFunction() {
        return new TemporalBuilder()
            .withAsyncPatterns({ isAsync: true, hasAwait: true });
    }

    static withParallelOps(count) {
        return new TemporalBuilder()
            .withAsyncPatterns({
                isAsync: true,
                hasAwait: true,
                hasPromiseAll: true,
                parallelOperations: [{
                    type: 'Promise.all',
                    parallelCalls: count,
                    calls: []
                }]
            });
    }

    static delayedExecution(delay) {
        return new TemporalBuilder()
            .addTimeout(delay, delay < 100 ? 'fast' : delay < 1000 ? 'normal' : 'slow');
    }
}
