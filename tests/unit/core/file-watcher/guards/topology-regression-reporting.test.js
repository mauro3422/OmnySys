import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../../src/core/file-watcher/watcher-issue-persistence.js', () => ({
  persistWatcherIssue: vi.fn().mockResolvedValue(true)
}));

import { persistTopologyRegressionFinding } from '../../../../../src/core/file-watcher/guards/topology-regression-reporting.js';

describe('topology-regression reporting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persists and emits a propagation summary', async () => {
    const emitter = {
      emit: vi.fn()
    };

    const result = await persistTopologyRegressionFinding({
      rootPath: 'C:/Dev/OmnySystem',
      filePath: 'src/core/file-watcher/guards/topology-regression-reporting.js',
      severity: 'high',
      previousSignal: 12,
      currentSignal: 0,
      ratio: 0,
      regressedAtoms: [{ name: 'detectTopologyRegression' }],
      EventEmitterContext: emitter
    });

    expect(result.propagation).toMatchObject({
      changeType: 'topology_regression',
      decision: 'review',
      cacheHit: false
    });
    expect(result.propagation.connectedSystems).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'topology_regression_guard' }),
      expect.objectContaining({ name: 'watcher' })
    ]));
    expect(emitter.emit).toHaveBeenCalledWith(
      'arch:topology-regression',
      expect.objectContaining({
        propagation: expect.objectContaining({
          changeType: 'topology_regression'
        })
      })
    );
  });
});
