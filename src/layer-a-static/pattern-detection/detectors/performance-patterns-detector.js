/**
 * @fileoverview Performance Patterns Detector
 * 
 * Automates the detection of performance anti-patterns during the static analysis phase.
 * Leverages the pre-extracted `performance_json` metadata.
 * 
 * @module pattern-detection/detectors/performance-patterns-detector
 */

import { PatternDetector } from '../detector-base.js';

export class PerformancePatternsDetector extends PatternDetector {
    getId() {
        return 'performance-patterns';
    }

    getName() {
        return 'Performance Anti-Patterns';
    }

    getDescription() {
        return 'Detects algorithmic complexity risks and blocking operations in hot paths';
    }

    async detect(systemMap) {
        const findings = [];

        // Iterar sobre todos los átomos en el systemMap que tengan metadata de performance
        // Nota: El systemMap suele tener una estructura plana de átomos o agrupada por archivo
        const atoms = this.getAllAtoms(systemMap);

        for (const atom of atoms) {
            const perf = atom.performance || {};
            const riskScore = this.calculateRisk(perf);

            if (riskScore >= 20) {
                const severity = riskScore >= 50 ? 'high' : 'medium';

                findings.push({
                    id: `perf-${atom.id}`,
                    type: 'performance_risk',
                    severity,
                    file: atom.file,
                    line: atom.line || 1,
                    message: this.formatMessage(atom, perf),
                    recommendation: this.generateRecommendation(perf),
                    metadata: {
                        atomId: atom.id,
                        complexity: perf.estimatedComplexity,
                        riskScore
                    }
                });
            }
        }

        return {
            detector: this.getId(),
            name: this.getName(),
            description: this.getDescription(),
            findings: findings.sort((a, b) => b.metadata.riskScore - a.metadata.riskScore),
            score: this.calculateScore(findings),
            weight: 0.20
        };
    }

    getAllAtoms(systemMap) {
        // En el systemMap de Layer A, los átomos suelen estar en systemMap.functions o similares
        return Object.values(systemMap.functions || {});
    }

    calculateRisk(perf) {
        let score = 0;
        if (perf.estimatedComplexity === 'O(n^3)') score += 60;
        else if (perf.estimatedComplexity === 'O(n^2)') score += 40;

        if (perf.blockingOperations?.length > 0) score += 30;
        if (perf.largeArrayOps?.length > 1) score += 20;

        return score;
    }

    formatMessage(atom, perf) {
        return `Potential performance bottleneck in "${atom.name}": Detected ${perf.estimatedComplexity} complexity with ${perf.blockingOperations?.length || 0} blocking ops.`;
    }

    generateRecommendation(perf) {
        if (perf.estimatedComplexity?.includes('n^')) return 'Refactor nested loops or use more efficient data structures (Map/Set).';
        if (perf.blockingOperations?.length > 0) return 'Replace sync blocking operations with async counterparts.';
        return 'Review iteration patterns for potential optimizations.';
    }

    calculateScore(findings) {
        if (findings.length === 0) return 100;
        const highCount = findings.filter(f => f.severity === 'high').length;
        const medCount = findings.filter(f => f.severity === 'medium').length;
        return Math.max(0, 100 - (highCount * 15) - (medCount * 5));
    }
}

export default PerformancePatternsDetector;
