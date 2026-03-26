import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  loadAtoms: vi.fn().mockResolvedValue([]),
  getFileAnalysis: vi.fn().mockResolvedValue(null)
}));

vi.mock('#layer-c/storage/index.js', () => ({
  loadAtoms: mocks.loadAtoms
}));

vi.mock('#layer-c/query/queries/file-query/core/single-file.js', () => ({
  getFileAnalysis: mocks.getFileAnalysis
}));

import { getFileExports } from '#layer-c/query/queries/file-query/atoms/exports-query.js';

beforeEach(() => {
  mocks.loadAtoms.mockClear();
  mocks.getFileAnalysis.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getFileExports', () => {
  it.each([
    ['src/utils/logger.js', 'createLogger'],
    ['src/utils/json-safe.js', 'safeStringifyJson']
  ])('falls back to filesystem parsing for unindexed modules: %s', async (filePath, expectedExport) => {
    const exports = await getFileExports(process.cwd(), filePath);

    expect(exports.has(expectedExport)).toBe(true);
    expect(mocks.loadAtoms).toHaveBeenCalledWith(process.cwd(), filePath);
    expect(mocks.getFileAnalysis).toHaveBeenCalledWith(process.cwd(), filePath);
  });
});
