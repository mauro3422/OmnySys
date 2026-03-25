import { describe, it, expect, vi } from 'vitest';

vi.mock('#layer-c/storage/setup/index.js', () => ({
  hasExistingAnalysis: vi.fn()
}));

vi.mock('#cli/commands/check/data-loader.js', () => ({
  loadFileData: vi.fn()
}));

const { loadFileData } = await import('#cli/commands/check/data-loader.js');
const { checkLogic, check } = await import('#cli/commands/check.js');

describe('checkLogic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when no filePath provided', async () => {
    const result = await checkLogic(null, { silent: true });
    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.error).toBe('No file specified');
  });

  it('returns error when filePath is empty string', async () => {
    const result = await checkLogic('', { silent: true });
    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.error).toBe('No file specified');
  });

  it('returns error when no analysis data exists', async () => {
    vi.mocked(loadFileData).mockResolvedValue({
      success: false,
      error: 'No analysis data found',
      exitCode: 1,
      hint: 'Run first: omnysystem analyze .'
    });

    const result = await checkLogic('test.js', { silent: true });

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.error).toBe('No analysis data found');
  });

  it('returns error when file not found in system map', async () => {
    vi.mocked(loadFileData).mockResolvedValue({
      success: false,
      error: 'File not found in analysis: test.js',
      exitCode: 1,
      availableFiles: ['src/other.js']
    });

    const result = await checkLogic('test.js', { silent: true });

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.error).toContain('File not found in analysis');
  });

  it('returns file data when file exists in system map', async () => {
    const fileData = {
      filePath: 'test.js',
      atoms: [{ name: 'hello', type: 'function' }],
      totalAtoms: 1,
      imports: [{ source: 'lodash' }],
      exports: ['default'],
      dependsOn: ['utils.js'],
      usedBy: ['main.js'],
      riskScore: { total: 5, severity: 'medium' },
      functions: [{ name: 'hello' }]
    };

    vi.mocked(loadFileData).mockResolvedValue({
      success: true,
      fileData,
      matchedPath: 'test.js',
      atoms: fileData.atoms
    });

    const result = await checkLogic('test.js', { silent: true });

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.fileData).toBeDefined();
    expect(result.fileData.functions).toBeDefined();
    expect(result.output).toContain('FILE METRICS');
  });

  it('includes semantic connections in output', async () => {
    const fileData = {
      filePath: 'test.js',
      atoms: [],
      totalAtoms: 0,
      imports: [],
      exports: [],
      semanticConnections: [
        { type: 'event', target: 'click', key: 'onclick' }
      ]
    };

    vi.mocked(loadFileData).mockResolvedValue({
      success: true,
      fileData,
      matchedPath: 'test.js',
      atoms: fileData.atoms
    });

    const result = await checkLogic('test.js', { silent: true });

    expect(result.success).toBe(true);
    expect(result.output).toContain('SEMANTIC CONNECTIONS');
  });

  it('includes side effects in output', async () => {
    const fileData = {
      filePath: 'test.js',
      atoms: [],
      totalAtoms: 0,
      imports: [],
      exports: [],
      sideEffects: {
        usesLocalStorage: true,
        makesNetworkCalls: true,
        accessesWindow: false,
        hasEventListeners: false,
        hasGlobalAccess: false
      }
    };

    vi.mocked(loadFileData).mockResolvedValue({
      success: true,
      fileData,
      matchedPath: 'test.js',
      atoms: fileData.atoms
    });

    const result = await checkLogic('test.js', { silent: true });

    expect(result.success).toBe(true);
    expect(result.output).toContain('SIDE EFFECTS');
    expect(result.output).toContain('localStorage');
  });

  it('handles path normalization', async () => {
    const fileData = {
      filePath: 'src/utils/test.js',
      atoms: [],
      totalAtoms: 0,
      imports: [],
      exports: []
    };

    vi.mocked(loadFileData).mockResolvedValue({
      success: true,
      fileData,
      matchedPath: 'src/utils/test.js',
      atoms: fileData.atoms
    });

    const result = await checkLogic('utils/test.js', { silent: true });

    expect(result.success).toBe(true);
    expect(result.matchedPath).toBe('src/utils/test.js');
  });

  it('handles errors gracefully', async () => {
    vi.mocked(loadFileData).mockRejectedValue(new Error('Database error'));

    const result = await checkLogic('test.js', { silent: true });

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.error).toContain('Database error');
  });
});

describe('check', () => {
  it('exports check function', () => {
    expect(typeof check).toBe('function');
  });

  it('calls process.exit with exitCode from logic', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});
    vi.mocked(loadFileData).mockResolvedValue({
      success: false,
      error: 'No file specified',
      exitCode: 1
    });

    await check(null);

    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });
});
