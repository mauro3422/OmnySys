import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('#cli/utils/opencode-config.js', () => ({
  setupOpenCode: vi.fn(),
  getOpenCodeConfigPath: vi.fn()
}));

vi.mock('#cli/utils/port-checker.js', () => ({
  PORTS: { llm: 8000, mcp: 9999 }
}));

const { setupOpenCode, getOpenCodeConfigPath } = await import('#cli/utils/opencode-config.js');
const { setupLogic, execute, aliases } = await import('#cli/commands/setup.js');

describe('setupLogic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns success when OpenCode configured', async () => {
    vi.mocked(setupOpenCode).mockResolvedValue(true);
    vi.mocked(getOpenCodeConfigPath).mockReturnValue('/home/.config/opencode/opencode.json');

    const result = await setupLogic({ silent: true });

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.configured).toBe(true);
    expect(result.config.llmPort).toBe(8000);
    expect(result.config.mcpPort).toBe(9999);
    expect(result.config.configPath).toBe('/home/.config/opencode/opencode.json');
  });

  it('returns error when OpenCode configuration fails', async () => {
    vi.mocked(setupOpenCode).mockResolvedValue(false);

    const result = await setupLogic({ silent: true });

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.configured).toBe(false);
    expect(result.error).toBe('Could not configure OpenCode automatically');
  });

  it('handles exceptions from setupOpenCode', async () => {
    vi.mocked(setupOpenCode).mockRejectedValue(new Error('Permission denied'));

    const result = await setupLogic({ silent: true });

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.error).toBe('Permission denied');
  });

  it('calls setupOpenCode function', async () => {
    vi.mocked(setupOpenCode).mockResolvedValue(true);

    await setupLogic({ silent: true });

    expect(setupOpenCode).toHaveBeenCalledTimes(1);
  });

  it('works without silent option', async () => {
    vi.mocked(setupOpenCode).mockResolvedValue(true);

    const result = await setupLogic();

    expect(result.success).toBe(true);
  });
});

describe('execute', () => {
  it('exports execute function', () => {
    expect(typeof execute).toBe('function');
  });

  it('exports aliases', () => {
    expect(aliases).toEqual(['setup']);
  });
});
