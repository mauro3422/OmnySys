export class PerformanceBuilder {
    constructor() {
        this.metrics = {
            complexity: { cyclomatic: 1, cognitive: 0, bigO: 'O(1)' },
            expensiveOps: { nestedLoops: 0, recursion: false, blockingOps: [], heavyCalls: [] },
            resources: { network: false, disk: false, memory: 'low', dom: false },
            estimates: { executionTime: 'instant', blocking: false, async: false },
            impactScore: 0
        };
    }

    withComplexity(cyclomatic, cognitive, bigO = 'O(1)') {
        this.metrics.complexity = { cyclomatic, cognitive, bigO };
        return this;
    }

    withNestedLoops(count) {
        this.metrics.expensiveOps.nestedLoops = count;
        return this;
    }

    withRecursion(hasRecursion = true) {
        this.metrics.expensiveOps.recursion = hasRecursion;
        return this;
    }

    addHeavyCall(operation, cost = 'medium') {
        this.metrics.expensiveOps.heavyCalls.push({ operation, cost });
        return this;
    }

    withNetwork(hasNetwork = true) {
        this.metrics.resources.network = hasNetwork;
        this.metrics.estimates.async = hasNetwork;
        return this;
    }

    withDisk(hasDisk = true) {
        this.metrics.resources.disk = hasDisk;
        return this;
    }

    withMemory(level) {
        this.metrics.resources.memory = level;
        return this;
    }

    withDOM(hasDOM = true) {
        this.metrics.resources.dom = hasDOM;
        return this;
    }

    withImpactScore(score) {
        this.metrics.impactScore = score;
        return this;
    }

    build() {
        return { ...this.metrics };
    }

    static simple() {
        return new PerformanceBuilder()
            .withComplexity(1, 0, 'O(1)')
            .withImpactScore(0);
    }

    static networkHeavy() {
        return new PerformanceBuilder()
            .withComplexity(3, 1, 'O(n)')
            .withNetwork(true)
            .addHeavyCall('fetch', 'high')
            .withImpactScore(0.6);
    }

    static computationallyExpensive() {
        return new PerformanceBuilder()
            .withComplexity(15, 4, 'O(n^2)')
            .withNestedLoops(2)
            .withMemory('high')
            .withImpactScore(0.8);
    }
}
