/**
 * @fileoverview MCP Tool: diagnose_tool_health
 * 
 * Herramienta de diagnóstico inteligente con trending, alertas automáticas
 * y dashboard visual para herramientas MCP.
 * 
 * Features:
 * - Trending de métricas en el tiempo (success rate, repair score, duration)
 * - Alertas automáticas basadas en umbrales configurables
 * - Dashboard visual ASCII para terminal
 * - Métricas diarias para análisis de tendencias
 * 
 * @module layer-c-memory/mcp/tools/diagnose-tool-health
 */

import { createLogger } from '../../../utils/logger.js';
import { getRepository } from '../../storage/repository/repository-factory.js';
import {
  buildPipelineHealthPropagationPlan,
  calculateToolTrend,
  generateAutomaticAlerts,
  getDailyToolMetrics,
  formatToolHealthDashboard,
  summarizePropagationPlan
} from '../../../shared/compiler/index.js';

const logger = createLogger('OmnySys:mcp:diagnose_tool_health');

/**
 * Analiza errores históricos con trending y alertas
 */
function analyzeToolHealth(repo, options = {}) {
  const { limit = 100, toolName = null, days = 7 } = options;

  // Query extendida para trending
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

  // Estadísticas por herramienta
  const toolStats = {};
  const toolRuns = {}; // Para trending
  const errors = [];

  for (const run of runs) {
    const tool = run.tool_name;
    if (!toolStats[tool]) {
      toolStats[tool] = {
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
      };
      toolRuns[tool] = [];
    }

    toolStats[tool].totalRuns++;
    toolRuns[tool].push(run);

    if (run.success) {
      toolStats[tool].successfulRuns++;
    } else {
      toolStats[tool].failedRuns++;
      toolStats[tool].errorCount++;
      if (run.error_message) {
        toolStats[tool].lastError = run.error_message;
        errors.push({
          tool,
          error: run.error_message,
          timestamp: run.started_at,
          repairStatus: run.repair_status,
          repairScore: run.repair_score
        });
      }
    }

    // Contar estados de repair
    if (run.repair_status === 'thrashing') toolStats[tool].thrashingCount++;
    if (run.repair_status === 'repaired') toolStats[tool].repairedCount++;

    toolStats[tool].repairScores.push(run.repair_score || 0);
    toolStats[tool].avgRepairScore += run.repair_score || 0;
    toolStats[tool].avgDuration += run.duration_ms || 0;
  }

  // Calcular promedios y métricas
  for (const tool of Object.keys(toolStats)) {
    const stats = toolStats[tool];
    if (stats.totalRuns > 0) {
      stats.avgRepairScore = stats.avgRepairScore / stats.totalRuns;
      stats.avgDuration = stats.avgDuration / stats.totalRuns;
      stats.successRate = (stats.successfulRuns / stats.totalRuns) * 100;
      stats.medianRepairScore = stats.repairScores.sort((a, b) => a - b)[Math.floor(stats.repairScores.length / 2)];
    }
  }

  // Calcular trending por herramienta
  const toolTrends = {};
  for (const [tool, toolRunList] of Object.entries(toolRuns)) {
    toolTrends[tool] = calculateToolTrend(toolRunList);
  }

  // Generar alertas automáticas por herramienta
  const allAlerts = [];
  for (const [tool, stats] of Object.entries(toolStats)) {
    const alerts = generateAutomaticAlerts(stats, toolTrends[tool]);
    allAlerts.push(...alerts.map(a => ({ ...a, tool })));
  }

  // Detectar patrones y priorizar issues
  const errorPatterns = detectErrorPatterns(errors);
  const priorityIssues = prioritizeIssues(toolStats, errors, allAlerts);

  // Métricas diarias (para trending visual)
  const dailyMetrics = getDailyToolMetrics(repo.db, { toolName, days });

  return {
    toolStats,
    toolTrends,
    dailyMetrics,
    errors: errors.slice(0, 20),
    errorPatterns,
    priorityIssues,
    alerts: allAlerts,
    summary: {
      totalRuns: runs.length,
      successfulRuns: runs.filter(r => r.success).length,
      failedRuns: runs.filter(r => !r.success).length,
      uniqueTools: Object.keys(toolStats).length,
      avgRepairScore: runs.length > 0 ? runs.reduce((sum, r) => sum + (r.repair_score || 0), 0) / runs.length : 0,
      totalAlerts: allAlerts.length,
      criticalAlerts: allAlerts.filter(a => a.severity === 'critical').length,
      warningAlerts: allAlerts.filter(a => a.severity === 'warning').length
    }
  };
}

/**
 * Detecta patrones en errores (extendido)
 */
function detectErrorPatterns(errors) {
  const patterns = {};

  for (const error of errors) {
    const errorMsg = error.error?.toLowerCase() || '';
    
    // Patrones comunes
    if (errorMsg.includes('database') || errorMsg.includes('db') || errorMsg.includes('sqlite')) {
      patterns['database_errors'] = (patterns['database_errors'] || 0) + 1;
    }
    if (errorMsg.includes('timeout') || errorMsg.includes('etimedout') || errorMsg.includes('timed out')) {
      patterns['timeout_errors'] = (patterns['timeout_errors'] || 0) + 1;
    }
    if (errorMsg.includes('permission') || errorMsg.includes('eacces')) {
      patterns['permission_errors'] = (patterns['permission_errors'] || 0) + 1;
    }
    if (errorMsg.includes('not found') || errorMsg.includes('enoent')) {
      patterns['not_found_errors'] = (patterns['not_found_errors'] || 0) + 1;
    }
    if (errorMsg.includes('connection') || errorMsg.includes('econnrefused') || errorMsg.includes('econnreset')) {
      patterns['connection_errors'] = (patterns['connection_errors'] || 0) + 1;
    }
    if (errorMsg.includes('memory') || errorMsg.includes('oom') || errorMsg.includes('heap')) {
      patterns['memory_errors'] = (patterns['memory_errors'] || 0) + 1;
    }
    if (errorMsg.includes('parse') || errorMsg.includes('syntax') || errorMsg.includes('invalid')) {
      patterns['parse_errors'] = (patterns['parse_errors'] || 0) + 1;
    }
  }

  return patterns;
}

/**
 * Prioriza problemas por severidad (extendido con alertas)
 */
function prioritizeIssues(toolStats, errors, alerts) {
  const issues = [];

  // 1. Alertas críticas automáticas
  for (const alert of alerts.filter(a => a.severity === 'critical')) {
    issues.push({
      priority: 'critical',
      type: alert.type,
      tool: alert.tool,
      message: `[ALERTA] ${alert.message}`,
      suggestion: alert.action,
      metric: alert.metric,
      value: alert.value,
      threshold: alert.threshold
    });
  }

  // 2. Herramientas con tasa de fallo alta
  for (const [tool, stats] of Object.entries(toolStats)) {
    if (stats.failedRuns > 0 && stats.successRate < 80) {
      issues.push({
        priority: 'high',
        type: 'high_failure_rate',
        tool: tool,
        message: `${tool} tiene ${stats.failedRuns} fallos (${stats.successRate.toFixed(1)}% success rate)`,
        suggestion: 'Revisar logs de errores y agregar error handling'
      });
    }
    // Thrashing excesivo
    if (stats.thrashingCount >= 3) {
      issues.push({
        priority: 'high',
        type: 'excessive_thrashing',
        tool: tool,
        thrashingCount: stats.thrashingCount,
        message: `${tool} tiene ${stats.thrashingCount} intentos de repair fallidos (thrashing)`,
        suggestion: 'Limitar reintentos y revisar root cause'
      });
    }
  }

  // 3. Errores recientes
  const recentErrors = errors.filter(e => {
    const errorTime = new Date(e.timestamp);
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return errorTime > hourAgo;
  });

  if (recentErrors.length > 0) {
    issues.push({
      priority: 'high',
      type: 'recent_errors',
      count: recentErrors.length,
      message: `${recentErrors.length} errores en la última hora`,
      suggestion: 'Revisar errores recientes y aplicar fixes'
    });
  }

  // 4. Herramientas con repair score bajo
  for (const [tool, stats] of Object.entries(toolStats)) {
    if (stats.avgRepairScore < -2) {
      issues.push({
        priority: 'medium',
        type: 'low_repair_score',
        tool: tool,
        score: stats.avgRepairScore,
        message: `${tool} tiene repair score promedio: ${stats.avgRepairScore.toFixed(2)}`,
        suggestion: 'Mejorar error handling y retry logic'
      });
    }
  }

  // 5. Tool health trends negativos
  for (const [tool, stats] of Object.entries(toolStats)) {
    if (alerts.find(a => a.type === 'trend_degrading' && a.tool === tool)) {
      issues.push({
        priority: 'medium',
        type: 'degrading_trend',
        tool: tool,
        message: `${tool} está degradándose en el tiempo`,
        suggestion: 'Investigar causa de degradación y optimizar'
      });
    }
  }

  return issues.sort((a, b) => {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
}

/**
 * Genera reporte de diagnóstico con trending y dashboard
 */
function generateDiagnosticReport(analysis, options = {}) {
  const { toolStats, toolTrends, dailyMetrics, errors, errorPatterns, priorityIssues, alerts, summary } = analysis;
  const { includeDashboard = true, includeDetails = true } = options;

  // Build tool health map para dashboard
  const toolHealthMap = {};
  for (const [tool, stats] of Object.entries(toolStats)) {
    toolHealthMap[tool] = {
      successRate: stats.successRate,
      avgRepairScore: stats.avgRepairScore,
      avgDuration: stats.avgDuration,
      thrashingCount: stats.thrashingCount,
      status: stats.successRate >= 95 ? 'excellent' : 
              stats.successRate >= 80 ? 'good' : 
              stats.successRate >= 60 ? 'fair' : 'poor',
      lastError: stats.lastError
    };
  }

  // Dashboard ASCII
  const dashboard = includeDashboard 
    ? formatToolHealthDashboard(toolHealthMap, alerts, toolTrends)
    : null;

  const propagation = buildPipelineHealthPropagationPlan({
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
  });

  const report = {
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

  return report;
}

/**
 * Genera recomendaciones automáticas basadas en el análisis
 */
function generateRecommendations(summary, issues, alerts) {
  const recommendations = [];

  // Basadas en alertas críticas
  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  if (criticalAlerts.length > 0) {
    recommendations.push({
      priority: 'critical',
      action: 'Atender alertas críticas inmediatamente',
      details: `${criticalAlerts.length} alertas críticas requieren atención`,
      affectedTools: [...new Set(criticalAlerts.map(a => a.tool))]
    });
  }

  // Basadas en issues
  const highPriorityIssues = issues.filter(i => i.priority === 'critical' || i.priority === 'high');
  if (highPriorityIssues.length > 0) {
    recommendations.push({
      priority: 'high',
      action: 'Resolver problemas de alta prioridad',
      details: highPriorityIssues.map(i => i.message).join('; ')
    });
  }

  // Basadas en repair score
  if (summary.avgRepairScore < -1) {
    recommendations.push({
      priority: 'medium',
      action: 'Mejorar repair rate general',
      details: `Repair score promedio: ${summary.avgRepairScore.toFixed(2)}. Implementar auto-healing.`
    });
  }

  // Basadas en success rate
  const successRate = summary.totalRuns > 0 ? (summary.successfulRuns / summary.totalRuns) * 100 : 100;
  if (successRate < 90) {
    recommendations.push({
      priority: 'medium',
      action: 'Mejorar tasa de éxito general',
      details: `Success rate: ${successRate.toFixed(1)}%. Revisar error handling en herramientas con fallos.`
    });
  }

  // Basadas en thrashing
  const thrashingAlerts = alerts.filter(a => a.type.includes('thrashing'));
  if (thrashingAlerts.length > 0) {
    recommendations.push({
      priority: 'high',
      action: 'Detener thrashing en herramientas',
      details: `${thrashingAlerts.length} herramientas con thrashing excesivo. Limitar reintentos.`,
      affectedTools: [...new Set(thrashingAlerts.map(a => a.tool))]
    });
  }

  // Default si todo está bien
  if (recommendations.length === 0) {
    recommendations.push({
      priority: 'low',
      action: 'Mantener monitoreo',
      details: 'Todas las herramientas operan dentro de parámetros normales.'
    });
  }

  return recommendations;
}

/**
 * Función principal MCP
 * 
 * @param {Object} args - Argumentos de la herramienta
 * @param {string} args.toolName - Filtrar por herramienta específica (opcional)
 * @param {number} args.limit - Máximo de ejecuciones a analizar (default: 100)
 * @param {number} args.days - Ventana de días para analizar (default: 7)
 * @param {boolean} args.includeDetails - Incluir detalles completos (default: true)
 * @param {boolean} args.includeDashboard - Incluir dashboard ASCII (default: true)
 * @param {boolean} args.alertsOnly - Solo retornar alertas (default: false)
 */
export async function diagnose_tool_health(args, context) {
  const {
    toolName = null,
    limit = 100,
    days = 7,
    includeDetails = true,
    includeDashboard = true,
    alertsOnly = false
  } = args;
  const { projectPath } = context;

  if (!projectPath) {
    return { success: false, error: 'Missing required parameter: projectPath' };
  }

  try {
    logger.info(`[Diagnose] Analyzing tool health: ${toolName || 'all tools'}, ${days}d window`);

    const repo = getRepository(projectPath);
    if (!repo?.db) {
      return { success: false, error: 'Repository not available' };
    }

    // Analizar salud con trending y alertas
    const analysis = analyzeToolHealth(repo, { limit, toolName, days });

    // Generar reporte
    const report = generateDiagnosticReport(analysis, { includeDashboard, includeDetails });

    // Modo alertsOnly
    if (alertsOnly) {
      return {
        success: true,
        mode: 'alerts',
        summary: report.summary,
        alerts: report.alerts,
        criticalAlerts: report.alerts.filter(a => a.severity === 'critical').length,
        warningAlerts: report.alerts.filter(a => a.severity === 'warning').length
      };
    }

    // Modo summary
    if (!includeDetails) {
      return {
        success: true,
        mode: 'summary',
        report: {
          timestamp: report.timestamp,
          dashboard: report.dashboard,
          summary: report.summary,
          alerts: report.alerts,
          priorityIssues: report.priorityIssues,
          recommendations: report.recommendations
        }
      };
    }

    // Modo full
    return {
      success: true,
      mode: 'full',
      report
    };

  } catch (error) {
    logger.error(`[Diagnose] Failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

export default { diagnose_tool_health };
