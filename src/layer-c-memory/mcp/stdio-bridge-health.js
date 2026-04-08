#!/usr/bin/env node
import http from 'http';

export function waitMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function readDaemonHealth(healthUrl) {
  return await new Promise((resolve) => {
    const req = http.get(healthUrl, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const status = String(json?.status || 'unknown');
          const initialized = json?.initialized === true;
          const healthy = (
            (json?.service === 'omnysys-mcp' || json?.service === 'omnysys-mcp-http') &&
            status === 'healthy' &&
            initialized
          );

          resolve({
            reachable: true,
            healthy,
            status,
            initialized,
            pid: Number.isFinite(Number(json?.pid)) ? Number(json.pid) : null,
            sessions: Number.isFinite(Number(json?.sessions)) ? Number(json.sessions) : 0,
            service: json?.service || null,
            transport: json?.transport || null,
            error: null
          });
        } catch {
          resolve({
          reachable: true,
          healthy: false,
          status: 'invalid-response',
          initialized: false,
          pid: null,
          sessions: 0,
          service: null,
          transport: null,
          error: 'invalid JSON response'
        });
        }
      });
    });
    req.on('error', (error) => resolve({
    reachable: false,
    healthy: false,
    status: 'unreachable',
    initialized: false,
    pid: null,
    sessions: 0,
    service: null,
    transport: null,
    error: error.message
  }));
    req.on('timeout', () => {
      req.destroy();
      resolve({
      reachable: false,
      healthy: false,
      status: 'timeout',
      initialized: false,
      pid: null,
      sessions: 0,
      service: null,
      transport: null,
      error: 'timeout'
      });
    });
  });
}

export async function waitForDaemonHealthy(healthUrl, {
  timeoutMs,
  pollMs,
  label = 'daemon',
  log
}) {
  const deadline = Date.now() + timeoutMs;
  let attempt = 0;
  let lastStatus = null;
  const trace = typeof log === 'function' ? log : () => {};

  while (Date.now() < deadline) {
    const health = await readDaemonHealth(healthUrl);
    if (health.healthy) {
      return health;
    }

    const statusLabel = health.reachable
      ? `${health.status}${health.initialized ? '' : ', initialized=false'}`
      : health.error || 'unreachable';

    if (statusLabel !== lastStatus) {
      trace(`${label} not ready yet (${statusLabel}); waiting for healthy state...`);
      lastStatus = statusLabel;
    }

    const delay = Math.min(pollMs + (attempt * 250), 5000);
    await waitMs(delay);
    attempt += 1;
  }

  return null;
}
