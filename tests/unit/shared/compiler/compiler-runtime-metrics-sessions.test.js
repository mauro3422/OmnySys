import { describe, expect, it } from 'vitest';

import { collectMcpSessionMetrics } from '../../../../src/shared/compiler/compiler-runtime-metrics-sessions.js';
import { buildCompilerReadinessStatus } from '../../../../src/shared/compiler/session-restart-lifecycle.js';

describe('compiler runtime session metrics', () => {
  it('does not mark session churn when persistent sessions are active and there are no duplicates', () => {
    const sessionManager = {
      getSessionPersistenceState: () => ({
        available: true,
        mode: 'sqlite',
        source: 'sqlite',
        reason: null
      }),
      getDedupStats: () => ({
        uniqueClients: 1,
        clientsWithDuplicates: 0,
        duplicateDetails: []
      }),
      getAllSessions: (activeOnly) => activeOnly
        ? [{ id: 'session-1', client_id: 'Cline', is_active: 1 }]
        : [{ id: 'session-1', client_id: 'Cline', is_active: 1 }]
    };

    const summary = collectMcpSessionMetrics(sessionManager, { runtimeSessionCount: 10 });

    expect(summary).toMatchObject({
      runtimeSessions: 10,
      totalPersistent: 1,
      totalPersistentActive: 1,
      uniqueClients: 1,
      clientsWithDuplicates: 0,
      sessionCountDrift: false,
      multiClientChurn: false
    });
  });

  it('treats the absence of persistent sessions as runtime drift', () => {
    const summary = collectMcpSessionMetrics({
      getSessionPersistenceState: () => ({
        available: true,
        mode: 'sqlite',
        source: 'sqlite',
        reason: null
      }),
      getDedupStats: () => ({
        uniqueClients: 0,
        clientsWithDuplicates: 0,
        duplicateDetails: []
      }),
      getAllSessions: () => []
    }, { runtimeSessionCount: 2 });

    expect(summary.sessionCountDrift).toBe(true);
    expect(summary.multiClientChurn).toBe(true);
  });
});

describe('compiler readiness status', () => {
  it('accepts an explicit session drift signal from the session summary', () => {
    const readiness = buildCompilerReadinessStatus({
      phase2PendingFiles: 0,
      societiesCount: 1,
      runtimeSessions: 10,
      persistentActive: 1,
      clientsWithDuplicates: 0,
      actionableDuplicateClients: 0,
      toleratedDuplicateClients: 0,
      sessionCountDrift: false
    });

    expect(readiness.ready).toBe(true);
    expect(readiness.checks.sessionCountsAligned).toBe(true);
    expect(readiness.warnings).toEqual([]);
  });
});
