import { describe, expect, it } from 'vitest';
import {
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
