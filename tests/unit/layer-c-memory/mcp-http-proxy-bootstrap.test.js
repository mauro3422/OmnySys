import { describe, expect, it } from 'vitest';

import { resolveInitialProxyAction } from '../../../src/layer-c-memory/mcp-http-proxy-bootstrap.js';

describe('mcp-http-proxy-bootstrap', () => {
  it('spawns a worker when no live daemon exists', () => {
    expect(resolveInitialProxyAction({
      existingDaemonAlive: false,
      ownerPid: null,
      currentPid: 100
    })).toEqual({
      action: 'spawn',
      reason: 'no_live_daemon'
    });
  });

  it('exits when another proxy already owns the live daemon', () => {
    expect(resolveInitialProxyAction({
      existingDaemonAlive: true,
      ownerPid: 200,
      currentPid: 100
    })).toEqual({
      action: 'exit',
      reason: 'managed_by_other_proxy'
    });
  });

  it('stays in monitor mode when a live daemon exists without another proxy owner', () => {
    expect(resolveInitialProxyAction({
      existingDaemonAlive: true,
      ownerPid: 100,
      currentPid: 100
    })).toEqual({
      action: 'monitor',
      reason: 'healthy_daemon_without_proxy_owner'
    });

    expect(resolveInitialProxyAction({
      existingDaemonAlive: true,
      ownerPid: null,
      currentPid: 100
    })).toEqual({
      action: 'monitor',
      reason: 'healthy_daemon_without_proxy_owner'
    });
  });
});
