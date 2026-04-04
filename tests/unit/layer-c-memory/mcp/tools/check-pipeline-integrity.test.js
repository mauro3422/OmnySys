import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  verify: vi.fn(),
  generateReport: vi.fn(),
  buildIntegrityGuardPropagationPlan: vi.fn(),
  summarizePropagationPlan: vi.fn(),
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn()
  }))
}));

vi.mock('../../../../../src/core/meta-detector/pipeline-integrity-detector.js', () => ({
  PipelineIntegrityDetector: class PipelineIntegrityDetector {
    constructor() {}
    verify(...args) {
      return mocks.verify(...args);
    }
  }
}));

vi.mock('../../../../../src/core/meta-detector/integrity-dashboard.js', () => ({
  IntegrityDashboard: class IntegrityDashboard {
    generateReport(...args) {
      return mocks.generateReport(...args);
    }
    generateConsoleSummary() {
      return 'console summary';
    }
  }
}));

vi.mock('../../../../../src/utils/logger.js', () => ({
  createLogger: mocks.createLogger
}));

vi.mock('../../../../../src/shared/compiler/index.js', () => ({
  buildIntegrityGuardPropagationPlan: mocks.buildIntegrityGuardPropagationPlan,
  summarizePropagationPlan: mocks.summarizePropagationPlan
}));

import { check_pipeline_integrity } from '../../../../../src/layer-c-memory/mcp/tools/check-pipeline-integrity.js';

beforeEach(() => {
  vi.clearAllMocks();

  mocks.verify.mockResolvedValue([
    {
      name: 'database_health',
      passed: false,
      severity: 'high',
      details: { reason: 'broken' },
      recommendation: 'rebuild database health'
    },
    {
      name: 'calledBy_resolution',
      passed: true,
      severity: 'medium',
      details: { reason: 'ok' },
      recommendation: 'keep going'
    }
  ]);

  mocks.generateReport.mockResolvedValue({
    overallHealth: 78,
    grade: 'C+',
    timestamp: '2026-04-03T00:00:00.000Z',
    summary: {
      totalChecks: 2,
      passedChecks: 1,
      failedChecks: 1,
      criticalIssues: 1,
      warnings: 0
    },
    criticalIssues: [
      { check: 'database_health', recommendation: 'rebuild database health' }
    ],
    warnings: [],
    recommendations: [
      { priority: 'critical', action: 'fix integrity', reason: 'broken', estimatedEffort: '1h' }
    ],
    detailedResults: []
  });

  mocks.buildIntegrityGuardPropagationPlan.mockReturnValue({
    changeType: 'integrity_guard',
    decision: 'review',
    mode: 'alert_and_review',
    violationCount: 1,
    impactedFileCount: 1,
    connectedSystems: [{ name: 'integrity_guard', role: 'evidence' }]
  });

  mocks.summarizePropagationPlan.mockImplementation((plan) => plan);
});

describe('check_pipeline_integrity', () => {
  it('attaches a propagation summary to integrity reports', async () => {
    const result = await check_pipeline_integrity({}, { projectPath: 'C:/Dev/OmnySystem' });

    expect(result.success).toBe(true);
    expect(result.data.propagation).toMatchObject({
      changeType: 'integrity_guard',
      decision: 'review',
      mode: 'alert_and_review'
    });
    expect(mocks.buildIntegrityGuardPropagationPlan).toHaveBeenCalled();
  });
});
