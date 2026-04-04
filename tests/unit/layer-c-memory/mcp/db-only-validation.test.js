import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getFileAnalysis: vi.fn(),
  getFileExports: vi.fn(),
  getFileDependencies: vi.fn(),
  getSystemMapPersistenceCoverage: vi.fn(() => ({ status: 'complete' })),
  shouldTrustSystemMapDependencies: vi.fn(() => true),
  buildPropagationPlan: vi.fn((input = {}) => ({ ...input })),
  summarizePropagationPlan: vi.fn((plan = null) => plan)
}));

vi.mock('#layer-c/query/apis/file-api.js', () => ({
  getFileAnalysis: mocks.getFileAnalysis,
  getFileExports: mocks.getFileExports,
  getFileDependencies: mocks.getFileDependencies
}));

vi.mock('#shared/compiler/index.js', () => ({
  getSystemMapPersistenceCoverage: mocks.getSystemMapPersistenceCoverage,
  shouldTrustSystemMapDependencies: mocks.shouldTrustSystemMapDependencies,
  buildPropagationPlan: mocks.buildPropagationPlan,
  summarizePropagationPlan: mocks.summarizePropagationPlan
}));

import { ValidateImportsTool } from '#layer-c/mcp/tools/validate-imports.js';
import { validateAllExports, traceExportChain } from '#layer-c/mcp/tools/validate-exports-chain.js';
import {
  collectDatabaseImportState,
  loadIndexedFileAnalysis
} from '#layer-c/mcp/tools/validate-imports/filesystem-validation.js';

describe('DB-only validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validateAllExports returns DB_MISSING when the file is not indexed', async () => {
    mocks.getFileAnalysis.mockResolvedValueOnce(null);

    const result = await validateAllExports('/proj', 'src/missing.js');

    expect(result.valid).toBe(false);
    expect(result.validationMode).toBe('database_only');
    expect(result.compilerIndexed).toBe(false);
    expect(result.invalidCount).toBe(1);
    expect(result.invalid[0].error).toContain('DB_MISSING');
  });

  it('ValidateImportsTool returns NOT_FOUND for a file missing from the canonical DB', async () => {
    mocks.getFileAnalysis.mockResolvedValueOnce(null);

    const tool = new ValidateImportsTool();
    tool.projectPath = '/proj';
    tool.repo = { db: {} };

    const result = await tool.performAction({ filePath: 'src/missing.js' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('NOT_FOUND');
    expect(result.message).toContain('canonical DB index');
  });

  it('collectDatabaseImportState resolves imports only through DB analysis and export metadata', async () => {
    mocks.getFileAnalysis.mockImplementation(async (_projectPath, filePath) => {
      if (filePath === 'src/a.js') {
        return {
          imports: [
            {
              specifiers: [{ local: 'foo' }],
              resolvedPath: 'src/b.js'
            }
          ]
        };
      }

      if (filePath === 'src/b.js') {
        return {
          imports: []
        };
      }

      return null;
    });

    mocks.getFileExports.mockImplementation(async (_projectPath, filePath) => {
      if (filePath === 'src/b.js') {
        return new Set(['foo']);
      }

      return new Set();
    });

    const state = await collectDatabaseImportState('/proj', 'src/a.js');
    const chain = await traceExportChain('/proj', 'src/a.js', 'foo', 'src/b.js');

    expect(state.compilerIndexed).toBe(true);
    expect(state.sourceOfTruth).toBe('database');
    expect(state.propagation).toBeTruthy();
    expect(state.propagation.changeType).toBe('policy_drift');
    expect(state.broken).toHaveLength(0);
    expect(chain.found).toBe(true);
    expect(chain.originFile).toBe('src/b.js');
    expect(mocks.getFileExports).toHaveBeenCalledWith('/proj', 'src/b.js');
  });

  it('loadIndexedFileAnalysis queries canonical DB paths with file extensions intact', async () => {
    const fileRow = {
      imports_json: '["./compiler-metrics-snapshot-helpers.js"]',
      exports_json: '["buildCompilerMetricsSnapshot"]'
    };
    const atoms = [{ id: 1 }];
    const repo = {
      initialized: true,
      db: {
        open: true,
        prepare: vi.fn((sql) => {
          if (sql.includes('FROM files')) {
            return {
              get: vi.fn((path) => (path === 'src/shared/compiler/compiler-metrics-snapshot.js' ? fileRow : null))
            };
          }

          if (sql.includes('FROM atoms')) {
            return {
              all: vi.fn((path) => (path === 'src/shared/compiler/compiler-metrics-snapshot.js' ? atoms : []))
            };
          }

          throw new Error(`Unexpected SQL: ${sql}`);
        })
      }
    };

    const analysis = await loadIndexedFileAnalysis(
      '/proj',
      'src/shared/compiler/compiler-metrics-snapshot.js',
      repo
    );

    expect(analysis).not.toBeNull();
    expect(repo.db.prepare).toHaveBeenCalledWith('SELECT * FROM files WHERE path = ? AND is_removed = 0');
    expect(repo.db.prepare).toHaveBeenCalledWith('SELECT * FROM atoms WHERE file_path = ? AND is_removed = 0');
    expect(analysis.file).toBe('src/shared/compiler/compiler-metrics-snapshot.js');
    expect(analysis.path).toBe('src/shared/compiler/compiler-metrics-snapshot.js');
    expect(analysis.atomCount).toBe(1);
    expect(analysis.imports).toEqual(['./compiler-metrics-snapshot-helpers.js']);
    expect(analysis.exports).toEqual(['buildCompilerMetricsSnapshot']);
    expect(analysis.propagation).toBeTruthy();
    expect(analysis.propagation.changeType).toBe('policy_drift');
  });

  it('ValidateImportsTool surfaces circular dependency loader failures as structured errors', async () => {
    mocks.getFileAnalysis.mockResolvedValueOnce({ imports: [] });
    mocks.getFileDependencies.mockRejectedValueOnce(new Error('dependency load failed'));

    const tool = new ValidateImportsTool();
    tool.projectPath = '/proj';
    tool.repo = { db: {} };

    const result = await tool.performAction({
      filePath: 'src/a.js',
      checkCircular: true
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('VALIDATION_FAILED');
    expect(result.message).toContain('Failed to compute circular dependencies');
  });
});
