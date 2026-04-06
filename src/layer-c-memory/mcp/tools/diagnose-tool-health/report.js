import {
  buildPipelineHealthPropagationPlan,
  formatToolHealthDashboard,
  summarizePropagationPlan
} from '../../../../shared/compiler/index.js';
import { generateRecommendations } from '../diagnose-tool-health-analysis-rules.js';

export function buildToolHealthMap(toolStats) {
  const toolHealthMap = {};

  for (const [tool, stats] of Object.entries(toolStats)) {
    toolHealthMap[tool] = {
      successRate: stats.successRate,
      avgRepairScore: stats.avgRepairScore,
      avgDuration: stats.avgDuration,
      thrashingCount: stats.thrashingCount,
      status: stats.successRate >= 95 ? 'excellent'
        : stats.successRate >= 80 ? 'good'
          : stats.successRate >= 60 ? 'fair'
            : 'poor',
      lastError: stats.lastError
    };
  }

  return toolHealthMap;
}

export function buildToolHealthPropagation(toolStats, summary, toolHealthMap) {
  return {
    decision: summary.failedRuns === 0 ? 'approve' : 'review',
    mode: summary.failedRuns === 0 ? 'alert_and_recommend' : 'alert_and_review',
    warningCount: summary.warningAlerts || 0,
    impactedFileCount: Math.max(1, summary.uniqueTools || 1),
    candidateCount: summary.totalAlerts || 0,
    topImpactedFiles: Object.entries(toolHealthMap)
      .sort((left, right) => {
        const leftScore = Number(left[1]?.successRate || 0);
        const rightScore = Number(right[1]?.successRate || 0);
        return leftScore - rightScore;
      })
      .slice(0, 5)
      .map(([tool, stats]) => ({
        filePath: tool,
        name: tool,
        successRate: stats.successRate,
        thrashingCount: stats.thrashingCount,
        avgDuration: stats.avgDuration
      })),
    topCandidates: Object.entries(toolStats)
      .filter(([, stats]) => stats.successRate < 90 || stats.thrashingCount > 0)
      .slice(0, 5)
      .map(([tool, stats]) => ({
        name: tool,
        successRate: stats.successRate,
        thrashingCount: stats.thrashingCount,
        avgDuration: stats.avgDuration
      })),
    connectedSystems: [
      { name: 'tool_health', role: 'evidence' },
      { name: 'watcher', role: 'persistence' },
      { name: 'status_panel', role: 'visibility' },
      { name: 'health_snapshot', role: 'history' },
      { name: 'compiler_explainability', role: 'explainability' },
      { name: 'cache_policy', role: 'freshness' },
      { name: 'drift_assessment', role: 'governance' }
    ]
  };
}

export function generateDiagnosticReport(analysis, options = {}) {
  const {
    toolStats,
    toolTrends,
    dailyMetrics,
    errorPatterns,
    priorityIssues,
    alerts,
    summary
  } = analysis;
  const {
    includeDashboard = true,
    includeDetails = true,
    propagationPlan = null
  } = options;

  const toolHealthMap = buildToolHealthMap(toolStats);
  const dashboard = includeDashboard
    ? formatToolHealthDashboard(toolHealthMap, alerts, toolTrends)
    : null;
  const propagation = propagationPlan || buildPipelineHealthPropagationPlan(
    buildToolHealthPropagation(toolStats, summary, toolHealthMap)
  );

  return {
    timestamp: new Date().toISOString(),
    dashboard,
    summary: {
      totalRuns: summary.totalRuns,
      successfulRuns: summary.successfulRuns,
      failedRuns: summary.failedRuns,
      uniqueTools: summary.uniqueTools,
      avgRepairScore: summary.avgRepairScore,
      overallSuccessRate: summary.totalRuns > 0 ? (summary.successfulRuns / summary.totalRuns) * 100 : 0,
      healthStatus: summary.failedRuns === 0 ? 'healthy' : 'degraded',
      totalAlerts: summary.totalAlerts,
      criticalAlerts: summary.criticalAlerts,
      warningAlerts: summary.warningAlerts
    },
    toolHealth: includeDetails ? toolHealthMap : undefined,
    toolTrends: includeDetails ? toolTrends : undefined,
    alerts,
    priorityIssues,
    errorPatterns,
    dailyMetrics: includeDetails ? dailyMetrics : undefined,
    recommendations: generateRecommendations(summary, priorityIssues, alerts),
    propagation: summarizePropagationPlan(propagation)
  };
}
