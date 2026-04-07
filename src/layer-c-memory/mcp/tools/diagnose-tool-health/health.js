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

import { createLogger } from '../../../../utils/logger.js';
import { getRepository } from '../../../storage/repository/repository-factory.js';
import {
  buildPropagationPlan,
  buildPipelineHealthPropagationPlan
} from '../../../../shared/compiler/index.js';
import {
  analyzeToolHealth,
  buildToolHealthMap,
  buildToolHealthPropagation,
  generateDiagnosticReport
} from './index.js';

const logger = createLogger('OmnySys:mcp:diagnose_tool_health');

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
    const toolHealthMap = buildToolHealthMap(analysis.toolStats);
    const propagationPlan = buildPipelineHealthPropagationPlan(
      buildToolHealthPropagation(analysis.toolStats, analysis.summary, toolHealthMap)
    );

    // Generar reporte
    const report = generateDiagnosticReport(analysis, {
      includeDashboard,
      includeDetails,
      propagationPlan
    });

    if (includeDashboard && report.dashboard) {
      console.log(report.dashboard);
    }

    // Modo alertsOnly
    if (alertsOnly) {
      return {
        success: true,
        mode: 'alerts',
        summary: report.summary,
        alerts: report.alerts,
        criticalAlerts: report.alerts.filter(a => a.severity === 'critical').length,
        warningAlerts: report.alerts.filter(a => a.severity === 'warning').length,
        propagation: report.propagation
      };
    }

    // Modo summary
    if (!includeDetails) {
      return {
        success: true,
        mode: 'summary',
        propagation: report.propagation,
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
      propagation: report.propagation,
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
