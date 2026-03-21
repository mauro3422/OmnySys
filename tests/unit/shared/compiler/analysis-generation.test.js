import { describe, expect, it } from 'vitest';

import {
  buildAnalysisGenerationSnapshot,
  compareAnalysisGenerations,
  summarizeAnalysisGeneration,
  buildDerivedFeatureRegistry,
  summarizeDerivedFeatureRegistry,
  findDerivedFeatureDefinition
} from '../../../../src/shared/compiler/index.js';
import { buildCompilerContractLayer } from '../../../../src/shared/compiler/compiler-contract-layer.js';

describe('derived feature registry', () => {
  it('exposes canonical derived feature groups', () => {
    const registry = buildDerivedFeatureRegistry();

    expect(registry.summary.total).toBeGreaterThanOrEqual(7);
    expect(registry.summary.byFamily.semantic).toBeGreaterThan(0);
    expect(findDerivedFeatureDefinition('purpose_type')).toMatchObject({
      key: 'purpose_type',
      family: 'semantic'
    });
  });

  it('summarizes the feature registry consistently', () => {
    const summary = summarizeDerivedFeatureRegistry();

    expect(summary.canonicalCount).toBeGreaterThanOrEqual(7);
    expect(summary.canonicalKeys).toContain('generation_epoch');
    expect(summary.bySourceSurface.atoms).toBeGreaterThan(0);
  });
});

describe('analysis generation snapshots', () => {
  it('normalizes counts and starts with initial drift', () => {
    const snapshot = buildAnalysisGenerationSnapshot({
      projectPath: '/tmp/project',
      source: 'test',
      phase: 'startup',
      totalFiles: '12',
      atomCount: 7,
      relationCount: 3,
      semanticConnectionCount: 2
    });

    expect(snapshot.generationId).toMatch(/^analysis:startup:/);
    expect(snapshot.counts.files).toBe(12);
    expect(snapshot.drift.status).toBe('initial');
  });

  it('detects regression between generations', () => {
    const previous = buildAnalysisGenerationSnapshot({
      projectPath: '/tmp/project',
      source: 'test',
      phase: 'startup',
      totalFiles: 12,
      atomCount: 10,
      relationCount: 8,
      semanticConnectionCount: 4
    });
    const current = buildAnalysisGenerationSnapshot({
      projectPath: '/tmp/project',
      source: 'test',
      phase: 'startup',
      totalFiles: 10,
      atomCount: 8,
      relationCount: 7,
      semanticConnectionCount: 4,
      previousGeneration: previous
    });

    expect(compareAnalysisGenerations(previous, current).status).toBe('regressed');
    expect(summarizeAnalysisGeneration(current).healthy).toBe(false);
  });
});

describe('compiler contract layer', () => {
  it('includes derived feature governance data', () => {
    const layer = buildCompilerContractLayer({
      tableCounts: {
        files: 1,
        atoms: 1,
        atom_relations: 1,
        risk_assessments: 1
      }
    });

    expect(layer.summary.derivedFeatureCount).toBeGreaterThan(0);
    expect(layer.derivedFeatures.total).toBeGreaterThan(0);
  });
});
