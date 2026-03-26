import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startHttpServer } from '../../../src/layer-c-memory/mcp-http-listener.js';

function createLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  };
}

function createListenScenarioQueue(scenarios = []) {
  const servers = [];

  const listen = vi.fn((port, host, onListen) => {
    const scenario = scenarios.shift() || { type: 'success' };
    const server = {
      close: vi.fn((cb) => {
        if (typeof cb === 'function') {
          cb();
        }
      }),
      once: vi.fn((event, handler) => {
        if (event === 'error') {
          server.errorHandler = handler;
        }
      })
    };

    servers.push(server);

    queueMicrotask(() => {
      if (scenario.type === 'success') {
        onListen();
        return;
      }

      server.errorHandler?.(scenario.error);
    });

    return server;
  });

  return { listen, servers };
}

function createError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

describe('startHttpServer', () => {
  let originalProxyMode;
  let exitSpy;

  beforeEach(() => {
    originalProxyMode = process.env.OMNYSYS_PROXY_MODE;
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined);
  });

  afterEach(() => {
    if (originalProxyMode === undefined) {
      delete process.env.OMNYSYS_PROXY_MODE;
    } else {
      process.env.OMNYSYS_PROXY_MODE = originalProxyMode;
    }

    exitSpy.mockRestore();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns the created server when the bind succeeds', async () => {
    const logger = createLogger();
    const { listen, servers } = createListenScenarioQueue([{ type: 'success' }]);
    const app = { listen };

    const server = await startHttpServer({
      app,
      host: '127.0.0.1',
      port: 9999,
      logger
    });

    expect(server).toBe(servers[0]);
    expect(listen).toHaveBeenCalledWith(9999, '127.0.0.1', expect.any(Function));
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('OmnySys MCP HTTP daemon listening on http://127.0.0.1:9999/mcp')
    );
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('retries on EADDRINUSE in proxy mode and eventually succeeds', async () => {
    vi.useFakeTimers();
    process.env.OMNYSYS_PROXY_MODE = '1';

    const logger = createLogger();
    const { listen, servers } = createListenScenarioQueue([
      { type: 'error', error: createError('EADDRINUSE', 'busy') },
      { type: 'success' }
    ]);
    const app = { listen };

    const promise = startHttpServer({
      app,
      host: '127.0.0.1',
      port: 9999,
      logger
    });

    await Promise.resolve();

    expect(servers).toHaveLength(1);
    expect(servers[0].close).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Retrying bind'));

    await vi.advanceTimersByTimeAsync(1000);

    const server = await promise;

    expect(servers).toHaveLength(2);
    expect(server).toBe(servers[1]);
    expect(listen).toHaveBeenCalledTimes(2);
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('closes the server and exits cleanly when the port is already in use outside proxy mode', async () => {
    const logger = createLogger();
    const { listen, servers } = createListenScenarioQueue([
      { type: 'error', error: createError('EADDRINUSE', 'busy') }
    ]);
    const app = { listen };

    const server = await startHttpServer({
      app,
      host: '127.0.0.1',
      port: 9999,
      logger
    });

    expect(server).toBeNull();
    expect(servers).toHaveLength(1);
    expect(servers[0].close).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('already in use, assuming MCP daemon is already running')
    );
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('logs and exits with code 1 on unexpected listen errors', async () => {
    const logger = createLogger();
    const { listen, servers } = createListenScenarioQueue([
      { type: 'error', error: createError('EACCES', 'permission denied') }
    ]);
    const app = { listen };

    const server = await startHttpServer({
      app,
      host: '127.0.0.1',
      port: 9999,
      logger
    });

    expect(server).toBeNull();
    expect(servers).toHaveLength(1);
    expect(servers[0].close).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('HTTP daemon startup failed: permission denied')
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
