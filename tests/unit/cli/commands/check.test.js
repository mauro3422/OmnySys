import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

vi.mock('#core/storage/setup/index.js', () => ({
  hasExistingAnalysis: vi.fn()
}));

const { hasExistingAnalysis } = await import('#core/storage/setup/index.js');
const { checkLogic, check } = await import('#cli/commands/check.js');

describe('checkLogic', () => {
  let tempDir;
  let originalCwd;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'check-test-'));
    originalCwd = process.cwd;
    process.cwd = () => tempDir;
    vi.clearAllMocks();
  });

  afterEach(async () => {
    process.cwd = originalCwd;
    await fs.rm(tempDir, { recursive: true, force: true });
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
    vi.mocked(hasExistingAnalysis).mockResolvedValue(false);

    const testFile = path.join(tempDir, 'test.js');
    await fs.writeFile(testFile, 'export const test = 1;');

    const result = await checkLogic(testFile, { silent: true });

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.error).toBe('No analysis data found');
  });

  it('returns error when file not found in system map', async () => {
    vi.mocked(hasExistingAnalysis).mockResolvedValue(true);

    await fs.writeFile(path.join(tempDir, 'system-map-enhanced.json'), JSON.stringify({
      files: {
        'src/other.js': { functions: [], exports: [], imports: [] }
      }
    }));

    const testFile = path.join(tempDir, 'test.js');
    await fs.writeFile(testFile, 'export const test = 1;');

    const result = await checkLogic('test.js', { silent: true });

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.error).toContain('File not found in analysis');
  });

  it('returns file data when file exists in system map', async () => {
    vi.mocked(hasExistingAnalysis).mockResolvedValue(true);

    const systemMap = {
      files: {
        'test.js': {
          functions: [{ name: 'hello' }],
          exports: [{ name: 'default' }],
          imports: [{ source: 'lodash' }],
          dependsOn: ['utils.js'],
          usedBy: ['main.js'],
          riskScore: { total: 5, severity: 'medium' }
        }
      }
    };

    await fs.writeFile(path.join(tempDir, 'system-map-enhanced.json'), JSON.stringify(systemMap));

    const result = await checkLogic('test.js', { silent: true });

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.fileData).toBeDefined();
    expect(result.fileData.functions).toHaveLength(1);
    expect(result.fileData.exports).toHaveLength(1);
    expect(result.output).toContain('FILE METRICS');
  });

  it('includes semantic connections in output', async () => {
    vi.mocked(hasExistingAnalysis).mockResolvedValue(true);

    const systemMap = {
      files: {
        'test.js': {
          functions: [],
          exports: [],
          imports: [],
          semanticConnections: [
            { type: 'event', target: 'click', key: 'onclick' }
          ]
        }
      }
    };

    await fs.writeFile(path.join(tempDir, 'system-map-enhanced.json'), JSON.stringify(systemMap));

    const result = await checkLogic('test.js', { silent: true });

    expect(result.success).toBe(true);
    expect(result.output).toContain('SEMANTIC CONNECTIONS');
  });

  it('includes side effects in output', async () => {
    vi.mocked(hasExistingAnalysis).mockResolvedValue(true);

    const systemMap = {
      files: {
        'test.js': {
          functions: [],
          exports: [],
          imports: [],
          sideEffects: {
            usesLocalStorage: true,
            makesNetworkCalls: true,
            accessesWindow: false,
            hasEventListeners: false,
            hasGlobalAccess: false
          }
        }
      }
    };

    await fs.writeFile(path.join(tempDir, 'system-map-enhanced.json'), JSON.stringify(systemMap));

    const result = await checkLogic('test.js', { silent: true });

    expect(result.success).toBe(true);
    expect(result.output).toContain('SIDE EFFECTS');
    expect(result.output).toContain('localStorage');
  });

  it('handles path normalization', async () => {
    vi.mocked(hasExistingAnalysis).mockResolvedValue(true);

    const systemMap = {
      files: {
        'src/utils/test.js': {
          functions: [],
          exports: [],
          imports: []
        }
      }
    };

    await fs.writeFile(path.join(tempDir, 'system-map-enhanced.json'), JSON.stringify(systemMap));

    const result = await checkLogic('utils/test.js', { silent: true });

    expect(result.success).toBe(true);
    expect(result.matchedPath).toBe('src/utils/test.js');
  });

  it('handles errors gracefully', async () => {
    vi.mocked(hasExistingAnalysis).mockResolvedValue(true);

    await fs.writeFile(path.join(tempDir, 'system-map-enhanced.json'), 'invalid json');

    const result = await checkLogic('test.js', { silent: true });

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
  });
});

describe('check', () => {
  it('exports check function', () => {
    expect(typeof check).toBe('function');
  });

  it('calls process.exit with exitCode from logic', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});
    
    await check(null);
    
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });
});
