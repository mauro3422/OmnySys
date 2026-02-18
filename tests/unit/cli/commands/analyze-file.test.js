import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

vi.mock('#layer-a/storage/storage-manager/setup/index.js', () => ({
  hasExistingAnalysis: vi.fn().mockResolvedValue(true)
}));

vi.mock('#layer-a/indexer.js', () => ({
  indexProject: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('#cli/commands/analyze.js', () => ({
  analyzeLogic: vi.fn().mockResolvedValue({ success: true, exitCode: 0 })
}));

const { hasExistingAnalysis } = await import('#layer-a/storage/storage-manager/setup/index.js');
const { indexProject } = await import('#layer-a/indexer.js');
const { analyzeLogic } = await import('#cli/commands/analyze.js');
const { analyzeFileLogic, analyzeFile } = await import('#cli/commands/analyze-file.js');

describe('analyzeFileLogic', () => {
  let tempDir;
  let originalCwd;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'analyze-file-test-'));
    originalCwd = process.cwd;
    process.cwd = () => tempDir;
    vi.clearAllMocks();
  });

  afterEach(async () => {
    process.cwd = originalCwd;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('returns error when no filePath provided', async () => {
    const result = await analyzeFileLogic(null, { silent: true });
    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.error).toBe('No file specified');
  });

  it('returns error when filePath is empty string', async () => {
    const result = await analyzeFileLogic('', { silent: true });
    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.error).toBe('No file specified');
  });

  it('resolves relative path to absolute path', async () => {
    const testFile = path.join(tempDir, 'test.js');
    await fs.writeFile(testFile, 'export const hello = () => "world";');

    const packageJson = path.join(tempDir, 'package.json');
    await fs.writeFile(packageJson, JSON.stringify({ name: 'test-project' }));

    vi.mocked(hasExistingAnalysis).mockResolvedValueOnce(true);
    vi.mocked(indexProject).mockResolvedValueOnce(undefined);

    const result = await analyzeFileLogic('test.js', { silent: true });

    expect(result.success).toBe(true);
    expect(result.projectPath).toBe(tempDir);
    expect(result.relativeFilePath).toBe('test.js');
  });

  it('handles absolute file paths', async () => {
    const testFile = path.join(tempDir, 'absolute-test.js');
    await fs.writeFile(testFile, 'export const test = 1;');
    await fs.writeFile(path.join(tempDir, 'package.json'), '{}');

    vi.mocked(hasExistingAnalysis).mockResolvedValueOnce(true);
    vi.mocked(indexProject).mockResolvedValueOnce(undefined);

    const result = await analyzeFileLogic(testFile, { silent: true });

    expect(result.projectPath).toBe(tempDir);
    expect(result.success).toBe(true);
  });

  it('calls analyzeLogic when no existing analysis', async () => {
    vi.mocked(hasExistingAnalysis).mockResolvedValueOnce(false);
    vi.mocked(analyzeLogic).mockResolvedValueOnce({ success: true, exitCode: 0 });

    const testFile = path.join(tempDir, 'test.js');
    await fs.writeFile(testFile, 'export const test = 1;');
    await fs.writeFile(path.join(tempDir, 'package.json'), '{}');

    const result = await analyzeFileLogic('test.js', { silent: true });

    expect(analyzeLogic).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  it('returns error when indexProject throws', async () => {
    vi.mocked(hasExistingAnalysis).mockResolvedValueOnce(true);
    vi.mocked(indexProject).mockRejectedValueOnce(new Error('Index failed'));

    const testFile = path.join(tempDir, 'test.js');
    await fs.writeFile(testFile, 'export const test = 1;');
    await fs.writeFile(path.join(tempDir, 'package.json'), '{}');

    const result = await analyzeFileLogic('test.js', { silent: true });

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.error).toBe('Index failed');
  });
});

describe('analyzeFile', () => {
  it('exports analyzeFile function', () => {
    expect(typeof analyzeFile).toBe('function');
  });

  it('calls process.exit with exitCode from logic', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});
    
    await analyzeFile(null);
    
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });
});
