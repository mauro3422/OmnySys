import { beforeEach, describe, expect, it, vi } from 'vitest';
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

  it('reuses the existing active session id when saveSession deduplicates', () => {
    manager.ensureInitialized = vi.fn(() => true);
    manager.releasePendingSession = vi.fn();
    manager.findSessionByClientId = vi.fn(() => ({ id: 'active-session' }));
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
    expect(manager.updateActivity).toHaveBeenCalledWith('active-session');
    expect(manager.deleteSession).toHaveBeenCalledWith('pending-session');
    expect(manager.deduplicateSessions).toHaveBeenCalledWith('Claude', 'active-session');
    expect(manager.statements.upsert.run).not.toHaveBeenCalled();
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
