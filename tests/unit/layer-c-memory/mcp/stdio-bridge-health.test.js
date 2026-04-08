import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  get: vi.fn()
}));

vi.mock('http', () => ({
  default: { get: mocks.get },
  get: mocks.get
}));

import { waitForDaemonHealthy } from '../../../../src/layer-c-memory/mcp/stdio-bridge-health.js';

function installSequentialHealthResponses(responses) {
  let callIndex = 0;

  mocks.get.mockImplementation((_url, _options, callback) => {
    const response = responses[Math.min(callIndex, responses.length - 1)];
    callIndex += 1;

    const req = {
      on: vi.fn(() => req),
      destroy: vi.fn()
    };

    queueMicrotask(() => {
      const res = new EventEmitter();
      res.statusCode = 200;
      res.on = res.addListener.bind(res);
      callback(res);
      res.emit('data', JSON.stringify(response));
      res.emit('end');
    });

    return req;
  });
}

describe('stdio-bridge-health', () => {
  it('waits for a healthy daemon without requiring a log callback', async () => {
    installSequentialHealthResponses([
      {
        status: 'booting',
        initialized: false,
        service: 'omnysys-mcp-http',
        pid: 11,
        sessions: 0
      },
      {
        status: 'healthy',
        initialized: true,
        service: 'omnysys-mcp-http',
        pid: 22,
        sessions: 1
      }
    ]);

    await expect(waitForDaemonHealthy('http://127.0.0.1:9999/health', {
      timeoutMs: 1000,
      pollMs: 0,
      label: 'daemon recovery'
    })).resolves.toEqual(expect.objectContaining({
      healthy: true,
      pid: 22,
      sessions: 1
    }));
  });
});
