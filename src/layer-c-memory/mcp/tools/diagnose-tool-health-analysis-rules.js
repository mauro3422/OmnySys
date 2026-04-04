export function detectErrorPatterns(errors) {
  const patterns = {};

  for (const error of errors) {
    const errorMsg = error.error?.toLowerCase() || '';

    if (errorMsg.includes('database') || errorMsg.includes('db') || errorMsg.includes('sqlite')) {
      patterns.database_errors = (patterns.database_errors || 0) + 1;
    }
    if (errorMsg.includes('timeout') || errorMsg.includes('etimedout') || errorMsg.includes('timed out')) {
      patterns.timeout_errors = (patterns.timeout_errors || 0) + 1;
    }
    if (errorMsg.includes('permission') || errorMsg.includes('eacces')) {
      patterns.permission_errors = (patterns.permission_errors || 0) + 1;
    }
    if (errorMsg.includes('not found') || errorMsg.includes('enoent')) {
      patterns.not_found_errors = (patterns.not_found_errors || 0) + 1;
    }
    if (errorMsg.includes('connection') || errorMsg.includes('econnrefused') || errorMsg.includes('econnreset')) {
      patterns.connection_errors = (patterns.connection_errors || 0) + 1;
    }
    if (errorMsg.includes('memory') || errorMsg.includes('oom') || errorMsg.includes('heap')) {
      patterns.memory_errors = (patterns.memory_errors || 0) + 1;
    }
    if (errorMsg.includes('parse') || errorMsg.includes('syntax') || errorMsg.includes('invalid')) {
      patterns.parse_errors = (patterns.parse_errors || 0) + 1;
    }
  }

  return patterns;
}

export function prioritizeIssues(toolStats, errors, alerts) {
  const issues = [];

  for (const alert of alerts.filter((item) => item.severity === 'critical')) {
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

  for (const [tool, stats] of Object.entries(toolStats)) {
    if (stats.failedRuns > 0 && stats.successRate < 80) {
      issues.push({
        priority: 'high',
        type: 'high_failure_rate',
        tool,
        message: `${tool} tiene ${stats.failedRuns} fallos (${stats.successRate.toFixed(1)}% success rate)`,
        suggestion: 'Revisar logs de errores y agregar error handling'
      });
    }

    if (stats.thrashingCount >= 3) {
      issues.push({
        priority: 'high',
        type: 'excessive_thrashing',
        tool,
        thrashingCount: stats.thrashingCount,
        message: `${tool} tiene ${stats.thrashingCount} intentos de repair fallidos (thrashing)`,
        suggestion: 'Limitar reintentos y revisar root cause'
      });
    }
  }

  const recentErrors = errors.filter((error) => {
    const errorTime = new Date(error.timestamp);
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

  for (const [tool, stats] of Object.entries(toolStats)) {
    if (stats.avgRepairScore < -2) {
      issues.push({
        priority: 'medium',
        type: 'low_repair_score',
        tool,
        score: stats.avgRepairScore,
        message: `${tool} tiene repair score promedio: ${stats.avgRepairScore.toFixed(2)}`,
        suggestion: 'Mejorar error handling y retry logic'
      });
    }
  }

  for (const [tool, stats] of Object.entries(toolStats)) {
    if (alerts.find((alert) => alert.type === 'trend_degrading' && alert.tool === tool)) {
      issues.push({
        priority: 'medium',
        type: 'degrading_trend',
        tool,
        message: `${tool} está degradándose en el tiempo`,
        suggestion: 'Investigar causa de degradación y optimizar'
      });
    }
  }

  return issues.sort((left, right) => {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    return priorityOrder[right.priority] - priorityOrder[left.priority];
  });
}

export function generateRecommendations(summary, issues, alerts) {
  const recommendations = [];

  const criticalAlerts = alerts.filter((alert) => alert.severity === 'critical');
  if (criticalAlerts.length > 0) {
    recommendations.push({
      priority: 'critical',
      action: 'Atender alertas críticas inmediatamente',
      details: `${criticalAlerts.length} alertas críticas requieren atención`,
      affectedTools: [...new Set(criticalAlerts.map((alert) => alert.tool))]
    });
  }

  const highPriorityIssues = issues.filter((issue) => issue.priority === 'critical' || issue.priority === 'high');
  if (highPriorityIssues.length > 0) {
    recommendations.push({
      priority: 'high',
      action: 'Resolver problemas de alta prioridad',
      details: highPriorityIssues.map((issue) => issue.message).join('; ')
    });
  }

  if (summary.avgRepairScore < -1) {
    recommendations.push({
      priority: 'medium',
      action: 'Mejorar repair rate general',
      details: `Repair score promedio: ${summary.avgRepairScore.toFixed(2)}. Implementar auto-healing.`
    });
  }

  const successRate = summary.totalRuns > 0 ? (summary.successfulRuns / summary.totalRuns) * 100 : 100;
  if (successRate < 90) {
    recommendations.push({
      priority: 'medium',
      action: 'Mejorar tasa de éxito general',
      details: `Success rate: ${successRate.toFixed(1)}%. Revisar error handling en herramientas con fallos.`
    });
  }

  const thrashingAlerts = alerts.filter((alert) => alert.type.includes('thrashing'));
  if (thrashingAlerts.length > 0) {
    recommendations.push({
      priority: 'high',
      action: 'Detener thrashing en herramientas',
      details: `${thrashingAlerts.length} herramientas con thrashing excesivo. Limitar reintentos.`,
      affectedTools: [...new Set(thrashingAlerts.map((alert) => alert.tool))]
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      priority: 'low',
      action: 'Mantener monitoreo',
      details: 'Todas las herramientas operan dentro de parámetros normales.'
    });
  }

  return recommendations;
}
