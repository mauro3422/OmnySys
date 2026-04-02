/**
 * @fileoverview Tool health trending and automatic alerts.
 * 
 * Provides trending analysis for MCP tool runs over time and
 * automatic alert generation when metrics cross thresholds.
 * 
 * @module shared/compiler/tool-health-trending
 */

import { asNumber } from './tool-run-telemetry-helpers.js';

/**
 * Umbrales para alertas automáticas
 */
export const ALERT_THRESHOLDS = {
  successRate: {
    critical: 50,   // < 50% = critical
    warning: 80,    // < 80% = warning
    healthy: 95     // >= 95% = healthy
  },
  repairScore: {
    critical: -3,   // < -3 = critical
    warning: -1,    // < -1 = warning
    healthy: 0      // >= 0 = healthy
  },
  avgDuration: {
    slow: 5000,     // > 5s = slow warning
    critical: 10000 // > 10s = critical
  },
  thrashingCount: {
    warning: 3,     // >= 3 thrashing runs = warning
    critical: 5     // >= 5 thrashing runs = critical
  }
};

/**
 * Calcula trending de métricas para una herramienta en el tiempo
 * @param {Array} runs - Array de tool runs ordenados por fecha
 * @returns {Object} Trending data
 */
export function calculateToolTrend(runs) {
  if (!runs || runs.length < 2) {
    return {
      status: 'insufficient_data',
      trend: null,
      period: null
    };
  }

  // Ordenar por fecha
  const sorted = [...runs].sort((a, b) => 
    new Date(a.started_at || 0) - new Date(b.started_at || 0)
  );

  // Dividir en dos mitades para comparar
  const midPoint = Math.floor(sorted.length / 2);
  const earlier = sorted.slice(0, midPoint);
  const later = sorted.slice(midPoint);

  const calcAvg = (arr, field) => {
    if (!arr.length) return 0;
    return arr.reduce((sum, r) => sum + asNumber(r[field], 0), 0) / arr.length;
  };

  const calcSuccessRate = (arr) => {
    if (!arr.length) return 100;
    const successes = arr.filter(r => r.success).length;
    return (successes / arr.length) * 100;
  };

  const earlierSuccessRate = calcSuccessRate(earlier);
  const laterSuccessRate = calcSuccessRate(later);
  const earlierRepairScore = calcAvg(earlier, 'repair_score');
  const laterRepairScore = calcAvg(later, 'repair_score');
  const earlierDuration = calcAvg(earlier, 'duration_ms');
  const laterDuration = calcAvg(later, 'duration_ms');

  const successRateTrend = laterSuccessRate - earlierSuccessRate;
  const repairScoreTrend = laterRepairScore - earlierRepairScore;
  const durationTrend = laterDuration - earlierDuration;

  // Determinar dirección del trend
  const getTrendDirection = (value) => {
    if (value > 2) return 'improving';
    if (value < -2) return 'degrading';
    return 'stable';
  };

  const getTrendIcon = (direction, invertForDuration = false) => {
    if (invertForDuration) {
      // Para duración, menos es mejor
      if (direction === 'improving') return '↓ ✅';
      if (direction === 'degrading') return '↑ ❌';
      return '→ ➖';
    }
    if (direction === 'improving') return '↑ ✅';
    if (direction === 'degrading') return '↓ ❌';
    return '→ ➖';
  };

  const successDirection = getTrendDirection(successRateTrend);
  const repairDirection = getTrendDirection(repairScoreTrend);
  const durationDirection = durationTrend < -500 ? 'improving' : durationTrend > 500 ? 'degrading' : 'stable';

  return {
    status: 'available',
    totalRuns: sorted.length,
    period: {
      start: sorted[0]?.started_at,
      end: sorted[sorted.length - 1]?.ended_at
    },
    successRate: {
      current: laterSuccessRate,
      previous: earlierSuccessRate,
      trend: successRateTrend,
      direction: successDirection,
      icon: getTrendIcon(successDirection)
    },
    repairScore: {
      current: laterRepairScore,
      previous: earlierRepairScore,
      trend: repairScoreTrend,
      direction: repairDirection,
      icon: getTrendIcon(repairDirection)
    },
    duration: {
      current: laterDuration,
      previous: earlierDuration,
      trend: durationTrend,
      direction: durationDirection,
      icon: getTrendIcon(durationDirection, true)
    },
    overallTrend: successRateTrend + repairScoreTrend
  };
}

/**
 * Genera alertas automáticas basadas en umbrales
 * @param {Object} toolStats - Estadísticas de la herramienta
 * @param {Object} trend - Trending data
 * @returns {Array} Array de alertas
 */
export function generateAutomaticAlerts(toolStats, trend) {
  const alerts = [];
  const { 
    successRate = 100, 
    avgRepairScore = 0, 
    avgDuration = 0,
    totalRuns = 0,
    failedRuns = 0
  } = toolStats;

  // Contar thrashing
  const thrashingCount = toolStats.thrashingCount || 0;

  // Alerta de success rate
  if (successRate < ALERT_THRESHOLDS.successRate.critical) {
    alerts.push({
      severity: 'critical',
      type: 'success_rate_critical',
      metric: 'successRate',
      value: successRate,
      threshold: ALERT_THRESHOLDS.successRate.critical,
      message: `Success rate crítico: ${successRate.toFixed(1)}% (< ${ALERT_THRESHOLDS.successRate.critical}%)`,
      action: 'Revisar error handling y agregar retry logic'
    });
  } else if (successRate < ALERT_THRESHOLDS.successRate.warning) {
    alerts.push({
      severity: 'warning',
      type: 'success_rate_low',
      metric: 'successRate',
      value: successRate,
      threshold: ALERT_THRESHOLDS.successRate.warning,
      message: `Success rate bajo: ${successRate.toFixed(1)}% (< ${ALERT_THRESHOLDS.successRate.warning}%)`,
      action: 'Monitorear y mejorar handling de errores'
    });
  }

  // Alerta de repair score
  if (avgRepairScore < ALERT_THRESHOLDS.repairScore.critical) {
    alerts.push({
      severity: 'critical',
      type: 'repair_score_critical',
      metric: 'repairScore',
      value: avgRepairScore,
      threshold: ALERT_THRESHOLDS.repairScore.critical,
      message: `Repair score crítico: ${avgRepairScore.toFixed(2)} (< ${ALERT_THRESHOLDS.repairScore.critical})`,
      action: 'Implementar auto-healing o mejorar recovery'
    });
  } else if (avgRepairScore < ALERT_THRESHOLDS.repairScore.warning) {
    alerts.push({
      severity: 'warning',
      type: 'repair_score_low',
      metric: 'repairScore',
      value: avgRepairScore,
      threshold: ALERT_THRESHOLDS.repairScore.warning,
      message: `Repair score bajo: ${avgRepairScore.toFixed(2)}`,
      action: 'Revisar estrategia de reparación'
    });
  }

  // Alerta de duración
  if (avgDuration > ALERT_THRESHOLDS.avgDuration.critical) {
    alerts.push({
      severity: 'critical',
      type: 'duration_critical',
      metric: 'avgDuration',
      value: avgDuration,
      threshold: ALERT_THRESHOLDS.avgDuration.critical,
      message: `Duración crítica: ${(avgDuration / 1000).toFixed(1)}s (> ${ALERT_THRESHOLDS.avgDuration.critical / 1000}s)`,
      action: 'Optimizar performance o agregar timeout'
    });
  } else if (avgDuration > ALERT_THRESHOLDS.avgDuration.slow) {
    alerts.push({
      severity: 'warning',
      type: 'duration_slow',
      metric: 'avgDuration',
      value: avgDuration,
      threshold: ALERT_THRESHOLDS.avgDuration.slow,
      message: `Duración lenta: ${(avgDuration / 1000).toFixed(1)}s (> ${ALERT_THRESHOLDS.avgDuration.slow / 1000}s)`,
      action: 'Considerar optimización o caching'
    });
  }

  // Alerta de thrashing
  if (thrashingCount >= ALERT_THRESHOLDS.thrashingCount.critical) {
    alerts.push({
      severity: 'critical',
      type: 'thrashing_critical',
      metric: 'thrashingCount',
      value: thrashingCount,
      threshold: ALERT_THRESHOLDS.thrashingCount.critical,
      message: `Thrashing excesivo: ${thrashingCount} intentos fallidos`,
      action: 'Detener reintentos automáticos y revisar root cause'
    });
  } else if (thrashingCount >= ALERT_THRESHOLDS.thrashingCount.warning) {
    alerts.push({
      severity: 'warning',
      type: 'thrashing_warning',
      metric: 'thrashingCount',
      value: thrashingCount,
      threshold: ALERT_THRESHOLDS.thrashingCount.warning,
      message: `Thrashing detectado: ${thrashingCount} intentos fallidos`,
      action: 'Monitorear y limitar reintentos'
    });
  }

  // Alerta de trend negativo
  if (trend?.status === 'available' && trend.overallTrend < -5) {
    alerts.push({
      severity: 'warning',
      type: 'trend_degrading',
      metric: 'overallTrend',
      value: trend.overallTrend,
      threshold: -5,
      message: `Trend degradándose: ${trend.overallTrend.toFixed(1)}`,
      action: 'Investigar causa de degradación'
    });
  }

  return alerts;
}

/**
 * Calcula métricas diarias para trending
 * @param {Object} db - Database connection
 * @param {Object} options - Options
 * @returns {Array} Daily metrics
 */
export function getDailyToolMetrics(db, options = {}) {
  const { toolName = null, days = 14 } = options;

  let query = `
    SELECT 
      DATE(ended_at) as run_date,
      COUNT(*) as runs,
      SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successes,
      AVG(repair_score) as avg_repair,
      AVG(duration_ms) as avg_duration,
      SUM(CASE WHEN repair_status = 'thrashing' THEN 1 ELSE 0 END) as thrashing_count
    FROM mcp_tool_runs
    WHERE ended_at >= datetime('now', '-' || ? || ' days')
  `;

  const params = [days];
  if (toolName) {
    query += ' AND tool_name = ?';
    params.push(toolName);
  }

  query += ' GROUP BY DATE(ended_at) ORDER BY run_date ASC';

  const rows = db.prepare(query).all(...params);
  return rows.map(row => ({
    date: row.run_date,
    runs: asNumber(row.runs, 0),
    successes: asNumber(row.successes, 0),
    successRate: asNumber(row.runs, 0) > 0 
      ? (asNumber(row.successes, 0) / asNumber(row.runs, 0)) * 100 
      : 100,
    avgRepair: asNumber(row.avg_repair, 0),
    avgDuration: asNumber(row.avg_duration, 0),
    thrashingCount: asNumber(row.thrashing_count, 0)
  }));
}

/**
 * Formato de dashboard ASCII para terminal
 */
export function formatToolHealthDashboard(toolHealth, alerts, trend) {
  const lines = [];
  
  // Header
  lines.push('┌─────────────────────────────────────────────────────────────────┐');
  lines.push('│                    TOOL HEALTH DASHBOARD                        │');
  lines.push('├─────────────────────────────────────────────────────────────────┤');

  // Summary
  const totalTools = Object.keys(toolHealth).length;
  const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
  const warningAlerts = alerts.filter(a => a.severity === 'warning').length;
  const healthyTools = Object.values(toolHealth).filter(t => t.successRate >= 95).length;

  lines.push(`│  📊 ${totalTools} herramientas | 🔴 ${criticalAlerts} críticas | 🟡 ${warningAlerts} warnings | ✅ ${healthyTools} saludables  │`);
  lines.push('├─────────────────────────────────────────────────────────────────┤');

  // Tool health table
  lines.push('│ Tool                      | Success% | Repair  | Trend     │');
  lines.push('├───────────────────────────┼──────────┼─────────┼───────────┤');

  for (const [tool, stats] of Object.entries(toolHealth)) {
    const toolName = tool.substring(0, 24).padEnd(24);
    const success = stats.successRate?.toFixed(1).padStart(6) + '%' || '   N/A';
    const repair = typeof stats.avgRepairScore === 'number' 
      ? stats.avgRepairScore.toFixed(2).padStart(6) 
      : '   N/A';
    const trendIcon = trend?.[tool]?.successRate?.icon || '→ ➖';
    
    lines.push(`│ ${toolName} | ${success} | ${repair} | ${trendIcon.padEnd(8)}  │`);
  }

  lines.push('├─────────────────────────────────────────────────────────────────┤');

  // Alerts
  if (alerts.length > 0) {
    lines.push('│ ALERTAS ACTIVAS:                                                │');
    for (const alert of alerts.slice(0, 5)) {
      const icon = alert.severity === 'critical' ? '🔴' : '🟡';
      const msg = alert.message.substring(0, 56);
      lines.push(`│   ${icon} ${msg.padEnd(57)}│`);
    }
  } else {
    lines.push('│ ✅ No hay alertas activas                                        │');
  }

  lines.push('└─────────────────────────────────────────────────────────────────┘');

  return lines.join('\n');
}

export default {
  ALERT_THRESHOLDS,
  calculateToolTrend,
  generateAutomaticAlerts,
  getDailyToolMetrics,
  formatToolHealthDashboard
};