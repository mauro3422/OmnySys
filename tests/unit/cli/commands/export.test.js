import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

vi.mock('#layer-a/query/apis/export-api.js', () => ({
  exportFullSystemMapToFile: vi.fn()
}));

vi.mock('#layer-c/storage/setup/index.js', () => ({
  hasExistingAnalysis: vi.fn()
}));

const { hasExistingAnalysis } = await import('#layer-c/storage/setup/index.js');
const { exportFullSystemMapToFile } = await import('#layer-a/query/apis/export-api.js');
const { exportMapLogic, exportMap } = await import('#cli/commands/export.js');

describe('exportMapLogic', () => {
  let tempDir;
  let originalCwd;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'export-test-'));
    originalCwd = process.cwd;
    process.cwd = () => tempDir;
    vi.clearAllMocks();
  });

  afterEach(async () => {
    process.cwd = originalCwd;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('returns error when no analysis data exists', async () => {
    vi.mocked(hasExistingAnalysis).mockResolvedValue(false);

    const result = await exportMapLogic(tempDir, { silent: true });

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.error).toBe('No analysis data found');
  });

  it('returns success when export succeeds', async () => {
    vi.mocked(hasExistingAnalysis).mockResolvedValue(true);
    vi.mocked(exportFullSystemMapToFile).mockResolvedValue({
      success: true,
      filePath: path.join(tempDir, 'system-map-export.json'),
      sizeKB: 12.5,
      filesExported: 10
    });

    const result = await exportMapLogic(tempDir, { silent: true });

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.filePath).toBeDefined();
    expect(result.sizeKB).toBe(12.5);
    expect(result.filesExported).toBe(10);
  });

  it('returns error when export fails', async () => {
    vi.mocked(hasExistingAnalysis).mockResolvedValue(true);
    vi.mocked(exportFullSystemMapToFile).mockResolvedValue({
      success: false
    });

    const result = await exportMapLogic(tempDir, { silent: true });

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
  });

  it('handles exceptions during export', async () => {
    vi.mocked(hasExistingAnalysis).mockResolvedValue(true);
    vi.mocked(exportFullSystemMapToFile).mockRejectedValue(new Error('Write failed'));

    const result = await exportMapLogic(tempDir, { silent: true });

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.error).toBe('Write failed');
  });

  it('resolves project path correctly', async () => {
    vi.mocked(hasExistingAnalysis).mockResolvedValue(true);
    vi.mocked(exportFullSystemMapToFile).mockResolvedValue({
      success: true,
      filePath: path.join(tempDir, 'export.json'),
      sizeKB: 5,
      filesExported: 3
    });

    const result = await exportMapLogic('.', { silent: true });

    expect(result.success).toBe(true);
    expect(exportFullSystemMapToFile).toHaveBeenCalledWith(tempDir);
  });
});

describe('exportMap', () => {
  it('exports exportMap function', () => {
    expect(typeof exportMap).toBe('function');
  });

  it('calls process.exit with exitCode from logic', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});
    vi.mocked(hasExistingAnalysis).mockResolvedValue(false);
    
    await exportMap('/nonexistent');
    
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });
});
