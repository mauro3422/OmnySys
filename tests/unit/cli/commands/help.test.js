import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('#cli/utils/logger.js', () => ({
  showHelp: vi.fn()
}));

const { helpLogic, execute, aliases } = await import('#cli/commands/help.js');

describe('helpLogic', () => {
  it('returns success with help text', async () => {
    const result = await helpLogic({ silent: true });

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.helpText).toBeDefined();
  });

  it('includes command list in help text', async () => {
    const result = await helpLogic({ silent: true });

    expect(result.helpText).toContain('up');
    expect(result.helpText).toContain('down');
    expect(result.helpText).toContain('status');
    expect(result.helpText).toContain('tools');
    expect(result.helpText).toContain('call');
    expect(result.helpText).toContain('setup');
    expect(result.helpText).toContain('help');
  });

  it('includes usage examples in help text', async () => {
    const result = await helpLogic({ silent: true });

    expect(result.helpText).toContain('Ejemplos');
    expect(result.helpText).toContain('omnysys up');
    expect(result.helpText).toContain('omnysys status');
    expect(result.helpText).toContain('omnysys tools');
  });

  it('includes call example with JSON args', async () => {
    const result = await helpLogic({ silent: true });

    expect(result.helpText).toContain('call');
    expect(result.helpText).toContain('get_impact_map');
  });

  it('works without silent option', async () => {
    const result = await helpLogic();

    expect(result.success).toBe(true);
    expect(result.helpText).toBeDefined();
  });
});

describe('execute', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('exports execute function', () => {
    expect(typeof execute).toBe('function');
  });

  it('exports aliases', () => {
    expect(aliases).toEqual(['help', '--help', '-h']);
  });

  it('logs help text to console', async () => {
    await execute();

    expect(consoleSpy).toHaveBeenCalled();
    const loggedText = consoleSpy.mock.calls.map(c => c[0]).join(' ');
    expect(loggedText).toContain('OmnySys');
  });
});
