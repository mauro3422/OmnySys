import { describe, it, expect, beforeEach } from 'vitest';
import { RiskScorer } from '../../../../src/layer-b-semantic/inference-engine/risk-scorer.js';

describe('RiskScorer (Semantic)', () => {
    let scorer;

    beforeEach(() => {
        scorer = new RiskScorer();
    });

    it('should calculate a low risk score for simple files', () => {
        const analysis = {
            filePath: 'src/simple.js',
            atoms: [
                { complexity: { cyclomatic: 2 }, hasSideEffects: false }
            ],
            usedBy: [],
            imports: []
        };

        const result = scorer.score(analysis);
        expect(result.level).toBe('low');
        expect(result.score).toBeLessThan(0.3);
    });

    it('should calculate a medium risk score for moderate complexity', () => {
        const analysis = {
            filePath: 'src/moderate.js',
            atoms: [
                { complexity: { cyclomatic: 8 }, hasSideEffects: true }
            ],
            usedBy: [1, 2, 3], // 3 incoming
            imports: [1, 2, 3, 4, 5] // 5 outgoing
        };

        const result = scorer.score(analysis);
        expect(result.level).toBe('medium');
        expect(result.score).toBeGreaterThanOrEqual(0.3);
        expect(result.score).toBeLessThan(0.6);
    });

    it('should flag high risk for network calls without error handling', () => {
        const analysis = {
            filePath: 'src/risky.js',
            atoms: [
                { complexity: { cyclomatic: 5 }, hasNetworkCalls: true, hasErrorHandling: false }
            ]
        };

        const result = scorer.score(analysis);
        expect(result.factors.errorHandling).toBe(0.9);
        expect(result.recommendations.some(r => r.type === 'reliability')).toBe(true);
    });

    it('should produce consistent results across multiple runs', () => {
        const analysis = {
            filePath: 'src/test.js',
            atoms: [{ complexity: { cyclomatic: 15 } }],
            usedBy: new Array(15).fill(0),
            imports: new Array(25).fill(0)
        };

        const run1 = scorer.score(analysis);
        const run2 = scorer.score(analysis);
        expect(run1).toEqual(run2);
    });
});
