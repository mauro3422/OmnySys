import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('#cli/utils/port-checker.js', () => ({
  checkMCP: vi.fn(),
  PORTS: { mcp: 9999 }
}));

vi.mock('#cli/handlers/process-manager.js', () => ({
  startMCP: vi.fn()
}));

vi.mock('#cli/utils/opencode-config.js', () => ({
  setupOpenCode: vi.fn()
}));

const { checkMCP } = await import('#cli/utils/port-checker.js');
const { startMCP } = await import('#cli/handlers/process-manager.js');
const { setupOpenCode } = await import('#cli/utils/opencode-config.js');
const { upLogic, execute, aliases } = await import('#cli/commands/up.js');

describe('upLogic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns success when MCP already running', async () => {
    vi.mocked(checkMCP).mockResolvedValue(true);
    vi.mocked(setupOpenCode).mockResolvedValue(true);

    const result = await upLogic({ silent: true });

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.services.mcp.running).toBe(true);
    expect(result.services.mcp.started).toBe(false);
  });

  it('starts MCP when not running', async () => {
    vi.mocked(checkMCP).mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    vi.mocked(startMCP).mockResolvedValue(true);
    vi.mocked(setupOpenCode).mockResolvedValue(true);

    const result = await upLogic({ silent: true });

    expect(result.success).toBe(true);
    expect(result.services.mcp.started).toBe(true);
    expect(startMCP).toHaveBeenCalledTimes(1);
  });

  it('returns error when MCP fails to start', async () => {
    vi.mocked(checkMCP).mockResolvedValue(false);
    vi.mocked(startMCP).mockResolvedValue(false);

    const result = await upLogic({ silent: true });

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.error).toBe('MCP Server failed to start');
  });

  it('reports OpenCode configuration status', async () => {
    vi.mocked(checkMCP).mockResolvedValue(true);
    vi.mocked(setupOpenCode).mockResolvedValue(true);

    const result = await upLogic({ silent: true });

    expect(result.openCodeConfigured).toBe(true);
  });

  it('reports OpenCode configuration failure', async () => {
    vi.mocked(checkMCP).mockResolvedValue(true);
    vi.mocked(setupOpenCode).mockResolvedValue(false);

    const result = await upLogic({ silent: true });

    expect(result.success).toBe(true);
    expect(result.openCodeConfigured).toBe(false);
  });

  it('handles exceptions', async () => {
    vi.mocked(checkMCP).mockRejectedValue(new Error('Network error'));

    const result = await upLogic({ silent: true });

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.error).toBe('Network error');
  });

  it('works without silent option', async () => {
    vi.mocked(checkMCP).mockResolvedValue(true);
    vi.mocked(setupOpenCode).mockResolvedValue(true);

    const result = await upLogic();

    expect(result.success).toBe(true);
  });
});

describe('execute', () => {
  it('exports execute function', () => {
    expect(typeof execute).toBe('function');
  });

  it('exports aliases', () => {
    expect(aliases).toEqual(['start', 'up']);
  });
});
