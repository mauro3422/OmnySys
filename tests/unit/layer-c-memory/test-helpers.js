import { vi } from 'vitest';
import { createLogger as canonicalCreateLogger } from '../../../src/shared/logger-system.js';

export function createLogger() {
  return canonicalCreateLogger(...args);
}

export function createResponse() {
  return {
    headersSent: false,
    statusCode: 200,
    headers: {},
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    set(name, value) {
      this.headers[name] = value;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
      return this;
    },
    json(body) {
      this.payload = body;
      this.headersSent = true;
      return body;
    }
  };
}

export function createSessionManager(overrides = {}) {
  return {
    reserveSession: vi.fn(() => ({
      sessionId: 'transport-session',
      reused: false,
      source: 'new'
    })),
    saveSession: vi.fn(() => 'transport-session'),
    getSession: vi.fn(() => null),
    releasePendingSession: vi.fn(),
    deleteSession: vi.fn(),
    ...overrides
  };
}

export function createBuildSessionServer() {
  return vi.fn(() => ({
    connect: vi.fn(async (transport) => {
      await transport.connect();
    })
  }));
}

export function createExitSpy() {
  return vi.spyOn(process, 'exit').mockImplementation(() => undefined);
}

export async function withTemporaryEnv(name, value, callback) {
  const previous = process.env[name];
  process.env[name] = value;

  try {
    return await callback();
  } finally {
    if (previous === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = previous;
    }
  }
}
