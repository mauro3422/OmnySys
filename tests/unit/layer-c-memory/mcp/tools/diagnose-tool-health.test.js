import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getRepository: vi.fn(),
  calculateToolTrend: vi.fn(),
  generateAutomaticAlerts: vi.fn(),
  getDailyToolMetrics: vi.fn(),
  formatToolHealthDashboard: vi.fn(),
  buildPipelineHealthPropagationPlan: vi.fn(),
  summarizePropagationPlan: vi.fn()
}));

vi.mock('#layer-c/storage/repository/repository-factory.js', () => ({
  getRepository: mocks.getRepository
}));

vi.mock('../../../../../src/shared/compiler/index.js', () => ({
  calculateToolTrend: mocks.calculateToolTrend,
  generateAutomaticAlerts: mocks.generateAutomaticAlerts,
  getDailyToolMetrics: mocks.getDailyToolMetrics,
  formatToolHealthDashboard: mocks.formatToolHealthDashboard,
  buildPipelineHealthPropagationPlan: mocks.buildPipelineHealthPropagationPlan,
  summarizePropagationPlan: mocks.summarizePropagationPlan
}));

import { diagnose_tool_health } from '../../../../../src/layer-c-memory/mcp/tools/diagnose-tool-health/health.js';

function buildRepo() {
  return {
    db: {
      prepare: vi.fn(() => ({
        all: vi.fn(() => ([
          {
            tool_name: 'tool_a',
            success: true,
            error_message: null,
            repair_status: 'stable',
            repair_score: 0,
            alert_clearance: 0,
            error_clearance: 0,
            warning_clearance: 0,
            duration_ms: 10,
            started_at: '2026-04-03T00:00:00.000Z',
            ended_at: '2026-04-03T00:00:01.000Z'
          },
          {
            tool_name: 'tool_b',
            success: false,
            error_message: 'boom',
            repair_status: 'thrashing',
            repair_score: -2,
            alert_clearance: 0,
            error_clearance: 0,
            warning_clearance: 0,
            duration_ms: 20,
            started_at: '2026-04-03T00:01:00.000Z',
            ended_at: '2026-04-03T00:01:01.000Z'
          }
        ]))
      }))
    }
  };
}

beforeEach(() => {
  vi.clearAllMocks();

  mocks.getRepository.mockReturnValue(buildRepo());
  mocks.calculateToolTrend.mockReturnValue({ trend: 'stable' });
  mocks.generateAutomaticAlerts.mockReturnValue([
    { severity: 'critical', type: 'thrashing', tool: 'tool_b', message: 'thrashing detected' }
  ]);
  mocks.getDailyToolMetrics.mockReturnValue([]);
  mocks.formatToolHealthDashboard.mockReturnValue('dashboard');
  mocks.buildPipelineHealthPropagationPlan.mockReturnValue({
    changeType: 'pipeline_health',
    decision: 'review',
    mode: 'alert_and_review',
    impactedFileCount: 2,
    rewriteCount: 1,
    validationTargetCount: 2,
    connectedSystems: [{ name: 'tool_health', role: 'evidence' }]
  });
  mocks.summarizePropagationPlan.mockImplementation((plan) => plan);
});

describe('diagnose_tool_health', () => {
  it('attaches a propagation summary to tool health reports', async () => {
    const result = await diagnose_tool_health({}, { projectPath: 'C:/Dev/OmnySystem' });

    expect(result.success).toBe(true);
    expect(result.mode).toBe('full');
    expect(result.report.propagation).toMatchObject({
      changeType: 'pipeline_health',
      decision: 'review',
      mode: 'alert_and_review'
    });
    expect(mocks.buildPipelineHealthPropagationPlan).toHaveBeenCalled();
  });
});
