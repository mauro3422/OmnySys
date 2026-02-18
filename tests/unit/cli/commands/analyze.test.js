import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('#layer-a/indexer.js', () => ({
  indexProject: vi.fn()
}));

vi.mock('#cli/utils/paths.js', () => ({
  resolveProjectPath: vi.fn((p) => p || process.cwd())
}));

vi.mock('#cli/help.js', () => ({
  showHelp: vi.fn()
}));

const { indexProject } = await import('#layer-a/indexer.js');
const { resolveProjectPath } = await import('#cli/utils/paths.js');
const { analyzeLogic, analyze } = await import('#cli/commands/analyze.js');

describe('analyzeLogic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(resolveProjectPath).mockImplementation((p) => p || '/default/path');
  });

  it('returns success when analysis completes', async () => {
    vi.mocked(indexProject).mockResolvedValue(undefined);

    const result = await analyzeLogic('/my/project', { silent: true });

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.projectPath).toBe('/my/project');
  });

  it('calls indexProject with correct options', async () => {
    vi.mocked(indexProject).mockResolvedValue(undefined);

    await analyzeLogic('/my/project', { silent: true, singleFile: 'test.js', verbose: false });

    expect(indexProject).toHaveBeenCalledWith('/my/project', {
      verbose: false,
      singleFile: 'test.js'
    });
  });

  it('defaults verbose to true when not silent', async () => {
    vi.mocked(indexProject).mockResolvedValue(undefined);

    await analyzeLogic('/my/project', { silent: false });

    expect(indexProject).toHaveBeenCalledWith('/my/project', {
      verbose: true,
      singleFile: null
    });
  });

  it('sets verbose to false when silent', async () => {
    vi.mocked(indexProject).mockResolvedValue(undefined);

    await analyzeLogic('/my/project', { silent: true });

    expect(indexProject).toHaveBeenCalledWith('/my/project', {
      verbose: false,
      singleFile: null
    });
  });

  it('returns error when analysis fails', async () => {
    vi.mocked(indexProject).mockRejectedValue(new Error('Analysis failed'));

    const result = await analyzeLogic('/my/project', { silent: true });

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.error).toBe('Analysis failed');
  });

  it('resolves project path', async () => {
    vi.mocked(resolveProjectPath).mockReturnValue('/resolved/path');
    vi.mocked(indexProject).mockResolvedValue(undefined);

    const result = await analyzeLogic('./relative', { silent: true });

    expect(result.projectPath).toBe('/resolved/path');
    expect(resolveProjectPath).toHaveBeenCalledWith('./relative');
  });

  it('uses default path when no project provided', async () => {
    vi.mocked(resolveProjectPath).mockReturnValue('/default/path');
    vi.mocked(indexProject).mockResolvedValue(undefined);

    const result = await analyzeLogic(null, { silent: true });

    expect(result.projectPath).toBe('/default/path');
  });

  it('handles single file mode', async () => {
    vi.mocked(indexProject).mockResolvedValue(undefined);

    const result = await analyzeLogic('/my/project', { silent: true, singleFile: 'src/test.js' });

    expect(result.success).toBe(true);
    expect(indexProject).toHaveBeenCalledWith('/my/project', {
      verbose: false,
      singleFile: 'src/test.js'
    });
  });
});

describe('analyze', () => {
  it('exports analyze function', () => {
    expect(typeof analyze).toBe('function');
  });

  it('calls process.exit with exitCode from logic', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});
    vi.mocked(indexProject).mockRejectedValue(new Error('Failed'));

    await analyze('/my/project');

    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });

  it('returns result when exitOnComplete is false', async () => {
    vi.mocked(indexProject).mockResolvedValue(undefined);

    const result = await analyze('/my/project', { exitOnComplete: false });

    expect(result.success).toBe(true);
    expect(result.projectPath).toBe('/my/project');
  });

  it('throws error when analysis fails and exitOnComplete is false', async () => {
    vi.mocked(indexProject).mockRejectedValue(new Error('Failed'));

    await expect(analyze('/my/project', { exitOnComplete: false })).rejects.toThrow('Failed');
  });
});
