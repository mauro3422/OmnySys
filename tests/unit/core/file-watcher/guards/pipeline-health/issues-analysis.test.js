import { describe, expect, it } from 'vitest';

import {
  buildShadowVolumeMediumIssue,
  buildSlowAnalysisIssue,
  buildZeroAtomsIssue
} from '../../../../../../src/core/file-watcher/guards/pipeline-health/issues-analysis.js';

describe('pipeline-health issues', () => {
  it('attaches propagation to shadow volume issues', () => {
    const issue = buildShadowVolumeMediumIssue({
      shadowVolume: 37,
      metadata: { filePath: 'src/shared/compiler/index.js', unindexedLines: [12, 14] }
    });

    expect(issue.context.propagation).toMatchObject({
      changeType: 'pipeline_health',
      decision: 'review',
      cacheHit: false
    });
    expect(issue.context.propagation.connectedSystems).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'pipeline_health_guard' }),
      expect.objectContaining({ name: 'watcher' })
    ]));
  });

  it('attaches propagation to zero atoms issues', () => {
    const issue = buildZeroAtomsIssue({
      parsedLines: 180,
      metadata: { filePath: 'src/core/file-watcher/guards/pipeline-health/issues-analysis.js', fileType: 'js' }
    });

    expect(issue.context.propagation).toMatchObject({
      changeType: 'pipeline_health',
      decision: 'review',
      cacheHit: false
    });
  });

  it('attaches propagation to slow analysis issues', () => {
    const issue = buildSlowAnalysisIssue({
      analysisTime: 6200,
      parsedLines: 120,
      metadata: { filePath: 'src/core/file-watcher/guards/pipeline-health/issues-analysis.js' }
    });

    expect(issue.context.propagation).toMatchObject({
      changeType: 'pipeline_health',
      decision: 'review',
      cacheHit: false
    });
  });
});
