import { describe, expect, it } from 'vitest';
import {
  buildImpactWavePropagationPlan,
  buildSemanticCoveragePropagationPlan,
  buildPolicyDriftPropagationPlan,
  buildTopologyRegressionPropagationPlan,
  buildPropagationPlan,
  buildPropagationCacheKey,
  clearPropagationPlanCache,
  getPropagationPlanCacheEntry,
  setPropagationPlanCacheEntry,
  summarizePropagationPlan
} from '../../../../src/shared/compiler/propagation-engine.js';

describe('propagation-engine', () => {
  it('builds a folderization propagation plan with connected systems', () => {
    const plan = buildPropagationPlan({
      changeType: 'folderization',
      decision: 'approve',
      moveTargetCount: 3,
      impactedFileCount: 4,
      rewriteCount: 5,
      renameTargetCount: 2,
      validationTargetCount: 6,
      hasCrossFamilyPropagation: true,
      topImpactedFiles: [{ filePath: 'src/a.js' }],
      topCandidates: [{ familyRoot: 'a' }],
      candidateCount: 1,
      flatFamilies: 2,
      mixedFamilies: 1,
      alreadyFolderizedFamilies: 5,
      guidance: 'Reuse the closest family',
      recommendationStrategy: 'folderization'
    });

    expect(plan.changeType).toBe('folderization');
    expect(plan.mode).toBe('move_and_rewrite');
    expect(plan.connectedSystems.map((item) => item.name)).toEqual(expect.arrayContaining([
      'folderization',
      'rename_folderized_family',
      'technical_debt_report',
      'status_panel',
      'health_snapshot',
      'compiler_explainability',
      'cache_policy',
      'watcher',
      'drift_assessment'
    ]));
  });

  it('builds an impact-wave propagation plan with watcher-connected systems', () => {
    const plan = buildImpactWavePropagationPlan({
      severity: 'high',
      scopePath: 'src/core/file-watcher/guards/impact-wave',
      focusPath: 'src/core/file-watcher/guards/impact-wave/impact-wave-core.js',
      impactedFileCount: 4,
      rewriteCount: 2
    });

    expect(plan.changeType).toBe('impact_wave');
    expect(plan.mode).toBe('alert_and_review');
    expect(plan.connectedSystems.map((item) => item.name)).toEqual(expect.arrayContaining([
      'impact_wave_guard',
      'watcher',
      'export_validation',
      'technical_debt_report',
      'status_panel',
      'health_snapshot',
      'compiler_explainability',
      'cache_policy',
      'drift_assessment'
    ]));
  });

  it('builds a topology-regression propagation plan with semantic-connected systems', () => {
    const plan = buildTopologyRegressionPropagationPlan({
      severity: 'high',
      scopePath: 'src/core/file-watcher/guards/topology-regression',
      focusPath: 'src/core/file-watcher/guards/topology-regression-reporting.js',
      previousSignal: 24,
      currentSignal: 0,
      ratio: 0,
      regressedAtomCount: 3
    });

    expect(plan.changeType).toBe('topology_regression');
    expect(plan.mode).toBe('alert_and_review');
    expect(plan.connectedSystems.map((item) => item.name)).toEqual(expect.arrayContaining([
      'topology_regression_guard',
      'watcher',
      'semantic_coverage',
      'semantic_persistence',
      'technical_debt_report',
      'status_panel',
      'health_snapshot',
      'compiler_explainability',
      'cache_policy',
      'drift_assessment'
    ]));
    expect(plan.rewriteCount).toBe(3);
    expect(plan.validationTargetCount).toBe(4);
  });

  it('builds a semantic-coverage propagation plan with metadata-connected systems', () => {
    const plan = buildSemanticCoveragePropagationPlan({
      severity: 'medium',
      scopePath: 'src/core/file-watcher/guards/semantic-coverage',
      focusPath: 'src/core/file-watcher/guards/semantic-coverage/reporting.js',
      gapCount: 2,
      sharesStateRelations: 1,
      networkCandidateCount: 3
    });

    expect(plan.changeType).toBe('semantic_coverage');
    expect(plan.mode).toBe('alert_and_review');
    expect(plan.connectedSystems.map((item) => item.name)).toEqual(expect.arrayContaining([
      'semantic_coverage_guard',
      'watcher',
      'semantic_persistence',
      'technical_debt_report',
      'status_panel',
      'health_snapshot',
      'compiler_explainability',
      'cache_policy',
      'drift_assessment'
    ]));
    expect(plan.rewriteCount).toBe(2);
    expect(plan.validationTargetCount).toBe(6);
  });

  it('builds a policy-drift propagation plan with governance-connected systems', () => {
    const plan = buildPolicyDriftPropagationPlan({
      severity: 'high',
      scopePath: 'src/core/file-watcher/guards/compiler-policy-conformance-guard.js',
      focusPath: 'src/core/file-watcher/guards/compiler-policy-conformance-guard.js',
      findingCount: 3,
      ruleCount: 2,
      policyAreaCount: 1
    });

    expect(plan.changeType).toBe('policy_drift');
    expect(plan.mode).toBe('alert_and_review');
    expect(plan.connectedSystems.map((item) => item.name)).toEqual(expect.arrayContaining([
      'compiler_policy_conformance_guard',
      'watcher',
      'technical_debt_report',
      'status_panel',
      'health_snapshot',
      'compiler_explainability',
      'cache_policy',
      'drift_assessment',
      'semantic_persistence'
    ]));
    expect(plan.rewriteCount).toBe(3);
    expect(plan.validationTargetCount).toBe(6);
  });

  it('summarizes propagation plans for status surfaces', () => {
    const summary = summarizePropagationPlan({
      changeType: 'folderization',
      decision: 'review',
      mode: 'review',
      moveTargetCount: 2,
      impactedFileCount: 3,
      rewriteCount: 4,
      connectedSystems: [{ name: 'folderization' }, { name: 'status_panel' }]
    });

    expect(summary).toMatchObject({
      changeType: 'folderization',
      decision: 'review',
      mode: 'review',
      moveTargetCount: 2,
      impactedFileCount: 3,
      rewriteCount: 4
    });
    expect(summary.connectedSystems).toHaveLength(2);
  });

  it('stores and reuses cached propagation plans', () => {
    clearPropagationPlanCache();
    const cacheKey = buildPropagationCacheKey({
      changeType: 'folderization',
      decision: 'review',
      moveTargetCount: 2,
      impactedFileCount: 3,
      rewriteCount: 4,
      connectedSystems: [{ name: 'folderization' }]
    });
    const plan = buildPropagationPlan({
      changeType: 'folderization',
      decision: 'review',
      moveTargetCount: 2,
      impactedFileCount: 3,
      rewriteCount: 4,
      cacheKey
    });

    const entry = setPropagationPlanCacheEntry(cacheKey, plan);
    const cached = getPropagationPlanCacheEntry(cacheKey);

    expect(entry.cacheKey).toBe(cacheKey);
    expect(cached.plan).toMatchObject({
      changeType: 'folderization',
      decision: 'review',
      moveTargetCount: 2,
      impactedFileCount: 3,
      rewriteCount: 4,
      cacheKey
    });
  });
});
