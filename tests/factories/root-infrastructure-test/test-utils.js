/**
 * @fileoverview Root Infrastructure Test Factory - Test Utils
 */

import { expect, vi } from 'vitest';

export function createTestEnvironment() {
  const mockFs = {
    files: new Map(),
    readFile: vi.fn(),
    stat: vi.fn(),
    readdir: vi.fn()
  };

  const mockGlob = vi.fn();

  return {
    mockFs,
    mockGlob,
    setupFileSystem(files) {
      files.forEach(file => {
        mockFs.files.set(file.path, file);
      });
    }
  };
}

export function assertValidSystemMap(systemMap) {
  expect(systemMap).toBeDefined();
  expect(systemMap.files).toBeDefined();
  expect(systemMap.functions).toBeDefined();
  expect(systemMap.metadata).toBeDefined();
}

export function assertValidAnalysisReport(report) {
  expect(report).toBeDefined();
  expect(report).toHaveProperty('metadata');
  expect(report).toHaveProperty('patternDetection');
  expect(report).toHaveProperty('qualityMetrics');
  expect(report).toHaveProperty('recommendations');
}


