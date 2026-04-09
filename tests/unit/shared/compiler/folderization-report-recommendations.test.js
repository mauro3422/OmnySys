import { describe, expect, it } from 'vitest';

import {
  buildEmptyRecommendation,
  buildFolderizationRecommendation
} from '../../../../src/shared/compiler/folderization-report/recommendations.js';

describe('folderization-report recommendations', () => {
  it('prefers split_large_file when no folderization candidate is available', () => {
    const recommendation = buildEmptyRecommendation();

    expect(recommendation.strategy).toBe('split_large_file');
    expect(recommendation.message).toContain('No folderization candidate available');
    expect(recommendation.action).toContain('split_large_file');
  });

  it('keeps folderization when a candidate exists', () => {
    const recommendation = buildFolderizationRecommendation({
      decision: 'review',
      candidate: {
        familyRoot: 'compiler-health-dashboard',
        directory: 'src/shared/compiler',
        recommendedFolder: 'src/shared/compiler/compiler-health-dashboard',
        barrelFile: { path: 'src/shared/compiler/compiler-health-dashboard/index.js' },
        fileCount: 3
      },
      migrationPlan: null,
      existingFolderizedFamily: null
    });

    expect(recommendation.strategy).toBe('folderization');
    expect(recommendation.action).toContain('folder');
  });
});
