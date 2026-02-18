import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('#cli/utils/port-checker.js', () => ({
  checkMCP: vi.fn(),
  PORTS: { mcp: 9999 }
}));

const { checkMCP } = await import('#cli/utils/port-checker.js');
const { callLogic, execute } = await import('#cli/commands/call.js');

describe('callLogic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns error when no tool name provided', async () => {
    const result = await callLogic(null, { silent: true });

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.error).toBe('No tool name specified');
  });

  it('returns error when tool name is empty string', async () => {
    const result = await callLogic([''], { silent: true });

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.error).toBe('No tool name specified');
  });

  it('returns error when MCP server not running', async () => {
    vi.mocked(checkMCP).mockResolvedValue(false);

    const result = await callLogic(['get_impact_map'], { silent: true });

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.error).toBe('MCP Server is not running');
    expect(result.hint).toBe('Run: omnysys up');
  });

  it('returns error when JSON args are invalid', async () => {
    vi.mocked(checkMCP).mockResolvedValue(true);

    const result = await callLogic(['get_impact_map', 'not-valid-json'], { silent: true });

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.error).toBe('Invalid JSON arguments');
  });

  it('parses valid JSON args correctly', async () => {
    vi.mocked(checkMCP).mockResolvedValue(true);
    vi.mocked(global.fetch).mockResolvedValue({
      json: () => Promise.resolve({ result: { success: true } })
    });

    const result = await callLogic(['get_impact_map', '{"filePath":"src/test.js"}'], { silent: true });

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.args).toEqual({ filePath: 'src/test.js' });
  });

  it('calls tool endpoint with correct parameters', async () => {
    vi.mocked(checkMCP).mockResolvedValue(true);
    vi.mocked(global.fetch).mockResolvedValue({
      json: () => Promise.resolve({ result: { files: [] } })
    });

    const result = await callLogic(['get_impact_map', '{"filePath":"src/test.js"}'], { silent: true });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:9999/tools/get_impact_map',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: 'src/test.js' })
      })
    );
    expect(result.success).toBe(true);
    expect(result.toolName).toBe('get_impact_map');
  });

  it('returns tool result on success', async () => {
    vi.mocked(checkMCP).mockResolvedValue(true);
    const mockResult = { files: ['a.js', 'b.js'], impacts: 5 };
    vi.mocked(global.fetch).mockResolvedValue({
      json: () => Promise.resolve({ result: mockResult })
    });

    const result = await callLogic(['get_impact_map', '{}'], { silent: true });

    expect(result.success).toBe(true);
    expect(result.result).toEqual(mockResult);
  });

  it('handles fetch errors', async () => {
    vi.mocked(checkMCP).mockResolvedValue(true);
    vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

    const result = await callLogic(['get_impact_map', '{}'], { silent: true });

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.error).toContain('Error executing get_impact_map');
    expect(result.error).toContain('Network error');
  });

  it('defaults to empty object when no args provided', async () => {
    vi.mocked(checkMCP).mockResolvedValue(true);
    vi.mocked(global.fetch).mockResolvedValue({
      json: () => Promise.resolve({ result: {} })
    });

    const result = await callLogic(['get_impact_map'], { silent: true });

    expect(result.success).toBe(true);
    expect(result.args).toEqual({});
  });
});

describe('execute', () => {
  it('exports execute function', () => {
    expect(typeof execute).toBe('function');
  });
});
