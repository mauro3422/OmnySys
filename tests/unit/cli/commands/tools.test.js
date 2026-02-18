import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('#cli/utils/port-checker.js', () => ({
  checkMCP: vi.fn(),
  PORTS: { mcp: 9999 }
}));

const { checkMCP } = await import('#cli/utils/port-checker.js');
const { toolsLogic, execute, aliases } = await import('#cli/commands/tools.js');

describe('toolsLogic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns error when MCP server not running', async () => {
    vi.mocked(checkMCP).mockResolvedValue(false);

    const result = await toolsLogic({ silent: true });

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.error).toBe('MCP Server is not running');
    expect(result.hint).toBe('Run: omnysys up');
  });

  it('returns tools list when MCP running', async () => {
    vi.mocked(checkMCP).mockResolvedValue(true);
    vi.mocked(global.fetch).mockResolvedValue({
      json: () => Promise.resolve({
        tools: [
          { name: 'get_impact_map', description: 'Get impact' },
          { name: 'analyze_change', description: 'Analyze' }
        ]
      })
    });

    const result = await toolsLogic({ silent: true });

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.tools).toHaveLength(2);
    expect(result.count).toBe(2);
  });

  it('maps tool descriptions correctly', async () => {
    vi.mocked(checkMCP).mockResolvedValue(true);
    vi.mocked(global.fetch).mockResolvedValue({
      json: () => Promise.resolve({
        tools: [
          { name: 'get_impact_map', description: 'Default desc' },
          { name: 'unknown_tool', description: 'Custom description' }
        ]
      })
    });

    const result = await toolsLogic({ silent: true });

    expect(result.tools[0].description).toBe('Returns a complete impact map for a file');
    expect(result.tools[1].description).toBe('Custom description');
  });

  it('assigns icons to tools', async () => {
    vi.mocked(checkMCP).mockResolvedValue(true);
    vi.mocked(global.fetch).mockResolvedValue({
      json: () => Promise.resolve({
        tools: [
          { name: 'get_impact_map', description: '' },
          { name: 'analyze_change', description: '' },
          { name: 'unknown', description: '' }
        ]
      })
    });

    const result = await toolsLogic({ silent: true });

    expect(result.tools[0].icon).toBe('🔍');
    expect(result.tools[1].icon).toBe('🔧');
    expect(result.tools[2].icon).toBe('🔗');
  });

  it('uses fallback icon for tools beyond array', async () => {
    vi.mocked(checkMCP).mockResolvedValue(true);
    vi.mocked(global.fetch).mockResolvedValue({
      json: () => Promise.resolve({
        tools: Array(15).fill({ name: 'tool', description: '' })
      })
    });

    const result = await toolsLogic({ silent: true });

    expect(result.tools[9].icon).toBe('•');
    expect(result.tools[14].icon).toBe('•');
  });

  it('handles fetch errors', async () => {
    vi.mocked(checkMCP).mockResolvedValue(true);
    vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

    const result = await toolsLogic({ silent: true });

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.error).toContain('Error fetching tools');
    expect(result.error).toContain('Network error');
  });

  it('handles JSON parse errors', async () => {
    vi.mocked(checkMCP).mockResolvedValue(true);
    vi.mocked(global.fetch).mockResolvedValue({
      json: () => Promise.reject(new Error('Invalid JSON'))
    });

    const result = await toolsLogic({ silent: true });

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
  });

  it('works without silent option', async () => {
    vi.mocked(checkMCP).mockResolvedValue(true);
    vi.mocked(global.fetch).mockResolvedValue({
      json: () => Promise.resolve({ tools: [] })
    });

    const result = await toolsLogic();

    expect(result.success).toBe(true);
    expect(result.tools).toEqual([]);
    expect(result.count).toBe(0);
  });

  it('calls correct endpoint', async () => {
    vi.mocked(checkMCP).mockResolvedValue(true);
    vi.mocked(global.fetch).mockResolvedValue({
      json: () => Promise.resolve({ tools: [] })
    });

    await toolsLogic({ silent: true });

    expect(global.fetch).toHaveBeenCalledWith('http://localhost:9999/tools');
  });
});

describe('execute', () => {
  it('exports execute function', () => {
    expect(typeof execute).toBe('function');
  });

  it('exports aliases', () => {
    expect(aliases).toEqual(['tools']);
  });
});
