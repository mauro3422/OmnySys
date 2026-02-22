/**
 * @fileoverview Verification Mocks
 *
 * Mocks para tests de integración de Verification.
 *
 * @module tests/integration/helpers/verification-mocks
 */

import { vi } from 'vitest';

export const createMockDataLoader = (data) => ({
  loadAll: vi.fn().mockResolvedValue(data),
  getStats: vi.fn().mockReturnValue({ filesLoaded: Object.keys(data).length })
});

export const createMockValidator = (result) => ({
  validate: vi.fn().mockResolvedValue(result),
  name: result.name || 'mock-validator'
});

export const createMockVerificationOrchestrator = () => ({
  verify: vi.fn().mockResolvedValue({
    report: { status: 'passed', stats: { validatorsRun: 2, totalIssues: 0 } },
    certificate: { status: 'passed', metrics: { issuesFound: 0 } },
    passed: true
  }),
  getQuickStatus: vi.fn().mockReturnValue({
    status: 'passed',
    issues: { total: 0, critical: 0, high: 0, medium: 0, low: 0, info: 0 },
    files: { total: 10, analyzed: 10 }
  })
});

export const createMockDataDir = () => ({
  atoms: new Map(),
  files: new Map(),
  connections: [],
  cache: {}
});
