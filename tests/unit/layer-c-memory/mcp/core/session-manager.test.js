import { beforeEach, describe, expect, it, vi } from 'vitest';
import { connectionManager } from '../../../../../src/layer-c-memory/storage/database/connection.js';
import { isDedupFresh, SessionManager } from '../../../../../src/layer-c-memory/mcp/core/session-manager.js';

describe('SessionManager', () => {
  let manager;

  beforeEach(() => {
    manager = new SessionManager();
    manager.pendingSessions.clear();
    manager.activeSessions.clear();
  });

  it('prefers an active session over a pending reservation', () => {
    manager.pendingSessions.set('Claude', {
      id: 'pending-session',
      clientId: 'Claude',
      updatedAt: Date.now()
    });
    manager.findSessionByClientId = vi.fn(() => ({ id: 'active-session' }));

    const result = manager.reserveSession({ name: 'Claude' }, 'new-session');

    expect(manager.findSessionByClientId).toHaveBeenCalledWith('Claude');
    expect(result).toEqual({
      sessionId: 'active-session',
      reused: true,
      source: 'active'
    });
  });

  it('falls back to a fresh pending reservation when no active session exists', () => {
    manager.findSessionByClientId = vi.fn(() => null);

    const result = manager.reserveSession({ name: 'Claude' }, 'new-session');

    expect(result).toEqual({
      sessionId: 'new-session',
      reused: false,
      source: 'new'
    });
    expect(manager.pendingSessions.get('Claude')).toMatchObject({
      id: 'new-session',
      clientId: 'Claude'
    });
  });

  it('prefers client_id over name so canonical Codex sessions stay deduplicated', () => {
    manager.findSessionByClientId = vi.fn(() => null);

    const result = manager.reserveSession({
      name: 'codex-mcp-client',
      client_id: 'codex'
    }, 'new-session');

    expect(manager.findSessionByClientId).toHaveBeenCalledWith('codex');
    expect(result).toEqual({
      sessionId: 'new-session',
      reused: false,
      source: 'new'
    });
    expect(manager.pendingSessions.get('codex')).toMatchObject({
      id: 'new-session',
      clientId: 'codex'
    });
  });

  it('bypasses deduplication when a fresh recovery session is requested', () => {
    manager.findSessionByClientId = vi.fn(() => ({ id: 'active-session' }));

    const result = manager.reserveSession({
      name: 'codex-mcp-client',
      client_id: 'codex',
      force_fresh_session: true,
      bridge_recovery: true
    }, 'fresh-session');

    expect(manager.findSessionByClientId).not.toHaveBeenCalled();
    expect(result).toEqual({
      sessionId: 'fresh-session',
      reused: false,
      source: 'new'
    });
    expect(manager.pendingSessions.get('codex')).toMatchObject({
      id: 'fresh-session',
      clientId: 'codex'
    });
  });

  it('reuses a stale active session instead of creating a new bucket', () => {
    const staleSession = {
      id: 'stale-session',
      updated_at: new Date(Date.now() - (10 * 60 * 1000)).toISOString()
    };
    manager.findLatestSessionByClientId = vi.fn(() => staleSession);

    const result = manager.reserveSession({ name: 'Claude' }, 'new-session');

    expect(result).toEqual({
      sessionId: 'stale-session',
      reused: true,
      source: 'active'
    });
    expect(manager.pendingSessions.has('Claude')).toBe(false);
  });

  it('reuses the existing active session id when saveSession deduplicates', () => {
    manager.ensureInitialized = vi.fn(() => true);
    manager.releasePendingSession = vi.fn();
    manager.findLatestSessionByClientId = vi.fn(() => ({ id: 'active-session' }));
    manager.getSession = vi.fn(() => null);
    manager.updateActivity = vi.fn();
    manager.deleteSession = vi.fn();
    manager.deduplicateSessions = vi.fn(() => 1);
    manager.statements = {
      upsert: {
        run: vi.fn()
      }
    };

    const result = manager.saveSession('pending-session', { name: 'Claude' }, { source: 'test' });

    expect(result).toBe('active-session');
    expect(manager.findLatestSessionByClientId).toHaveBeenCalledWith('Claude');
    expect(manager.updateActivity).toHaveBeenCalledWith('active-session');
    expect(manager.deleteSession).toHaveBeenCalledWith('pending-session');
    expect(manager.deduplicateSessions).toHaveBeenCalledWith('Claude', 'active-session');
    expect(manager.statements.upsert.run).not.toHaveBeenCalled();
  });

  it('deduplicates stale sessions by latest client session even when the session is old', () => {
    manager.ensureInitialized = vi.fn(() => true);
    manager.releasePendingSession = vi.fn();
    manager.findLatestSessionByClientId = vi.fn(() => ({
      id: 'stale-session',
      updated_at: new Date(Date.now() - (10 * 60 * 1000)).toISOString()
    }));
    manager.getSession = vi.fn(() => null);
    manager.updateActivity = vi.fn();
    manager.deleteSession = vi.fn();
    manager.deduplicateSessions = vi.fn(() => 1);
    manager.statements = {
      upsert: {
        run: vi.fn()
      }
    };

    const result = manager.saveSession('fresh-session', { name: 'Claude' }, { source: 'test' });

    expect(result).toBe('stale-session');
    expect(manager.findLatestSessionByClientId).toHaveBeenCalledWith('Claude');
    expect(manager.updateActivity).toHaveBeenCalledWith('stale-session');
    expect(manager.deleteSession).toHaveBeenCalledWith('fresh-session');
    expect(manager.deduplicateSessions).toHaveBeenCalledWith('Claude', 'stale-session');
    expect(manager.statements.upsert.run).not.toHaveBeenCalled();
  });

  it('stores a fresh recovery session without reusing an existing client session', () => {
    manager.ensureInitialized = vi.fn(() => true);
    manager.releasePendingSession = vi.fn();
    manager.findLatestSessionByClientId = vi.fn(() => ({ id: 'active-session' }));
    manager.getSession = vi.fn(() => null);
    manager.updateActivity = vi.fn();
    manager.deleteSession = vi.fn();
    manager.deduplicateSessions = vi.fn(() => 1);
    manager.statements = {
      upsert: {
        run: vi.fn()
      }
    };

    const result = manager.saveSession(
      'fresh-session',
      {
        name: 'Claude',
        client_id: 'codex',
        force_fresh_session: true,
        bridge_recovery: true
      },
      { source: 'test' }
    );

    expect(result).toBe('fresh-session');
    expect(manager.findLatestSessionByClientId).not.toHaveBeenCalled();
    expect(manager.updateActivity).not.toHaveBeenCalled();
    expect(manager.deleteSession).not.toHaveBeenCalled();
    expect(manager.deduplicateSessions).toHaveBeenCalledWith('codex', 'fresh-session');
    expect(manager.statements.upsert.run).not.toHaveBeenCalled();
    expect(manager.activeSessions.get('codex')).toMatchObject({
      id: 'fresh-session',
      client_id: 'codex',
      transport_origin: 'stdio_bridge'
    });
  });

  it('auto-heals duplicate active buckets by keeping the newest session per client', () => {
    const originalDb = connectionManager.db;
    const isInitializedSpy = vi.spyOn(connectionManager, 'isInitialized').mockReturnValue(true);
    connectionManager.db = { open: true };

    const now = Date.now();
    const older = {
      id: 'older-session',
      client_id: 'Claude',
      updated_at: new Date(now - 10_000).toISOString()
    };
    const newer = {
      id: 'newer-session',
      client_id: 'Claude',
      updated_at: new Date(now).toISOString()
    };
    const codexSession = {
      id: 'codex-session',
      client_id: 'codex',
      updated_at: new Date(now).toISOString()
    };

    manager.statements = {
      getAllActive: {
        all: vi.fn(() => [older, newer, codexSession])
      },
      deleteByClientId: {
        run: vi.fn(() => ({ changes: 1 }))
      }
    };

    try {
      const report = manager.reconcileActiveSessions({ reason: 'unit-test' });

      expect(report).toMatchObject({
        repairedClients: 1,
        removedSessions: 1
      });
      expect(manager.statements.deleteByClientId.run).toHaveBeenCalledWith('Claude', 'newer-session');
      expect(manager.activeSessions.get('Claude')).toMatchObject({ id: 'newer-session' });
      expect(manager.activeSessions.get('codex')).toBeUndefined();
    } finally {
      isInitializedSpy.mockRestore();
      connectionManager.db = originalDb;
    }
  });
});

describe('isDedupFresh', () => {
  it('returns true for timestamps within five minutes', () => {
    const now = 1_000_000;
    const updatedAt = now - (5 * 60 * 1000) + 1;

    expect(isDedupFresh(updatedAt, now)).toBe(true);
  });

  it('returns false when the timestamp is exactly five minutes old', () => {
    const now = 2_000_000;
    const updatedAt = now - (5 * 60 * 1000);

    expect(isDedupFresh(updatedAt, now)).toBe(false);
  });
});
