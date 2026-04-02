/**
 * @fileoverview MCP Tool: diagnose_tool_health
 * 
 * Herramienta de diagnóstico inteligente que analiza errores históricos
 * de herramientas MCP y genera reportes priorizados.
 * 
 * @module layer-c-memory/mcp/tools/diagnose-tool-health
 */

import { createLogger } from '../../../utils/logger.js';
import { getRepository } from '../../storage/repository/repository-factory.js';

const logger = createLogger('OmnySys:mcp:diagnose_tool_health');

/**
 * Analiza errores históricos de herramientas MCP
 */
function analyzeToolErrors(repo, options = {}) {
  const { limit = 50, toolName = null } = options;

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
      started_at
    FROM mcp_tool_runs
    WHERE 1=1
  `;

  const params = [];
  if (toolName) {
    query += ` AND tool_name = ?`;
    params.push(toolName);
  }

  query += ` ORDER BY started_at DESC LIMIT ?`;
  params.push(limit);

  const runs = repo.db.prepare(query).all(...params);

  // Análisis por herramienta
  const toolStats = {};
  const errors = [];
  const patterns = [];

  for (const run of runs) {
    const tool = run.tool_name;
    if (!toolStats[tool]) {
      toolStats[tool] = {
        totalRuns: 0,
        successfulRuns: 0,
        failedRuns: 0,
        avgRepairScore: 0,
        avgDuration: 0,
        errorPatterns: [],
        lastError: null
      };
    }

    toolStats[tool].totalRuns++;
    if (run.success) {
      toolStats[tool].successfulRuns++;
    } else {
      toolStats[tool].failedRuns++;
      if (run.error_message) {
        toolStats[tool].errorPatterns.push(run.error_message);
        toolStats[tool].lastError = run.error_message;
        errors.push({
          tool: tool,
          error: run.error_message,
          timestamp: run.started_at,
          repairStatus: run.repair_status,
          repairScore: run.repair_score
        });
      }
    }

    toolStats[tool].avgRepairScore += run.repair_score || 0;
    toolStats[tool].avgDuration += run.duration_ms || 0;
  }

  // Calcular promedios
  for (const tool of Object.keys(toolStats)) {
    const stats = toolStats[tool];
    if (stats.totalRuns > 0) {
      stats.avgRepairScore = stats.avgRepairScore / stats.totalRuns;
      stats.avgDuration = stats.avgDuration / stats.totalRuns;
      stats.successRate = (stats.successfulRuns / stats.totalRuns) * 100;
    }
  }

  // Detectar patrones
  const errorPatterns = detectErrorPatterns(errors);
  const priorityIssues = prioritizeIssues(toolStats, errors);

  return {
    toolStats,
    errors,
    errorPatterns,
    priorityIssues,
    summary: {
      totalRuns: runs.length,
      successfulRuns: runs.filter(r => r.success).length,
      failedRuns: runs.filter(r => !r.success).length,
      uniqueTools: Object.keys(toolStats).length,
      avgRepairScore: runs.reduce((sum, r) => sum + (r.repair_score || 0), 0) / runs.length
    }
  };
}

/**
 * Detecta patrones en errores
 */
function detectErrorPatterns(errors) {
  const patterns = {};

  for (const error of errors) {
    const errorMsg = error.error || '';
    
    // Patrones comunes
    if (errorMsg.includes('database') || errorMsg.includes('DB')) {
      patterns['database_errors'] = (patterns['database_errors'] || 0) + 1;
    }
    if (errorMsg.includes('timeout') || errorMsg.includes('ETIMEDOUT')) {
      patterns['timeout_errors'] = (patterns['timeout_errors'] || 0) + 1;
    }
    if (errorMsg.includes('permission') || errorMsg.includes('EACCES')) {
      patterns['permission_errors'] = (patterns['permission_errors'] || 0) + 1;
    }
    if (errorMsg.includes('not found') || errorMsg.includes('ENOENT')) {
      patterns['not_found_errors'] = (patterns['not_found_errors'] || 0) + 1;
    }
  }

  return patterns;
}

/**
 * Prioriza problemas por severidad
 */
function prioritizeIssues(toolStats, errors) {
  const issues = [];

  // 1. Herramientas con tasa de fallo alta
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
  }

  // 2. Errores recientes
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

  // 3. Herramientas con repair score bajo
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

  return issues.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
}

/**
 * Genera reporte de diagnóstico
 */
function generateDiagnosticReport(analysis) {
  const { toolStats, errors, errorPatterns, priorityIssues, summary } = analysis;

  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      ...summary,
      healthStatus: summary.failedRuns === 0 ? 'healthy' : 'degraded',
      overallSuccessRate: (summary.successfulRuns / summary.totalRuns) * 100
    },
    toolHealth: {},
    priorityIssues,
    errorPatterns,
    recommendations: []
  };

  // Tool health details
  for (const [tool, stats] of Object.entries(toolStats)) {
    report.toolHealth[tool] = {
      successRate: stats.successRate,
      avgRepairScore: stats.avgRepairScore,
      avgDuration: stats.avgDuration,
      status: stats.successRate >= 95 ? 'excellent' : 
              stats.successRate >= 80 ? 'good' : 
              stats.successRate >= 60 ? 'fair' : 'poor',
      lastError: stats.lastError
    };
  }

  // Generar recomendaciones
  if (priorityIssues.length > 0) {
    report.recommendations.push({
      priority: 'high',
      action: 'Revisar errores recientes',
      details: `${priorityIssues.filter(i => i.priority === 'high').length} problemas de alta prioridad detectados`
    });
  }

  if (summary.avgRepairScore < -1) {
    report.recommendations.push({
      priority: 'medium',
      action: 'Mejorar repair rate',
      details: `Repair score promedio: ${summary.avgRepairScore.toFixed(2)}`
    });
  }

  return report;
}

/**
 * Función principal MCP
 */
export async function diagnose_tool_health(args, context) {
  const {
    toolName = null,
    limit = 50,
    includeDetails = true
  } = args;
  const { projectPath } = context;

  if (!projectPath) {
    return { success: false, error: 'Missing required parameter: projectPath' };
  }

  try {
    logger.info(`[Diagnose] Analyzing tool health for ${toolName || 'all tools'}`);

    const repo = getRepository(projectPath);
    if (!repo?.db) {
      return { success: false, error: 'Repository not available' };
    }

    // Analizar errores históricos
    const analysis = analyzeToolErrors(repo, { limit, toolName });

    // Generar reporte
    const report = generateDiagnosticReport(analysis);

    // Modo resumen o detalles
    if (!includeDetails) {
      return {
        success: true,
        mode: 'summary',
        report: {
          timestamp: report.timestamp,
          summary: report.summary,
          priorityIssues: report.priorityIssues,
          recommendations: report.recommendations
        }
      };
    }

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