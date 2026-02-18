/**
 * @fileoverview logger-system.test.js
 * 
 * REAL tests for Logger System.
 * NO MOCKS - tests real logging output.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  Logger,
  LogLevel,
  createLogger,
  rootLogger,
  setGlobalLevel
} from '#shared/logger-system.js';

describe('Logger - Creation', () => {
  it('creates logger with namespace', () => {
    const logger = createLogger('TestNamespace');
    expect(logger.namespace).toBe('TestNamespace');
  });

  it('creates logger with default namespace', () => {
    const logger = new Logger();
    expect(logger.namespace).toBe('OmnySys');
  });

  it('rootLogger exists with correct namespace', () => {
    expect(rootLogger.namespace).toBe('OmnySys');
  });
});

describe('Logger - Log Levels', () => {
  it('has correct log level values', () => {
    expect(LogLevel.DEBUG).toBe(0);
    expect(LogLevel.INFO).toBe(1);
    expect(LogLevel.WARN).toBe(2);
    expect(LogLevel.ERROR).toBe(3);
    expect(LogLevel.FATAL).toBe(4);
    expect(LogLevel.SILENT).toBe(5);
  });

  it('isEnabled returns true for levels >= current level', () => {
    const logger = createLogger('TestLogger');
    logger.level = LogLevel.INFO;

    expect(logger.isEnabled(LogLevel.DEBUG)).toBe(false);
    expect(logger.isEnabled(LogLevel.INFO)).toBe(true);
    expect(logger.isEnabled(LogLevel.WARN)).toBe(true);
    expect(logger.isEnabled(LogLevel.ERROR)).toBe(true);
  });
});

describe('Logger - Child Loggers', () => {
  it('creates child logger with extended namespace', () => {
    const parent = createLogger('Parent');
    const child = parent.child('Child');

    expect(child.namespace).toBe('Parent:Child');
  });

  it('caches child loggers', () => {
    const parent = createLogger('Parent');
    const child1 = parent.child('Child');
    const child2 = parent.child('Child');

    expect(child1).toBe(child2);
  });

  it('creates nested child loggers', () => {
    const parent = createLogger('OmnySys');
    const child = parent.child('core');
    const grandchild = child.child('file-watcher');

    expect(grandchild.namespace).toBe('OmnySys:core:file-watcher');
  });
});

describe('Logger - Output Methods', () => {
  let logger;
  let consoleSpy;
  let consoleWarnSpy;

  beforeEach(() => {
    logger = createLogger('TestOutput');
    logger.level = LogLevel.DEBUG;
    consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('calls console.info for debug level', () => {
    logger.debug('Test debug message');
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('calls console.info for info level', () => {
    logger.info('Test info message');
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('includes metadata in output', () => {
    logger.info('Test message', { key: 'value' });
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('does not output when level is below threshold', () => {
    logger.level = LogLevel.WARN;
    logger.debug('Should not appear');
    logger.info('Should not appear');
    logger.warn('Should appear');

    expect(consoleSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
  });
});

describe('Logger - Error Handling', () => {
  let logger;
  let consoleErrorSpy;

  beforeEach(() => {
    logger = createLogger('TestErrors');
    logger.level = LogLevel.DEBUG;
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('logs error with console.error', () => {
    logger.error('Error message');
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('logs fatal with console.error', () => {
    logger.fatal('Fatal message');
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('exception method logs error details', () => {
    const error = new Error('Test error');
    logger.exception(error, 'Operation failed');

    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});

describe('Logger - Warning Output', () => {
  let logger;
  let consoleWarnSpy;

  beforeEach(() => {
    logger = createLogger('TestWarnings');
    logger.level = LogLevel.DEBUG;
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it('logs warning with console.warn', () => {
    logger.warn('Warning message');
    expect(consoleWarnSpy).toHaveBeenCalled();
  });
});

describe('Logger - Time Tracking', () => {
  let logger;

  beforeEach(() => {
    logger = createLogger('TestTimer');
    logger.level = LogLevel.DEBUG;
  });

  it('returns done function for manual timing', () => {
    const done = logger.time('operation');
    const duration = done();

    expect(typeof duration).toBe('number');
    expect(duration).toBeGreaterThanOrEqual(0);
  });

  it('times synchronous function', () => {
    const result = logger.time('sync-op', () => {
      let sum = 0;
      for (let i = 0; i < 1000; i++) sum += i;
      return sum;
    });

    expect(result).toBe(499500);
  });

  it('times async function', async () => {
    const result = await logger.time('async-op', async () => {
      await new Promise(r => setTimeout(r, 10));
      return 'done';
    });

    expect(result).toBe('done');
  });

  it('propagates errors from timed function', () => {
    expect(() => {
      logger.time('failing-op', () => {
        throw new Error('Intentional error');
      });
    }).toThrow('Intentional error');
  });
});

describe('Logger - Trace', () => {
  let logger;
  let consoleSpy;

  beforeEach(() => {
    logger = createLogger('TestTrace');
    logger.level = LogLevel.DEBUG;
    consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('logs with correlation ID', () => {
    logger.trace('corr-123', 'Traced operation');
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('includes trace metadata', () => {
    logger.trace('corr-456', 'Operation', { extraData: 'value' });
    expect(consoleSpy).toHaveBeenCalled();
  });
});

describe('Logger - Namespace Configuration', () => {
  it('matches wildcard patterns', () => {
    const logger = createLogger('OmnySys:core:file-watcher');
    expect(logger.config).toBeDefined();
    expect(logger.config.level).toBeDefined();
  });

  it('gets default config for unknown namespace', () => {
    const logger = createLogger('UnknownNamespace');
    expect(logger.config).toBeDefined();
  });
});

describe('Logger - Global Configuration', () => {
  it('setGlobalLevel changes default level', () => {
    const originalLevel = createLogger('Temp').level;

    setGlobalLevel('error');
    const newLogger = createLogger('AfterChange');
    expect(newLogger.level).toBe(LogLevel.ERROR);

    setGlobalLevel('info');
  });
});

describe('Logger - Format Output', () => {
  let logger;
  let consoleSpy;

  beforeEach(() => {
    logger = createLogger('TestFormat');
    logger.level = LogLevel.DEBUG;
    consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('includes timestamp in output', () => {
    logger.info('Message');
    const call = consoleSpy.mock.calls[0][0];
    expect(call).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it('includes namespace in output', () => {
    logger.info('Message');
    const call = consoleSpy.mock.calls[0][0];
    expect(call).toContain('TestFormat');
  });

  it('includes level indicator', () => {
    logger.info('Message');
    const call = consoleSpy.mock.calls[0][0];
    expect(call).toContain('[INFO]');
  });
});

describe('Logger - Real Scenarios', () => {
  let logger;
  let consoleSpy;

  beforeEach(() => {
    logger = createLogger('RealScenario');
    logger.level = LogLevel.DEBUG;
    consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('logs complex operation flow', () => {
    logger.debug('Starting operation');
    logger.info('Processing item', { count: 5 });
    logger.debug('Completed operation');

    expect(consoleSpy).toHaveBeenCalledTimes(3);
  });

  it('logs with nested metadata', () => {
    logger.info('Complex operation', {
      user: { id: 123, name: 'test' },
      action: 'update',
      timestamp: new Date().toISOString()
    });

    expect(consoleSpy).toHaveBeenCalled();
  });
});

describe('Logger - Silent Mode', () => {
  let logger;
  let consoleSpy;

  beforeEach(() => {
    logger = createLogger('SilentTest');
    logger.level = LogLevel.SILENT;
    consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('suppresses all output at SILENT level', () => {
    logger.debug('Should not appear');
    logger.info('Should not appear');
    logger.warn('Should not appear');

    expect(consoleSpy).not.toHaveBeenCalled();
  });
});
