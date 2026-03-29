import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    buildCompilerReadinessStatus: vi.fn(),
    getMcpSessionSummary: vi.fn(),
    isMutationBatchActive: vi.fn()
  };
});

vi.mock('../../../../../../src/shared/compiler/index.js', () => ({
  buildCompilerReadinessStatus: mocks.buildCompilerReadinessStatus,
  getMcpSessionSummary: mocks.getMcpSessionSummary
}));

vi.mock('../../../../../../src/layer-c-memory/mcp/core/shared/mutation-batch.js', () => ({
  isMutationBatchActive: mocks.isMutationBatchActive
}));

vi.mock('../../../../../../src/layer-c-memory/mcp/core/session-manager.js', () => ({
  sessionManager: {}
}));

import { shouldDeferChange, isServerIndexing } from '../../../../../../src/layer-c-memory/mcp/core/hot-reload-manager/change-flow-deferred.js';

describe('change-flow-deferred', () => {
  beforeEach(() => {
    mocks.buildCompilerReadinessStatus.mockReset();
    mocks.getMcpSessionSummary.mockReset();
    mocks.isMutationBatchActive.mockReset();
  });

  it('defers when compiler readiness is not ready', () => {
    mocks.getMcpSessionSummary.mockReturnValue({
      runtimeSessions: 2,
      totalPersistentActive: 2,
      clientsWithDuplicates: 0,
      actionableDuplicateClients: 0,
      toleratedDuplicateClients: 0,
      sessionCountDrift: false
    });
    mocks.buildCompilerReadinessStatus.mockReturnValue({ ready: false });
    mocks.isMutationBatchActive.mockReturnValue(false);

    expect(shouldDeferChange({
      sessions: new Map([['a', {}]]),
      metadata: { phase2PendingFiles: 0, societiesCount: 0 },
      orchestrator: { phase2Status: { inProgress: false, pendingFiles: 0 } }
    })).toBe(true);
    expect(mocks.getMcpSessionSummary).toHaveBeenCalledTimes(1);
    expect(mocks.buildCompilerReadinessStatus).toHaveBeenCalledTimes(1);
  });

  it('does not defer when readiness is ready and no blockers are active', () => {
    mocks.getMcpSessionSummary.mockReturnValue({
      runtimeSessions: 1,
      totalPersistentActive: 1,
      clientsWithDuplicates: 0,
      actionableDuplicateClients: 0,
      toleratedDuplicateClients: 0,
      sessionCountDrift: false
    });
    mocks.buildCompilerReadinessStatus.mockReturnValue({ ready: true });
    mocks.isMutationBatchActive.mockReturnValue(false);

    expect(shouldDeferChange({
      sessions: new Map([['a', {}]]),
      metadata: { phase2PendingFiles: 0, societiesCount: 0 },
      orchestrator: { phase2Status: { inProgress: false, pendingFiles: 0 } }
    })).toBe(false);
  });

  it('defers when the server is indexing even if readiness is ready', () => {
    mocks.getMcpSessionSummary.mockReturnValue({
      runtimeSessions: 1,
      totalPersistentActive: 1,
      clientsWithDuplicates: 0,
      actionableDuplicateClients: 0,
      toleratedDuplicateClients: 0,
      sessionCountDrift: false
    });
    mocks.buildCompilerReadinessStatus.mockReturnValue({ ready: true });
    mocks.isMutationBatchActive.mockReturnValue(false);

    expect(shouldDeferChange({
      isIndexing: true,
      sessions: new Map(),
      metadata: { phase2PendingFiles: 0, societiesCount: 0 },
      orchestrator: { phase2Status: { inProgress: false, pendingFiles: 0 } }
    })).toBe(true);
    expect(isServerIndexing({ isIndexing: true })).toBe(true);
  });
});
