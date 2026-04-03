import { describe, expect, it } from 'vitest';

import {
  buildCompilerHealthDashboard,
  buildCompilerHealthPanel,
  summarizeCompilerHealthPanel
} from '../../../../src/shared/compiler/compiler-health-dashboard.js';

describe('compiler-health-dashboard panel', () => {
  it('builds a one-line health panel from the dashboard', () => {
    const dashboard = buildCompilerHealthDashboard({
      projectPath: 'C:/Dev/OmnySystem',
      current: {
        globalHealthScore: 81,
        globalHealthGrade: 'B-',
        healthScore: 88,
        healthGrade: 'A',
        reliabilityScore: 73,
        reliabilityGrade: 'C',
        reliabilityState: 'limited',
        successScore: 84,
        successThreshold: 85,
        mvpReady: false,
        behaviorState: 'watchful',
        driftState: 'stable',
        driftScore: 90,
        stabilityScore: 86,
        folderizationPropagation: {
          decision: 'approve'
        },
        clientSyncState: 'blocked',
        clientSyncReason: 'client cache drift detected',
        clientSyncRecommendation: 'Refresh the client UI and verify the MCP catalog.',
        readinessReason: 'Success score 84 is below the 85 threshold.',
        toolTelemetry: {
          totalRuns: 4,
          successfulRuns: 3,
          repairedRuns: 1,
          pressureRuns: 2,
          repairYield: 0.5,
          repairRateOnPressure: 0.5,
          toolSuccessRate: 0.75,
          alertClearanceRate: 0.5,
          errorClearanceRate: 0.5,
          noiseSummary: {
            noisyToolCount: 2,
            noiseScore: 44
          },
          topTools: [{ toolName: 'mcp_omnysystem_get_health_snapshot', repairScore: 8 }]
        },
        summaryText: 'health=88/A | success=84/85'
      },
      trend: {
        status: 'improving',
        velocityPerDay: 2,
        progressScore: 3,
        improvingStreak: true,
        behaviorTrend: 1,
        summary: 'health +3'
      }
    }, null, {});

    const panel = buildCompilerHealthPanel(dashboard);

    expect(panel.headline).toContain('B- 81/85');
    expect(panel.oneLine).toContain('now=81/B-');
    expect(panel.oneLine).toContain('db=88/A');
    expect(panel.oneLine).toContain('trust=73/C');
    expect(panel.oneLine).toContain('clientsync=blocked');
    expect(panel.oneLine).toContain('folderprop=approve');
    expect(panel.oneLine).toContain('tools=3/4 ok');
    expect(panel.oneLine).toContain('repair=1/2');
    expect(panel.oneLine).toContain('noise=2/44');
    expect(panel.topRegressors).toEqual([]);
    expect(panel.topImprovements).toEqual([]);

    const compact = summarizeCompilerHealthPanel(panel);
    expect(compact.now.globalHealthScore).toBe(81);
    expect(compact.now.healthScore).toBe(88);
    expect(compact.now.folderizationPropagation).toMatchObject({
      decision: 'approve'
    });
    expect(compact.trend.velocityPerDay).toBe(2);
    expect(compact.oneLine).toContain('ready=no');
  });
});
