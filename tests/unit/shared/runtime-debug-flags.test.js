import { afterEach, describe, expect, it } from 'vitest';
import {
  isBugModeEnabled,
  isGuardTraceEnabled,
  isToolTraceEnabled,
  summarizeDebugValue
} from '#shared/runtime-debug-flags.js';

function withEnv(key, value, fn) {
  const previous = process.env[key];
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }

  try {
    return fn();
  } finally {
    if (previous === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = previous;
    }
  }
}

describe('runtime-debug-flags', () => {
  afterEach(() => {
    delete process.env.OMNYSYS_BUG_MODE;
    delete process.env.OMNYSYS_TRACE_TOOLS;
    delete process.env.OMNYSYS_TRACE_GUARDS;
  });

  it('enables bug mode when OMNYSYS_BUG_MODE is truthy', () => {
    withEnv('OMNYSYS_BUG_MODE', '1', () => {
      expect(isBugModeEnabled()).toBe(true);
      expect(isToolTraceEnabled()).toBe(true);
      expect(isGuardTraceEnabled()).toBe(true);
    });
  });

  it('enables tool trace independently', () => {
    withEnv('OMNYSYS_TRACE_TOOLS', 'true', () => {
      expect(isBugModeEnabled()).toBe(true);
      expect(isToolTraceEnabled()).toBe(true);
      expect(isGuardTraceEnabled()).toBe(true);
    });
  });

  it('summarizes nested values compactly', () => {
    const summary = summarizeDebugValue({
      a: 1,
      b: { c: { d: 4 } },
      list: [1, 2, 3]
    });

    expect(summary).toEqual(expect.objectContaining({
      a: 1,
      b: expect.any(Object),
      list: expect.objectContaining({
        kind: 'array',
        length: 3
      })
    }));
  });
});
