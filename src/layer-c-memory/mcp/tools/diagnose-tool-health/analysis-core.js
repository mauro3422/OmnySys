import {
  calculateToolTrend,
  generateAutomaticAlerts,
  getDailyToolMetrics
} from '../../../../shared/compiler/index.js';
import {
  detectErrorPatterns,
  prioritizeIssues
} from '../diagnose-tool-health-analysis-rules.js';

export function buildToolHealthAnalysis(repo, options = {}) {
  const { limit = 100, toolName = null, days = 7 } = options;

  let query = `
    SELECT 
      tool_name,
      success,
      error_message,
      repair_status,
      repair_score,
      alert_clearance,
      error_clearance,
      warning_clearance,
      duration_ms,
      started_at,
      ended_at
    FROM mcp_tool_runs
    WHERE ended_at >= datetime('now', '-' || ? || ' days')
  `;

  const params = [days];
  if (toolName) {
    query += ` AND tool_name = ?`;
    params.push(toolName);
  }

  query += ` ORDER BY started_at DESC LIMIT ?`;
  params.push(limit);

  const runs = repo.db.prepare(query).all(...params);
  const toolStats = {};
  const toolRuns = {};
  const errors = [];

  for (const run of runs) {
    const tool = run.tool_name;
    const stats = toolStats[tool] || (toolStats[tool] = {
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      thrashingCount: 0,
      repairedCount: 0,
      avgRepairScore: 0,
      avgDuration: 0,
      repairScores: [],
      lastError: null,
      errorCount: 0
    });

    (toolRuns[tool] || (toolRuns[tool] = [])).push(run);
    stats.totalRuns++;

    if (run.success) {
      stats.successfulRuns++;
    } else {
      stats.failedRuns++;
      stats.errorCount++;
      if (run.error_message) {
        stats.lastError = run.error_message;
        errors.push({
          tool,
          error: run.error_message,
          timestamp: run.started_at,
          repairStatus: run.repair_status,
          repairScore: run.repair_score
        });
      }
    }

    if (run.repair_status === 'thrashing') stats.thrashingCount++;
    if (run.repair_status === 'repaired') stats.repairedCount++;

    stats.repairScores.push(run.repair_score || 0);
    stats.avgRepairScore += run.repair_score || 0;
    stats.avgDuration += run.duration_ms || 0;
  }

  for (const tool of Object.keys(toolStats)) {
    const stats = toolStats[tool];
    if (stats.totalRuns > 0) {
      stats.avgRepairScore = stats.avgRepairScore / stats.totalRuns;
      stats.avgDuration = stats.avgDuration / stats.totalRuns;
      stats.successRate = (stats.successfulRuns / stats.totalRuns) * 100;
      stats.medianRepairScore = stats.repairScores.sort((a, b) => a - b)[Math.floor(stats.repairScores.length / 2)];
    }
  }

  const toolTrends = {};
  for (const [tool, toolRunList] of Object.entries(toolRuns)) {
    toolTrends[tool] = calculateToolTrend(toolRunList);
  }

  const alerts = [];
  for (const [tool, stats] of Object.entries(toolStats)) {
    const toolAlerts = generateAutomaticAlerts(stats, toolTrends[tool]);
    alerts.push(...toolAlerts.map((alert) => ({ ...alert, tool })));
  }

  const errorPatterns = detectErrorPatterns(errors);
  const priorityIssues = prioritizeIssues(toolStats, errors, alerts);
  const dailyMetrics = getDailyToolMetrics(repo.db, { toolName, days });

  return {
    toolStats,
    toolTrends,
    dailyMetrics,
    errors: errors.slice(0, 20),
    errorPatterns,
    priorityIssues,
    alerts,
    summary: {
      totalRuns: runs.length,
      successfulRuns: runs.filter((run) => run.success).length,
      failedRuns: runs.filter((run) => !run.success).length,
      uniqueTools: Object.keys(toolStats).length,
      avgRepairScore: runs.length > 0 ? runs.reduce((sum, run) => sum + (run.repair_score || 0), 0) / runs.length : 0,
      totalAlerts: alerts.length,
      criticalAlerts: alerts.filter((alert) => alert.severity === 'critical').length,
      warningAlerts: alerts.filter((alert) => alert.severity === 'warning').length
    }
  };
}
