/**
 * @fileoverview tool-runs-surface.js
 * Canonical surface for MCP tool execution telemetry.
 *
 * Source of truth: mcp_tool_runs table (55+ rows)
 * Control plane field: Tools
 *
 * Exposes tool success rates, duration, repair outcomes,
 * and noise patterns as canonical read APIs.
 */

/**
 * Loads tool runs telemetry summary.
 * @param {object} db - SQLite database connection
 * @param {object} [options] - Query options
 * @param {number} [options.lastN=100] - Number of recent runs
 * @returns {object} Tool runs summary
 */
export function loadToolRuns(db, options = {}) {
  const { lastN = 100 } = options;

  // Overall stats
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_runs,
      COUNT(CASE WHEN success = 1 THEN 1 END) as success_count,
      COUNT(CASE WHEN success = 0 THEN 1 END) as failure_count,
      AVG(CASE WHEN duration_ms IS NOT NULL AND duration_ms > 0 THEN duration_ms END) as avg_duration_ms,
      MAX(duration_ms) as max_duration_ms,
      COUNT(CASE WHEN repair_outcome = 'repaired' THEN 1 END) as repaired_count,
      COUNT(CASE WHEN repair_outcome = 'failed' THEN 1 END) as repair_failed_count,
      COUNT(CASE WHEN noise_score > 50 THEN 1 END) as noisy_runs,
      MIN(started_at) as first_run,
      MAX(ended_at) as last_run
    FROM mcp_tool_runs
  `).get();

  // Recent runs
  const recentRuns = db.prepare(`
    SELECT tool_name, success, duration_ms, error_message, repair_outcome,
           noise_score, scope_path, focus_path, started_at, ended_at
    FROM mcp_tool_runs
    ORDER BY id DESC
    LIMIT ?
  `).all(lastN);

  // By tool
  const byTool = db.prepare(`
    SELECT tool_name,
           COUNT(*) as total,
           COUNT(CASE WHEN success = 1 THEN 1 END) as successes,
           COUNT(CASE WHEN success = 0 THEN 1 END) as failures,
           AVG(CASE WHEN duration_ms > 0 THEN duration_ms END) as avg_duration,
           AVG(CASE WHEN noise_score IS NOT NULL THEN noise_score END) as avg_noise,
           COUNT(CASE WHEN repair_outcome = 'repaired' THEN 1 END) as repairs
    FROM mcp_tool_runs
    WHERE tool_name IS NOT NULL
    GROUP BY tool_name
    ORDER BY total DESC
    LIMIT 30
  `).all();

  // Noisy tools
  const noisyTools = db.prepare(`
    SELECT tool_name,
           COUNT(*) as runs,
           AVG(noise_score) as avg_noise,
           MAX(noise_score) as max_noise
    FROM mcp_tool_runs
    WHERE noise_score IS NOT NULL AND noise_score > 50
    GROUP BY tool_name
    ORDER BY avg_noise DESC
    LIMIT 10
  `).all();

  const successRate = stats?.total_runs > 0
    ? ((stats.success_count || 0) / stats.total_runs * 100).toFixed(1)
    : 0;

  const repairRate = stats?.repaired_count > 0 || stats?.repair_failed_count > 0
    ? ((stats.repaired_count || 0) / ((stats.repaired_count || 0) + (stats.repair_failed_count || 0)) * 100).toFixed(1)
    : 'N/A';

  return {
    state: 'canonical',
    sourceTable: 'mcp_tool_runs',
    rowCount: stats?.total_runs || 0,
    stats: stats || {},
    successRate: parseFloat(successRate),
    repairRate,
    recentRuns: (recentRuns || []).reverse(),
    byTool: byTool || [],
    noisyTools: noisyTools || [],
    summary: buildToolRunsSummary(stats, successRate, noisyTools)
  };
}

function buildToolRunsSummary(stats, successRate, noisyTools) {
  if (!stats || stats.total_runs === 0) return 'tools=no_runs';
  const noisyCount = noisyTools?.length || 0;
  return `tools=${stats.total_runs}runs | ${successRate}%ok | ${noisyCount}noisy_tools | repairs=${stats.repaired_count || 0}`;
}

/**
 * Gets tools control plane status.
 * @param {object} db - SQLite database connection
 * @returns {object} Control plane tools status
 */
export function getToolsControlPlaneStatus(db) {
  const telemetry = loadToolRuns(db, { lastN: 50 });

  if (telemetry.rowCount === 0) {
    return {
      state: 'missing',
      reason: 'No tool runs recorded',
      recommendation: 'Tool runs are recorded during MCP tool execution.'
    };
  }

  return {
    state: telemetry.successRate >= 85 ? 'ready' : telemetry.successRate >= 70 ? 'watching' : 'degraded',
    totalRuns: telemetry.rowCount,
    successRate: telemetry.successRate,
    repairRate: telemetry.repairRate,
    avgDurationMs: Math.round(telemetry.stats?.avg_duration_ms || 0),
    noisyToolCount: telemetry.noisyTools.length,
    lastRunAt: telemetry.stats?.last_run || null,
    summary: telemetry.summary
  };
}

export default { loadToolRuns, getToolsControlPlaneStatus };
