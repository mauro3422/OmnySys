import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('#cli/utils/paths.js', () => ({
  resolveProjectPath: vi.fn((p) => p || process.cwd())
}));

vi.mock('#layer-c/mcp/core/server-class.js', () => ({
  OmnySysMCPServer: vi.fn()
}));

vi.mock('#core/unified-server.js', () => ({
  OmnySysUnifiedServer: vi.fn()
}));

const { resolveProjectPath } = await import('#cli/utils/paths.js');
const { serveLogic, serve } = await import('#cli/commands/serve.js');

describe('serveLogic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(resolveProjectPath).mockImplementation((p) => p || '/default/path');
  });

  it('returns success with unified mode by default', async () => {
    const result = await serveLogic('/my/project', { silent: true });

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.mode).toBe('unified');
    expect(result.serverConfig.unified).toBe(true);
    expect(result.serverConfig.legacy).toBe(false);
  });

  it('returns legacy mode when legacy option is true', async () => {
    const result = await serveLogic('/my/project', { silent: true, legacy: true });

    expect(result.success).toBe(true);
    expect(result.mode).toBe('legacy');
    expect(result.serverConfig.unified).toBe(false);
    expect(result.serverConfig.legacy).toBe(true);
  });

  it('returns legacy mode when unified is false', async () => {
    const result = await serveLogic('/my/project', { silent: true, unified: false });

    expect(result.success).toBe(true);
    expect(result.mode).toBe('legacy');
  });

  it('prefers legacy over unified when both are set', async () => {
    const result = await serveLogic('/my/project', { silent: true, legacy: true, unified: true });

    expect(result.mode).toBe('legacy');
  });

  it('resolves project path', async () => {
    vi.mocked(resolveProjectPath).mockReturnValue('/resolved/path');

    const result = await serveLogic('./relative', { silent: true });

    expect(result.projectPath).toBe('/resolved/path');
    expect(resolveProjectPath).toHaveBeenCalledWith('./relative');
  });

  it('uses default path when no project provided', async () => {
    vi.mocked(resolveProjectPath).mockReturnValue('/default/path');

    const result = await serveLogic(null, { silent: true });

    expect(result.projectPath).toBe('/default/path');
  });

  it('includes mockServer option in result', async () => {
    const result = await serveLogic('/my/project', { silent: true, mockServer: true });

    expect(result.success).toBe(true);
  });
});

describe('serve', () => {
  it('exports serve function', () => {
    expect(typeof serve).toBe('function');
  });
});
