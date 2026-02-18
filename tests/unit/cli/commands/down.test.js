import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('#cli/handlers/process-manager.js', () => ({
  stopAll: vi.fn()
}));

const { stopAll } = await import('#cli/handlers/process-manager.js');
const { downLogic, execute, aliases } = await import('#cli/commands/down.js');

describe('downLogic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns success when services stopped', async () => {
    vi.mocked(stopAll).mockImplementation(() => {});

    const result = await downLogic({ silent: true });

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.message).toBe('All services stopped');
    expect(stopAll).toHaveBeenCalledTimes(1);
  });

  it('calls stopAll function', async () => {
    vi.mocked(stopAll).mockImplementation(() => {});

    await downLogic({ silent: true });

    expect(stopAll).toHaveBeenCalled();
  });

  it('handles errors from stopAll', async () => {
    vi.mocked(stopAll).mockImplementation(() => {
      throw new Error('Failed to stop');
    });

    const result = await downLogic({ silent: true });

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.error).toBe('Failed to stop');
  });

  it('works without silent option', async () => {
    vi.mocked(stopAll).mockImplementation(() => {});

    const result = await downLogic();

    expect(result.success).toBe(true);
  });
});

describe('execute', () => {
  it('exports execute function', () => {
    expect(typeof execute).toBe('function');
  });

  it('exports aliases', () => {
    expect(aliases).toEqual(['stop', 'down']);
  });
});
