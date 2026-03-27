import { buildDatabaseHealthMetrics } from './database-health-report-metrics.js';

export function buildDatabaseHealthReport({
  counts = {},
  fileUniverse = null,
  systemMapCoverage = null,
  semanticSurface = null,
  assessment = null,
  liveRowSync = null
} = {}) {
  return {
    healthy: assessment?.healthy,
    healthScore: assessment?.healthScore,
    grade: assessment?.grade,
    summary: assessment?.summary,
    metrics: buildDatabaseHealthMetrics({
      counts,
      fileUniverse,
      systemMapCoverage,
      semanticSurface,
      liveRowSync
    }),
    criticalFindings: assessment?.criticalFindings || [],
    warnings: assessment?.warnings || [],
    recommendations: assessment?.recommendations || []
  };
}
