import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  buildFolderizationNamingPlanFromRows: vi.fn(),
  buildFolderizationNamingReportFromRows: vi.fn()
}));

vi.mock('../../../../src/shared/compiler/directory-structure-folderization-naming.js', () => ({
  buildFolderizationNamingPlanFromRows: mocks.buildFolderizationNamingPlanFromRows,
  buildFolderizationNamingReportFromRows: mocks.buildFolderizationNamingReportFromRows
}));

import { buildFolderizationNormalizationPlanFromRows, buildFolderizationNormalizationPlanFromRepo } from '../../../../src/shared/compiler/folderization-normalizer.js';

describe('folderization normalizer', () => {
  it('builds a safe normalization plan from rows', () => {
    mocks.buildFolderizationNamingReportFromRows.mockReturnValue({
      familyCount: 4,
      renameTargetCount: 2,
      topFamilies: [{
        directory: 'src/shared/compiler',
        familyRoot: 'compiler-health-dashboard',
        renameTargetCount: 2
      }],
      patternSummary: {
        totalFamilies: 4,
        totalTargets: 2,
        patternCounts: { clean: 2 },
        topFamilyPatterns: [],
        topRecommendedStems: []
      }
    });
    mocks.buildFolderizationNamingPlanFromRows.mockReturnValue({
      familyRoot: 'compiler-health-dashboard',
      directory: 'src/shared/compiler',
      barrelFile: 'src/shared/compiler/index.js',
      renameTargets: [
        { from: 'src/shared/compiler/a.js', to: 'src/shared/compiler/a-normalized.js' },
        { from: 'src/shared/compiler/b.js', to: 'src/shared/compiler/b-normalized.js' }
      ]
    });

    const result = buildFolderizationNormalizationPlanFromRows(
      [],
      ['src/shared/compiler/compiler-health-dashboard.js'],
      { mode: 'plan' }
    );

    expect(result.success).toBe(true);
    expect(result.mode).toBe('plan');
    expect(result.candidatePath).toBe('src/shared/compiler/compiler-health-dashboard.js');
    expect(result.analysis.safety.level).toBe('safe');
    expect(result.analysis.recommendation.action).toBe('execute');
    expect(result.summary.recommendedAction).toBe('execute');
    expect(result.plan.renameTargets).toHaveLength(2);
  });

  it('returns a fallback payload when the repository is unavailable', () => {
    const result = buildFolderizationNormalizationPlanFromRepo(null, ['src/shared/compiler/compiler-health-dashboard.js']);

    expect(result.success).toBe(false);
    expect(result.summary.recommendedAction).toBe('noop');
    expect(result.analysis.safety.level).toBe('missing');
  });
});
