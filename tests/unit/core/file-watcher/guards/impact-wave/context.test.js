import { describe, expect, it } from 'vitest';

import { buildImpactWaveIssueContext } from '../../../../../../src/core/file-watcher/guards/impact-wave/context.js';

describe('impact-wave context', () => {
  it('preserves propagation summaries in the persisted issue context', () => {
    const context = buildImpactWaveIssueContext({
      severity: 'medium',
      score: 42,
      focusedAtoms: [{ name: 'changedAtom' }],
      focusedAtomIds: ['atom-1'],
      relatedFiles: new Set(['src/core/file-watcher/guards/impact-wave/reporting.js']),
      brokenImports: [{ import: 'src/shared/compiler/index.js' }],
      brokenCallers: [],
      propagation: {
        changeType: 'impact_wave',
        decision: 'review',
        cacheKey: 'impact-wave-cache-key',
        cacheHit: true,
        connectedSystems: [{ name: 'watcher' }, { name: 'status_panel' }]
      },
      maxRelatedFiles: 5,
      maxBrokenSamples: 5
    });

    expect(context.propagation).toMatchObject({
      changeType: 'impact_wave',
      cacheKey: 'impact-wave-cache-key',
      cacheHit: true
    });
    expect(context.propagation.connectedSystems).toHaveLength(2);
  });
});
