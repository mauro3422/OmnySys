import { describe, it, expect } from 'vitest';
import {
  analyzePromiseAll,
  analyzeAsyncFlow,
  detectRaceConditions,
  RiskLevel
} from '#layer-a/extractors/metadata/temporal-connections/analyzers/async-flow-analyzer.js';

describe('extractors/metadata/temporal-connections/analyzers/async-flow-analyzer.js', () => {
  it('flags Promise.all without catch as medium/high risk', () => {
    const out = analyzePromiseAll({ parallelCalls: 2 }, 'await Promise.all([a(), b()]);');
    expect([RiskLevel.MEDIUM, RiskLevel.HIGH]).toContain(out.riskLevel);
    expect(out.concerns.length).toBeGreaterThan(0);
  });

  it('aggregates async analyses and returns recommendations', () => {
    const patterns = {
      parallelOperations: [{ type: 'Promise.all', parallelCalls: 3 }],
      sequentialOperations: [{ type: 'sequential-awaits', count: 4 }]
    };
    const out = analyzeAsyncFlow(patterns, 'await Promise.all([a(), b(), c()]);');
    expect(out).toHaveProperty('overallRisk');
    expect(out.summary.totalPatterns).toBeGreaterThan(0);
    expect(Array.isArray(out.allRecommendations)).toBe(true);
  });

  it('detects lifecycle parallel conflicts across atoms in same phase', () => {
    const races = detectRaceConditions([
      {
        id: 'a1',
        temporal: {
          lifecycleHooks: [{ phase: 'mount' }],
          asyncPatterns: { parallelOperations: [{ type: 'Promise.all', parallelCalls: 2 }] }
        }
      },
      {
        id: 'a2',
        temporal: {
          lifecycleHooks: [{ phase: 'mount' }],
          asyncPatterns: { parallelOperations: [{ type: 'Promise.all', parallelCalls: 2 }] }
        }
      }
    ]);
    expect(races.length).toBeGreaterThan(0);
  });
});

