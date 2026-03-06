/**
 * @fileoverview Canonical helpers for classifying compiler diagnostics by
 * signal strength so watcher/MCP consumers can distinguish real breakage from
 * low-signal helper noise.
 *
 * @module shared/compiler/compiler-diagnostics
 */

function isCompilerHelperPath(filePath = '') {
  return String(filePath || '').startsWith('src/shared/compiler/');
}

export function classifyCompilerDiagnosticSignal(alert = {}) {
  const issueType = String(alert?.issueType || '');
  const severity = String(alert?.severity || 'low');
  const filePath = String(alert?.filePath || '');

  if (severity === 'high') {
    return 'high_signal';
  }

  if (isCompilerHelperPath(filePath) && issueType === 'sem_data_flow_low') {
    return 'low_signal';
  }

  if (issueType === 'arch_impact_low') {
    return 'low_signal';
  }

  return 'normal_signal';
}

export function summarizeCompilerDiagnostics(alerts = []) {
  return (Array.isArray(alerts) ? alerts : []).reduce((summary, alert) => {
    const signal = classifyCompilerDiagnosticSignal(alert);
    summary.total += 1;
    summary.bySignal[signal] = (summary.bySignal[signal] || 0) + 1;
    return summary;
  }, {
    total: 0,
    bySignal: {}
  });
}
