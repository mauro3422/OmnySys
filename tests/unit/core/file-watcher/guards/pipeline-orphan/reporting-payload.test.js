import { describe, expect, it } from 'vitest';

import { buildPipelineOrphanReportPayload } from '../../../../../../src/core/file-watcher/guards/pipeline-orphan/reporting-payload.js';

describe('pipeline-orphan reporting payload', () => {
  it('attaches propagation to orphaned pipeline findings', () => {
    const payload = buildPipelineOrphanReportPayload({
      disconnected: [
        { name: 'orphanA', filePath: 'src/a.js', complexity: 1 },
        { name: 'orphanB', filePath: 'src/b.js', complexity: 2 }
      ],
      deadCodeSummary: {
        flaggedDeadCode: 1,
        suspiciousDeadCandidates: 2,
        hasCoverageGap: true
      },
      fileImporterCount: 0,
      severity: 'medium'
    });

    expect(payload.propagation).toMatchObject({
      changeType: 'pipeline_orphan',
      decision: 'review',
      cacheHit: false
    });
    expect(payload.context.propagation.connectedSystems).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'pipeline_orphan_guard' }),
      expect.objectContaining({ name: 'watcher' })
    ]));
  });
});
