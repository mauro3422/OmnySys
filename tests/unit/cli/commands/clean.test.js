import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

vi.mock('#cli/utils/paths.js', () => ({
  exists: vi.fn(),
  resolveProjectPath: vi.fn((p) => p || process.cwd())
}));

const { exists, resolveProjectPath } = await import('#cli/utils/paths.js');
const { cleanLogic, clean } = await import('#cli/commands/clean.js');

describe('cleanLogic', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'clean-test-'));
    vi.clearAllMocks();
    vi.mocked(resolveProjectPath).mockImplementation((p) => p || tempDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('removes .aver directory when it exists', async () => {
    const averDir = path.join(tempDir, '.aver');
    await fs.mkdir(averDir);
    await fs.writeFile(path.join(averDir, 'test.txt'), 'data');

    vi.mocked(exists).mockImplementation(async (p) => {
      if (p.includes('.aver') && !p.includes('omnysysdata')) return true;
      return false;
    });

    const result = await cleanLogic(tempDir, { silent: true });

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.cleaned).toContain('.aver/');
  });

  it('removes omnysysdata directory when it exists', async () => {
    const omnysysDir = path.join(tempDir, 'omnysysdata');
    await fs.mkdir(omnysysDir);
    await fs.writeFile(path.join(omnysysDir, 'test.txt'), 'data');

    vi.mocked(exists).mockImplementation(async (p) => {
      if (p.includes('omnysysdata')) return true;
      return false;
    });

    const result = await cleanLogic(tempDir, { silent: true });

    expect(result.success).toBe(true);
    expect(result.cleaned).toContain('omnysysdata/');
  });

  it('removes both directories when they exist', async () => {
    vi.mocked(exists).mockResolvedValue(true);

    const result = await cleanLogic(tempDir, { silent: true });

    expect(result.success).toBe(true);
    expect(result.cleaned).toContain('.aver/');
    expect(result.cleaned).toContain('omnysysdata/');
    expect(result.cleanedCount).toBe(2);
  });

  it('returns empty cleaned when no directories exist', async () => {
    vi.mocked(exists).mockResolvedValue(false);

    const result = await cleanLogic(tempDir, { silent: true });

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.cleanedCount).toBe(0);
    expect(result.notFound).toContain('.aver/');
    expect(result.notFound).toContain('omnysysdata/');
  });

  it('returns project path in result', async () => {
    vi.mocked(exists).mockResolvedValue(false);

    const result = await cleanLogic('/some/project', { silent: true });

    expect(result.projectPath).toBe('/some/project');
  });
});

describe('clean', () => {
  it('exports clean function', () => {
    expect(typeof clean).toBe('function');
  });

  it('calls process.exit with exitCode from logic', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});
    vi.mocked(exists).mockResolvedValue(false);

    await clean('/some/path');

    expect(exitSpy).toHaveBeenCalledWith(0);
    exitSpy.mockRestore();
  });
});
