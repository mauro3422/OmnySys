import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const h = vi.hoisted(() => ({
  getRepository: vi.fn(),
  validateImports: vi.fn(),
  reindexFile: vi.fn(),
  retryWithBackoff: vi.fn(async (operation, options = {}) => {
    const maxRetries = options.maxRetries ?? 3;
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError;
  })
}));

vi.mock('../../../../../src/layer-c-memory/storage/repository/repository-factory.js', () => ({
  getRepository: h.getRepository
}));

vi.mock('../../../../../src/layer-c-memory/mcp/tools/validate-imports.js', () => ({
  validate_imports: h.validateImports
}));

vi.mock('../../../../../src/layer-c-memory/mcp/tools/atomic-edit/reindex.js', () => ({
  reindexFile: h.reindexFile
}));

vi.mock('../../../../../src/shared/compiler/runtime-boundary-recovery.js', () => ({
  RecoveryStrategies: {
    retryWithBackoff: h.retryWithBackoff
  }
}));

import {
  buildMutationSettlementSnapshot,
  settleMutationSnapshot
} from '../../../../../src/layer-c-memory/mcp/core/shared/mutation-settlement.js';

beforeEach(() => {
  h.getRepository.mockReset();
  h.validateImports.mockReset();
  h.reindexFile.mockReset();
  h.retryWithBackoff.mockClear();
});

describe('mutation settlement', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mutation-settlement-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('reindexes and retries when validation says the file is not indexed yet', async () => {
    const projectPath = tempDir;
    const filePath = 'src/core/file-watcher/guards/example.js';
    await fs.mkdir(path.join(tempDir, 'src/core/file-watcher/guards'), { recursive: true });
    await fs.writeFile(path.join(tempDir, filePath), 'export const example = true;\n');

    h.getRepository.mockReturnValue({
      initialized: true,
      db: { open: true }
    });

    h.validateImports
      .mockResolvedValueOnce({
        success: false,
        error: 'NOT_FOUND',
        message: `File ${filePath} not found in the canonical DB index`
      })
      .mockResolvedValueOnce({
        success: true,
        file: filePath,
        status: 'CLEAN',
        brokenImports: [],
        unusedImports: [],
        circularDependencies: []
      });

    h.reindexFile.mockResolvedValue({ success: true });

    const result = await settleMutationSnapshot({
      projectPath,
      context: {},
      snapshot: buildMutationSettlementSnapshot({
        reason: 'test',
        touchedFiles: [filePath],
        validationTargets: [filePath]
      }),
      retryOptions: {
        maxRetries: 2,
        baseDelayMs: 0,
        maxDelayMs: 0
      },
      maxValidationTargets: 1
    });

    expect(result.success).toBe(true);
    expect(result.settled).toBe(true);
    expect(result.summary.transientCount).toBe(0);
    expect(result.validations).toHaveLength(1);
    expect(result.validations[0].reindexed).toBe(true);
    expect(result.validations[0].validation.success).toBe(true);
    expect(h.reindexFile).toHaveBeenCalledTimes(1);
    expect(h.validateImports).toHaveBeenCalledTimes(2);
  });

  it('leaves a clean validation untouched when the index is already settled', async () => {
    const projectPath = tempDir;
    const filePath = 'src/core/file-watcher/guards/example-clean.js';
    await fs.mkdir(path.join(tempDir, 'src/core/file-watcher/guards'), { recursive: true });
    await fs.writeFile(path.join(tempDir, filePath), 'export const exampleClean = true;\n');

    h.getRepository.mockReturnValue({
      initialized: true,
      db: { open: true }
    });

    h.validateImports.mockResolvedValue({
      success: true,
      file: filePath,
      status: 'CLEAN',
      brokenImports: [],
      unusedImports: [],
      circularDependencies: []
    });

    const result = await settleMutationSnapshot({
      projectPath,
      context: {},
      snapshot: buildMutationSettlementSnapshot({
        reason: 'test',
        touchedFiles: [filePath],
        validationTargets: [filePath]
      }),
      retryOptions: {
        maxRetries: 1,
        baseDelayMs: 0,
        maxDelayMs: 0
      },
      maxValidationTargets: 1
    });

    expect(result.success).toBe(true);
    expect(result.settled).toBe(true);
    expect(result.validations[0].reindexed).toBe(false);
    expect(result.validations[0].validation.status).toBe('CLEAN');
    expect(h.reindexFile).not.toHaveBeenCalled();
    expect(h.validateImports).toHaveBeenCalledTimes(1);
  });
});
