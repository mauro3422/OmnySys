import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../../../src/core/file-watcher/watcher-issue-persistence.js', () => ({
  persistWatcherIssue: vi.fn().mockResolvedValue(true)
}));

import { persistSemanticCoverageFinding } from '../../../../../../src/core/file-watcher/guards/semantic-coverage/reporting.js';

describe('semantic-coverage reporting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persists and emits a propagation summary', async () => {
    const emitter = {
      emit: vi.fn()
    };

    const result = await persistSemanticCoverageFinding({
      rootPath: 'C:/Dev/OmnySystem',
      filePath: 'src/core/file-watcher/guards/semantic-coverage/reporting.js',
      evidence: {
        severity: 'medium',
        gaps: [{ message: 'missing shared state extraction' }],
        networkCandidates: [{ filePath: 'src/shared/compiler/index.js' }],
        networkFlagged: true,
        sharedStateCandidates: [{ name: 'sharedStateCandidate', filePath: 'src/shared/compiler/index.js' }],
        sharesStateRelations: 1
      },
      EventEmitterContext: emitter
    });

    expect(result.propagation).toMatchObject({
      changeType: 'semantic_coverage',
      decision: 'review',
      cacheHit: false
    });
    expect(result.propagation.connectedSystems).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'semantic_coverage_guard' }),
      expect.objectContaining({ name: 'watcher' })
    ]));
    expect(emitter.emit).toHaveBeenCalledWith(
      'sem:coverage-gap',
      expect.objectContaining({
        propagation: expect.objectContaining({
          changeType: 'semantic_coverage'
        })
      })
    );
  });
});
