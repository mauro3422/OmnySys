import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('#cli/utils/port-checker.js', () => ({
  checkLLM: vi.fn(),
  checkMCP: vi.fn(),
  PORTS: { llm: 8000, mcp: 9999 }
}));

vi.mock('#cli/handlers/process-manager.js', () => ({
  startLLM: vi.fn(),
  startMCP: vi.fn()
}));

vi.mock('#cli/utils/opencode-config.js', () => ({
  setupOpenCode: vi.fn()
}));

const { checkLLM, checkMCP } = await import('#cli/utils/port-checker.js');
const { startLLM, startMCP } = await import('#cli/handlers/process-manager.js');
const { setupOpenCode } = await import('#cli/utils/opencode-config.js');
const { upLogic, execute, aliases } = await import('#cli/commands/up.js');

describe('upLogic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns success when both services already running', async () => {
    vi.mocked(checkLLM).mockResolvedValue(true);
    vi.mocked(checkMCP).mockResolvedValue(true);
    vi.mocked(setupOpenCode).mockResolvedValue(true);

    const result = await upLogic({ silent: true });

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.services.llm.running).toBe(true);
    expect(result.services.mcp.running).toBe(true);
    expect(result.services.llm.started).toBe(false);
    expect(result.services.mcp.started).toBe(false);
  });

  it('starts LLM when not running', async () => {
    vi.mocked(checkLLM).mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    vi.mocked(checkMCP).mockResolvedValue(true);
    vi.mocked(startLLM).mockResolvedValue(true);
    vi.mocked(setupOpenCode).mockResolvedValue(true);

    const result = await upLogic({ silent: true });

    expect(result.success).toBe(true);
    expect(result.services.llm.started).toBe(true);
    expect(startLLM).toHaveBeenCalledTimes(1);
  });

  it('starts MCP when not running', async () => {
    vi.mocked(checkLLM).mockResolvedValue(true);
    vi.mocked(checkMCP).mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    vi.mocked(startMCP).mockResolvedValue(true);
    vi.mocked(setupOpenCode).mockResolvedValue(true);

    const result = await upLogic({ silent: true });

    expect(result.success).toBe(true);
    expect(result.services.mcp.started).toBe(true);
    expect(startMCP).toHaveBeenCalledTimes(1);
  });

  it('returns error when LLM fails to start', async () => {
    vi.mocked(checkLLM).mockResolvedValue(false);
    vi.mocked(startLLM).mockResolvedValue(false);

    const result = await upLogic({ silent: true });

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.error).toBe('LLM Server failed to start');
  });

  it('returns error when MCP fails to start', async () => {
    vi.mocked(checkLLM).mockResolvedValue(true);
    vi.mocked(checkMCP).mockResolvedValue(false);
    vi.mocked(startMCP).mockResolvedValue(false);

    const result = await upLogic({ silent: true });

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.error).toBe('MCP Server failed to start');
  });

  it('includes port information', async () => {
    vi.mocked(checkLLM).mockResolvedValue(true);
    vi.mocked(checkMCP).mockResolvedValue(true);
    vi.mocked(setupOpenCode).mockResolvedValue(true);

    const result = await upLogic({ silent: true });

    expect(result.services.llm.port).toBe(8000);
    expect(result.services.mcp.port).toBe(9999);
  });

  it('reports OpenCode configuration status', async () => {
    vi.mocked(checkLLM).mockResolvedValue(true);
    vi.mocked(checkMCP).mockResolvedValue(true);
    vi.mocked(setupOpenCode).mockResolvedValue(true);

    const result = await upLogic({ silent: true });

    expect(result.openCodeConfigured).toBe(true);
  });

  it('reports OpenCode configuration failure', async () => {
    vi.mocked(checkLLM).mockResolvedValue(true);
    vi.mocked(checkMCP).mockResolvedValue(true);
    vi.mocked(setupOpenCode).mockResolvedValue(false);

    const result = await upLogic({ silent: true });

    expect(result.success).toBe(true);
    expect(result.openCodeConfigured).toBe(false);
  });

  it('handles exceptions', async () => {
    vi.mocked(checkLLM).mockRejectedValue(new Error('Network error'));

    const result = await upLogic({ silent: true });

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.error).toBe('Network error');
  });

  it('works without silent option', async () => {
    vi.mocked(checkLLM).mockResolvedValue(true);
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
