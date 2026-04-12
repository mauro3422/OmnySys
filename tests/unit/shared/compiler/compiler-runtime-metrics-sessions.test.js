import { describe, expect, it } from 'vitest';

import { getRepository } from '../../../../src/layer-c-memory/storage/repository/index.js';
import { collectMcpSessionMetrics } from '../../../../src/shared/compiler/compiler-runtime-metrics-sessions.js';
import { buildCompilerReadinessStatus } from '../../../../src/shared/compiler/session-restart-lifecycle.js';

describe('compiler runtime session metrics', () => {
  it('prefers the SQLite session snapshot when the in-memory session manager is stale', () => {
    const sessionDb = getRepository('C:/Dev/OmnySystem').db;
    expect(sessionDb).toBeTruthy();

    const summary = collectMcpSessionMetrics({
      getSessionPersistenceState: () => ({
        available: false,
        mode: 'memory-fallback',
        source: 'memory',
        reason: 'session connection not initialized'
      }),
      getDedupStats: () => ({
        uniqueClients: 0,
        clientsWithDuplicates: 0,
        duplicateDetails: []
      }),
      getAllSessions: () => []
    }, {
      runtimeSessionCount: 2,
      sessionDb
    });

    expect(summary.totalPersistent).toBeGreaterThan(0);
    expect(summary.totalPersistentActive).toBeGreaterThan(0);
    expect(summary.clientSyncState).not.toBe('blocked');
    expect(summary.clientSyncHealthy).toBe(true);
  });

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

  it('marks client sync as blocked when persistence is unavailable while sessions are active', () => {
    const summary = collectMcpSessionMetrics({
      getSessionPersistenceState: () => ({
        available: false,
        mode: 'memory-fallback',
        source: 'memory',
        reason: 'session connection not initialized'
      }),
      getDedupStats: () => ({
        uniqueClients: 1,
        clientsWithDuplicates: 0,
        duplicateDetails: []
      }),
      getAllSessions: () => [{ id: 'session-1', client_id: 'Cline', is_active: 1 }]
    }, { runtimeSessionCount: 1 });

    expect(summary.clientSyncState).toBe('blocked');
    expect(summary.clientSyncHealthy).toBe(false);
    expect(summary.summary).toContain('client sync=blocked');
  });

  it('treats fresh persisted history as reconciling while the live bridge is still attaching', () => {
    const now = new Date().toISOString();
    const sessionDb = {
      prepare: (query) => {
        if (query.includes('COUNT(*) AS count FROM mcp_sessions WHERE is_active = 1 AND updated_at >= ?')) {
          return { get: () => ({ count: 1 }) };
        }

        if (query.includes('COUNT(*) AS count FROM mcp_sessions WHERE updated_at >= ?')) {
          return { get: () => ({ count: 1 }) };
        }

        if (query.includes('COUNT(DISTINCT client_id) AS count FROM mcp_sessions WHERE is_active = 1')) {
          return { get: () => ({ count: 1 }) };
        }

        if (query.includes('COUNT(*) AS count FROM mcp_sessions WHERE is_active = 1')) {
          return { get: () => ({ count: 1 }) };
        }

        if (query.includes('COUNT(*) AS count FROM mcp_sessions')) {
          return { get: () => ({ count: 1 }) };
        }

        if (query.includes('WHERE is_active = 1\n      ORDER BY updated_at DESC')) {
          return { get: () => null };
        }

        if (query.includes('ORDER BY updated_at DESC\n      LIMIT 1')) {
          return { get: () => ({ updated_at: now }) };
        }

        if (query.includes('GROUP BY client_id')) {
          return { all: () => [] };
        }

        if (query.includes('GROUP BY COALESCE(json_extract(session_metadata_json, \'$.transport_session_state\'), \'unknown\')')) {
          return { all: () => ([{ transport_session_state: 'fresh', count: 1 }]) };
        }

        if (query.includes('GROUP BY COALESCE(json_extract(session_metadata_json, \'$.transport_request_phase\'), \'unknown\')')) {
          return { all: () => ([{ transport_request_phase: 'http-initialize', count: 1 }]) };
        }

        if (query.includes('GROUP BY COALESCE(json_extract(session_metadata_json, \'$.transport_client_route_id\'), \'unknown\')')) {
          return { all: () => ([] ) };
        }

        if (query.includes('GROUP BY COALESCE(json_extract(session_metadata_json, \'$.transport_handshake_signature\'), \'unknown\')')) {
          return { all: () => ([] ) };
        }

        if (query.includes('COALESCE(json_extract(session_metadata_json, \'$.transport_session_header_present\'), 0) = 1')) {
          return { get: () => ({ count: 0 }) };
        }

        if (query.includes('COALESCE(json_extract(session_metadata_json, \'$.transport_session_header_present\'), 0) = 0')) {
          return { get: () => ({ count: 0 }) };
        }

        throw new Error(`Unexpected SQL query in stub: ${query}`);
      }
    };

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
    }, {
      runtimeSessionCount: 1,
      sessionDb
    });

    expect(summary.clientSyncState).toBe('blocked');
    expect(summary.clientSyncHealthy).toBe(false);
    expect(summary.summary).toContain('client sync=blocked');
  });

  it('marks transport provenance as watchful when direct HTTP and stdio bridge sessions are mixed', () => {
    const now = new Date().toISOString();
    const sessionDb = {
      prepare: (query) => {
        if (query.includes('COUNT(*) AS count FROM mcp_sessions WHERE is_active = 1 AND updated_at >= ?')) {
          return { get: () => ({ count: 2 }) };
        }

        if (query.includes('COUNT(*) AS count FROM mcp_sessions WHERE updated_at >= ?')) {
          return { get: () => ({ count: 2 }) };
        }

        if (query.includes('COUNT(DISTINCT client_id) AS count FROM mcp_sessions WHERE is_active = 1')) {
          return { get: () => ({ count: 2 }) };
        }

        if (query.includes('COUNT(*) AS count FROM mcp_sessions WHERE is_active = 1')) {
          return { get: () => ({ count: 2 }) };
        }

        if (query.includes('COUNT(*) AS count FROM mcp_sessions')) {
          return { get: () => ({ count: 2 }) };
        }

        if (query.includes('GROUP BY COALESCE(transport_origin')) {
          return {
            all: () => ([
              { transport_origin: 'http_direct', count: 1 },
              { transport_origin: 'stdio_bridge', count: 1 }
            ])
          };
        }

        if (query.includes('GROUP BY client_id')) {
          return { all: () => [] };
        }

        if (query.includes('GROUP BY COALESCE(json_extract(session_metadata_json, \'$.transport_session_state\'), \'unknown\')')) {
          return { all: () => ([{ transport_session_state: 'fresh', count: 2 }]) };
        }

        if (query.includes('GROUP BY COALESCE(json_extract(session_metadata_json, \'$.transport_request_phase\'), \'unknown\')')) {
          return { all: () => ([{ transport_request_phase: 'http-initialize', count: 2 }]) };
        }

        if (query.includes('GROUP BY COALESCE(json_extract(session_metadata_json, \'$.transport_client_route_id\'), \'unknown\')')) {
          return { all: () => ([] ) };
        }

        if (query.includes('GROUP BY COALESCE(json_extract(session_metadata_json, \'$.transport_handshake_signature\'), \'unknown\')')) {
          return { all: () => ([] ) };
        }

        if (query.includes('COALESCE(json_extract(session_metadata_json, \'$.transport_session_header_present\'), 0) = 1')) {
          return { get: () => ({ count: 0 }) };
        }

        if (query.includes('COALESCE(json_extract(session_metadata_json, \'$.transport_session_header_present\'), 0) = 0')) {
          return { get: () => ({ count: 2 }) };
        }

        if (query.includes('ORDER BY updated_at DESC\n      LIMIT 1')) {
          return { get: () => ({ updated_at: now }) };
        }

        if (query.includes('WHERE is_active = 1\n      ORDER BY updated_at DESC')) {
          return { get: () => ({ updated_at: now }) };
        }

        throw new Error(`Unexpected SQL query in stub: ${query}`);
      }
    };

    const summary = collectMcpSessionMetrics({
      getSessionPersistenceState: () => ({
        available: true,
        mode: 'sqlite',
        source: 'sqlite',
        reason: null
      }),
      getDedupStats: () => ({
        uniqueClients: 2,
        clientsWithDuplicates: 0,
        duplicateDetails: []
      }),
      getAllSessions: () => [
        { id: 'session-1', client_id: 'opencode', is_active: 1 },
        { id: 'session-2', client_id: 'codex', is_active: 1 }
      ]
    }, {
      runtimeSessionCount: 2,
      sessionDb
    });

    expect(summary.transportProvenanceState).toBe('watchful');
    expect(summary.transportProvenanceReason).toContain('HTTP-direct and stdio-bridge');
    expect(summary.summary).toContain('transport=watchful');
  });

  it('raises explicit transport alerts for mixed provenance, churn, replay risk and missing origin metadata', () => {
    const now = new Date().toISOString();
    const sessionDb = {
      prepare: (query) => {
        if (query.includes('COUNT(*) AS count FROM mcp_sessions WHERE is_active = 1 AND updated_at >= ?')) {
          return { get: () => ({ count: 3 }) };
        }

        if (query.includes('COUNT(*) AS count FROM mcp_sessions WHERE updated_at >= ?')) {
          return { get: () => ({ count: 5 }) };
        }

        if (query.includes('COUNT(DISTINCT client_id) AS count FROM mcp_sessions WHERE is_active = 1')) {
          return { get: () => ({ count: 3 }) };
        }

        if (query.includes('COUNT(*) AS count FROM mcp_sessions WHERE is_active = 1')) {
          return { get: () => ({ count: 3 }) };
        }

        if (query.includes('COUNT(*) AS count FROM mcp_sessions')) {
          return { get: () => ({ count: 5 }) };
        }

        if (query.includes('GROUP BY COALESCE(transport_origin')) {
          return {
            all: () => ([
              { transport_origin: 'http_direct', count: 1 },
              { transport_origin: 'stdio_bridge', count: 3 },
              { transport_origin: 'unknown', count: 1 }
            ])
          };
        }

        if (query.includes('GROUP BY COALESCE(json_extract(session_metadata_json, \'$.transport_session_state\'), \'unknown\')')) {
          return {
            all: () => ([
              { transport_session_state: 'fresh', count: 5 }
            ])
          };
        }

        if (query.includes('GROUP BY COALESCE(json_extract(session_metadata_json, \'$.transport_request_phase\'), \'unknown\')')) {
          return {
            all: () => ([
              { transport_request_phase: 'http-initialize', count: 5 }
            ])
          };
        }

        if (query.includes('GROUP BY COALESCE(json_extract(session_metadata_json, \'$.transport_client_route_id\'), \'unknown\')')) {
          return {
            all: () => ([
              { transport_client_route_id: 'cline::26300', count: 3 },
              { transport_client_route_id: 'opencode', count: 2 }
            ])
          };
        }

        if (query.includes('GROUP BY COALESCE(json_extract(session_metadata_json, \'$.transport_handshake_signature\'), \'unknown\')')) {
          return {
            all: () => ([
              { transport_handshake_signature: 'stdio_bridge|cline::26300|http-initialize|fresh|missing', count: 3 },
              { transport_handshake_signature: 'http_direct|opencode|http-initialize|fresh|missing', count: 2 }
            ])
          };
        }

        if (query.includes('COALESCE(json_extract(session_metadata_json, \'$.transport_session_header_present\'), 0) = 1')) {
          return { get: () => ({ count: 0 }) };
        }

        if (query.includes('COALESCE(json_extract(session_metadata_json, \'$.transport_session_header_present\'), 0) = 0')) {
          return { get: () => ({ count: 5 }) };
        }

        if (query.includes('GROUP BY client_id')) {
          return {
            all: () => ([
              { client_id: 'cline::26300', count: 3 },
              { client_id: 'opencode', count: 2 }
            ])
          };
        }

        if (query.includes('ORDER BY updated_at DESC\n      LIMIT 1')) {
          return { get: () => ({ updated_at: now }) };
        }

        if (query.includes('WHERE is_active = 1\n      ORDER BY updated_at DESC')) {
          return { get: () => ({ updated_at: now }) };
        }

        throw new Error(`Unexpected SQL query in stub: ${query}`);
      }
    };

    const summary = collectMcpSessionMetrics({
      getSessionPersistenceState: () => ({
        available: true,
        mode: 'sqlite',
        source: 'sqlite',
        reason: null
      }),
      getDedupStats: () => ({
        uniqueClients: 2,
        clientsWithDuplicates: 1,
        duplicateDetails: [
          { clientId: 'cline::26300', count: 3 }
        ]
      }),
      getAllSessions: () => [
        { id: 'session-1', client_id: 'cline::26300', is_active: 1 },
        { id: 'session-2', client_id: 'cline::26300', is_active: 1 },
        { id: 'session-3', client_id: 'opencode', is_active: 1 }
      ]
    }, {
      runtimeSessionCount: 5,
      sessionDb
    });

    expect(summary.transportAlertState).toBe('blocked');
    expect(summary.transportAlertCount).toBeGreaterThanOrEqual(4);
    expect(summary.transportAlerts.map((alert) => alert.code)).toEqual(expect.arrayContaining([
      'mixed_transport_provenance',
      'transport_origin_unknown',
      'session_churn_excessive',
      'stale_handshake_replay'
    ]));
    expect(summary.summary).toContain('alerts=blocked');
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

  it('blocks readiness when client sync is explicitly blocked', () => {
    const readiness = buildCompilerReadinessStatus({
      phase2PendingFiles: 0,
      societiesCount: 1,
      runtimeSessions: 1,
      persistentActive: 1,
      clientsWithDuplicates: 0,
      actionableDuplicateClients: 0,
      toleratedDuplicateClients: 0,
      sessionCountDrift: false,
      clientSyncState: 'blocked',
      clientSyncReason: 'client cache drift detected'
    });

    expect(readiness.ready).toBe(false);
    expect(readiness.checks.clientSyncHealthy).toBe(false);
    expect(readiness.warnings).toContain('client cache drift detected');
  });
});
