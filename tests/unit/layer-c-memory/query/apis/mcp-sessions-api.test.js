import { describe, expect, it, vi } from 'vitest';
import { collectSessionDbSnapshot } from '../../../../../src/layer-c-memory/query/apis/mcp-sessions-api.js';

function createDbMock() {
  return {
    prepare: vi.fn((sql) => {
      if (sql.includes('COUNT(*) AS count FROM mcp_sessions WHERE is_active = 1 AND updated_at >= ?')) {
        return { get: vi.fn(() => ({ count: 2 })) };
      }
      if (sql.includes('COUNT(*) AS count FROM mcp_sessions WHERE updated_at >= ?')) {
        return { get: vi.fn(() => ({ count: 3 })) };
      }
      if (sql.includes('COUNT(DISTINCT client_id) AS count FROM mcp_sessions WHERE is_active = 1')) {
        return { get: vi.fn(() => ({ count: 2 })) };
      }
      if (sql.includes('COUNT(*) AS count FROM mcp_sessions WHERE is_active = 1')) {
        return { get: vi.fn(() => ({ count: 2 })) };
      }
      if (sql.includes('COUNT(*) AS count FROM mcp_sessions')) {
        return { get: vi.fn(() => ({ count: 4 })) };
      }
      if (sql.includes('GROUP BY COALESCE(transport_origin')) {
        return {
          all: vi.fn(() => ([
            { transport_origin: 'native_mcp', count: 3 },
            { transport_origin: 'stdio_bridge', count: 1 }
          ]))
        };
      }
      if (sql.includes('GROUP BY client_id')) {
        return {
          all: vi.fn(() => ([
            { client_id: 'claude', count: 2 }
          ]))
        };
      }
      if (sql.includes('ORDER BY updated_at DESC LIMIT 1')) {
        return { get: vi.fn(() => ({ updated_at: '2026-04-04T12:00:00.000Z' })) };
      }
      if (sql.includes('WHERE is_active = 1 ORDER BY updated_at DESC LIMIT 1')) {
        return { get: vi.fn(() => ({ updated_at: '2026-04-04T12:00:00.000Z' })) };
      }
      return { get: vi.fn(() => null), all: vi.fn(() => []) };
    })
  };
}

describe('collectSessionDbSnapshot', () => {
  it('includes transport origin counts in the session snapshot', () => {
    const snapshot = collectSessionDbSnapshot(createDbMock());

    expect(snapshot.transportOriginCounts).toEqual({
      native_mcp: 3,
      stdio_bridge: 1
    });
  });
});
