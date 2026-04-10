import { describe, expect, it } from 'vitest';

import {
  shouldPreconnectBridgeTransport,
  shouldPromoteBridgeTransportToSessionBound
} from '../../../../src/layer-c-memory/mcp/stdio-bridge-startup.js';

describe('stdio-bridge-startup', () => {
  it('does not preconnect on a cold start without a cached session', () => {
    expect(shouldPreconnectBridgeTransport({
      lastSessionId: null,
      lastDaemonHealth: {
        healthy: true,
        sessions: 2
      }
    })).toBe(false);
  });

  it('does not preconnect when the daemon reports zero active sessions', () => {
    expect(shouldPreconnectBridgeTransport({
      lastSessionId: 'session-cached',
      lastDaemonHealth: {
        healthy: true,
        sessions: 0
      }
    })).toBe(false);
  });

  it('preconnects only when a cached session and active daemon sessions both exist', () => {
    expect(shouldPreconnectBridgeTransport({
      lastSessionId: 'session-cached',
      lastDaemonHealth: {
        healthy: true,
        sessions: 1
      },
      lastBridgeTransportState: 'message-sent'
    })).toBe(true);
  });

  it('does not preconnect when the last bridge transport state was not reusable', () => {
    expect(shouldPreconnectBridgeTransport({
      lastSessionId: 'session-cached',
      lastDaemonHealth: {
        healthy: true,
        sessions: 1
      },
      lastBridgeTransportState: 'transport-error'
    })).toBe(false);
  });

  it('promotes a bootstrap transport to a session-bound transport before normal requests', () => {
    expect(shouldPromoteBridgeTransportToSessionBound({
      transportBootstrappedSessionlessly: true,
      sessionId: 'session-cached',
      messageMethod: 'tools/call'
    })).toBe(true);

    expect(shouldPromoteBridgeTransportToSessionBound({
      transportBootstrappedSessionlessly: true,
      sessionId: 'session-cached',
      messageMethod: 'initialize'
    })).toBe(false);
  });
});
