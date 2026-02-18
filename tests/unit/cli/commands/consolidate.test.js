import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

vi.mock('#core/orchestrator/index.js', () => ({
  Orchestrator: vi.fn().mockImplementation(function() {
    this._listeners = {};
    this.on = (event, callback) => {
      if (!this._listeners[event]) this._listeners[event] = [];
      this._listeners[event].push(callback);
    };
    this.initialize = () => {
      setImmediate(() => {
        if (this._listeners['analysis:complete']) {
          this._listeners['analysis:complete'].forEach(cb => cb({ iterations: 1, totalFiles: 5 }));
        }
      });
    };
  })
}));

vi.mock('#layer-c/storage/setup/index.js', () => ({
  hasExistingAnalysis: vi.fn()
}));

const { hasExistingAnalysis } = await import('#layer-c/storage/setup/index.js');
const { consolidateLogic, consolidate } = await import('#cli/commands/consolidate.js');

describe('consolidateLogic', () => {
  let tempDir;
  let originalCwd;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'consolidate-test-'));
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

    const result = await consolidateLogic(tempDir, { silent: true });

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.error).toBe('No analysis data found');
  });

  it('returns success when analysis data exists', async () => {
    vi.mocked(hasExistingAnalysis).mockResolvedValue(true);

    await fs.writeFile(path.join(tempDir, 'system-map-enhanced.json'), JSON.stringify({
      metadata: { totalFiles: 10 },
      files: {}
    }));

    const result = await consolidateLogic(tempDir, { silent: true });

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.stats).toBeDefined();
  });

  it('returns stats from analysis', async () => {
    vi.mocked(hasExistingAnalysis).mockResolvedValue(true);

    await fs.writeFile(path.join(tempDir, 'system-map-enhanced.json'), JSON.stringify({
      metadata: { totalFiles: 15 },
      files: {}
    }));

    const result = await consolidateLogic(tempDir, { silent: true });

    expect(result.stats.totalFiles).toBe(5);
    expect(result.stats.totalIssues).toBe(0);
  });

  it('handles issues report when available', async () => {
    vi.mocked(hasExistingAnalysis).mockResolvedValue(true);

    await fs.writeFile(path.join(tempDir, 'system-map-enhanced.json'), JSON.stringify({
      metadata: { totalFiles: 5 },
      files: {}
    }));

    const omnysysDir = path.join(tempDir, '.omnysysdata');
    await fs.mkdir(omnysysDir, { recursive: true });
    await fs.writeFile(path.join(omnysysDir, 'semantic-issues.json'), JSON.stringify({
      stats: {
        totalIssues: 3,
        bySeverity: { high: 1, medium: 1, low: 1 }
      }
    }));

    const result = await consolidateLogic(tempDir, { silent: true });

    expect(result.stats.totalIssues).toBe(3);
  });

  it('resolves project path correctly', async () => {
    vi.mocked(hasExistingAnalysis).mockResolvedValue(true);

    await fs.writeFile(path.join(tempDir, 'system-map-enhanced.json'), JSON.stringify({
      metadata: { totalFiles: 1 },
      files: {}
    }));

    const result = await consolidateLogic('.', { silent: true });

    expect(result.success).toBe(true);
  });
});

describe('consolidate', () => {
  it('exports consolidate function', () => {
    expect(typeof consolidate).toBe('function');
  });

  it('calls process.exit with exitCode from logic', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});
    vi.mocked(hasExistingAnalysis).mockResolvedValue(false);
    
    await consolidate('/nonexistent');
    
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });
});
