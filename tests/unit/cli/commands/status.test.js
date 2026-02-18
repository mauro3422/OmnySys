import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('#cli/utils/port-checker.js', () => ({
  checkLLM: vi.fn(),
  checkMCP: vi.fn(),
  PORTS: { llm: 8000, mcp: 9999 }
}));

const { checkLLM, checkMCP } = await import('#cli/utils/port-checker.js');
const { statusLogic, execute, aliases } = await import('#cli/commands/status.js');

describe('statusLogic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns success when both services running', async () => {
    vi.mocked(checkLLM).mockResolvedValue(true);
    vi.mocked(checkMCP).mockResolvedValue(true);

    const result = await statusLogic({ silent: true });

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.services.llm.running).toBe(true);
    expect(result.services.mcp.running).toBe(true);
    expect(result.allRunning).toBe(true);
  });

  it('returns correct status when LLM not running', async () => {
    vi.mocked(checkLLM).mockResolvedValue(false);
    vi.mocked(checkMCP).mockResolvedValue(true);

    const result = await statusLogic({ silent: true });

    expect(result.success).toBe(true);
    expect(result.services.llm.running).toBe(false);
    expect(result.services.mcp.running).toBe(true);
    expect(result.allRunning).toBe(false);
  });

  it('returns correct status when MCP not running', async () => {
    vi.mocked(checkLLM).mockResolvedValue(true);
    vi.mocked(checkMCP).mockResolvedValue(false);

    const result = await statusLogic({ silent: true });

    expect(result.success).toBe(true);
    expect(result.services.llm.running).toBe(true);
    expect(result.services.mcp.running).toBe(false);
    expect(result.allRunning).toBe(false);
  });

  it('returns correct status when both not running', async () => {
    vi.mocked(checkLLM).mockResolvedValue(false);
    vi.mocked(checkMCP).mockResolvedValue(false);

    const result = await statusLogic({ silent: true });

    expect(result.success).toBe(true);
    expect(result.services.llm.running).toBe(false);
    expect(result.services.mcp.running).toBe(false);
    expect(result.allRunning).toBe(false);
  });

  it('includes port information', async () => {
    vi.mocked(checkLLM).mockResolvedValue(true);
    vi.mocked(checkMCP).mockResolvedValue(true);

    const result = await statusLogic({ silent: true });

    expect(result.services.llm.port).toBe(8000);
    expect(result.services.mcp.port).toBe(9999);
  });

  it('shows tools available only when MCP running', async () => {
    vi.mocked(checkLLM).mockResolvedValue(true);
    vi.mocked(checkMCP).mockResolvedValue(true);

    const result = await statusLogic({ silent: true });

    expect(result.services.mcp.toolsAvailable).toBe(9);
  });

  it('shows zero tools when MCP not running', async () => {
    vi.mocked(checkLLM).mockResolvedValue(true);
    vi.mocked(checkMCP).mockResolvedValue(false);

    const result = await statusLogic({ silent: true });

    expect(result.services.mcp.toolsAvailable).toBe(0);
  });

  it('handles errors from port checker', async () => {
    vi.mocked(checkLLM).mockRejectedValue(new Error('Connection failed'));

    const result = await statusLogic({ silent: true });

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.error).toBe('Connection failed');
  });

  it('works without silent option', async () => {
    vi.mocked(checkLLM).mockResolvedValue(true);
    vi.mocked(checkMCP).mockResolvedValue(true);

    const result = await statusLogic();

    expect(result.success).toBe(true);
  });
});

describe('execute', () => {
  it('exports execute function', () => {
    expect(typeof execute).toBe('function');
  });

  it('exports aliases', () => {
    expect(aliases).toEqual(['status']);
  });
});
