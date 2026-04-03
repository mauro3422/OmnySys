import { describe, expect, it } from 'vitest';

import {
  buildCompilerHealthDashboard,
  buildCompilerHealthPanel,
  summarizeCompilerHealthDashboard,
  summarizeCompilerHealthPanel
} from '../../../../src/shared/compiler/compiler-health-dashboard.js';
import { buildCompilerHealthDashboardFixture } from './compiler-health-dashboard-fixtures.js';

describe('compiler-health-dashboard', () => {
  it('builds a compact health dashboard with regressions, improvements and telemetry', () => {
    const { dashboardInput, compilerExplainability, options } = buildCompilerHealthDashboardFixture();
    const dashboard = buildCompilerHealthDashboard(dashboardInput, compilerExplainability, options);

    expect(dashboard.health.mvpReady).toBe(true);
    expect(dashboard.status).toBe('ready');
    expect(dashboard.health.globalHealthScore).toBe(93);
    expect(dashboard.health.reliabilityScore).toBe(89);
    expect(dashboard.metricDictionary.global.grade).toBe('B+');
    expect(dashboard.regressors[0].metric).toBe('recentErrorCount');
    expect(dashboard.improvements[0].metric).toBe('healthScore');
    expect(dashboard.toolTelemetry.totalRuns).toBe(10);
    expect(dashboard.toolTelemetry.repairRateOnPressure).toBe(0.86);
    expect(dashboard.recommendations.length).toBeGreaterThan(0);
    expect(dashboard.recommendations.some((item) => item.source === 'propagationExpansion')).toBe(true);
    expect(dashboard.health.folderizationPropagation).toMatchObject({
      cacheKey: 'folderization:abc123',
      decision: 'approve'
    });
    expect(dashboard.daily.folderizationPropagation).toMatchObject({
      cacheKey: 'folderization:abc123',
      decision: 'approve'
    });
    expect(dashboard.health.canonicalPromotion).toMatchObject({
      promotionState: 'watching',
      candidateCount: 2
    });
    expect(dashboard.daily.canonicalPromotion).toMatchObject({
      promotionState: 'watching',
      candidateCount: 2
    });
    expect(dashboard.toolTelemetry.folderizationPropagation).toMatchObject({
      cacheKey: 'folderization:abc123',
      decision: 'approve'
    });
    expect(dashboard.health.propagationExpansionState).toBe('stale');
    expect(dashboard.archive.daily.capturedAt).toBe('2026-03-30T01:38:18.819Z');
    expect(dashboard.archive.daily.folderizationPropagation).toMatchObject({
      cacheKey: 'folderization:abc123',
      decision: 'approve'
    });
    expect(dashboard.archive.daily.canonicalPromotion).toMatchObject({
      promotionState: 'watching',
      candidateCount: 2
    });
    expect(dashboard.archive.lifetime.daysObserved).toBe(12);
    expect(dashboard.archive.lifetime.firstCapturedAt).toBe('2026-03-01T00:00:00.000Z');
    expect(dashboard.archive.lifetime.lastCapturedAt).toBe('2026-03-30T01:38:18.819Z');
    expect(dashboard.archive.lifetime.averageHealthScore).toBe(92.5);

    const compact = summarizeCompilerHealthDashboard(dashboard);
    expect(compact.health.globalHealthScore).toBe(93);
    expect(compact.health.reliabilityGrade).toBe('B+');
    expect(compact.health.successScore).toBe(91);
    expect(compact.health.folderizationPropagation).toMatchObject({
      cacheKey: 'folderization:abc123',
      decision: 'approve'
    });
    expect(compact.daily.folderizationPropagation).toMatchObject({
      cacheKey: 'folderization:abc123',
      decision: 'approve'
    });
    expect(compact.health.canonicalPromotion).toMatchObject({
      promotionState: 'watching',
      candidateCount: 2
    });
    expect(compact.daily.canonicalPromotion).toMatchObject({
      promotionState: 'watching',
      candidateCount: 2
    });
    expect(compact.toolTelemetry.folderizationPropagation).toMatchObject({
      cacheKey: 'folderization:abc123',
      decision: 'approve'
    });
    expect(compact.archive.daily.folderizationPropagation).toMatchObject({
      cacheKey: 'folderization:abc123',
      decision: 'approve'
    });
    expect(compact.archive.daily.canonicalPromotion).toMatchObject({
      promotionState: 'watching',
      candidateCount: 2
    });
    expect(compact.health.propagationExpansionState).toBe('stale');
    expect(compact.trend.velocityPerDay).toBe(1.5);
    expect(compact.regressors.length).toBeGreaterThan(0);
    expect(compact.recentErrors.errors).toBe(0);
    expect(compact.archive.lifetime.daysObserved).toBe(12);
    expect(compact.archive.daily.healthScore).toBe(97);
  });
});
