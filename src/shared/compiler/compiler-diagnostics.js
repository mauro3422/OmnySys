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

function normalizeUnusedInputFragment(value = '') {
  return String(value || '').trim();
}

function isLikelyParserNoiseUnusedInput(name = '') {
  if (!name) return true;
  if (name === '__destructured_0') return true;
  if (/\s/.test(name)) return true;
  if (/['"`]/.test(name)) return true;
  if (/[;(){}]/.test(name)) return true;
  if (name.length < 2) return true;
  return false;
}

export function isLowSignalDataFlowAlert(alert = {}) {
  if (String(alert?.issueType || '') !== 'sem_data_flow_low') {
    return false;
  }

  const violations = Array.isArray(alert?.context?.violations) ? alert.context.violations : [];
  if (violations.length === 0) {
    return false;
  }

  return violations.every((violation) => {
    const inputCount = violation?.inputCount ?? null;
    const unusedInputs = Array.isArray(violation?.unusedInputs) ? violation.unusedInputs : [];

    if (inputCount !== 0) {
      return false;
    }

    return unusedInputs
      .map(normalizeUnusedInputFragment)
      .every(isLikelyParserNoiseUnusedInput);
  });
}

export function shouldSuppressWatcherAlert(alert = {}) {
  return isLowSignalDataFlowAlert(alert);
}

export function classifyCompilerDiagnosticSignal(alert = {}) {
  const issueType = String(alert?.issueType || '');
  const severity = String(alert?.severity || 'low');
  const filePath = String(alert?.filePath || '');

  if (severity === 'high') {
    return 'high_signal';
  }

  if (shouldSuppressWatcherAlert(alert)) {
    return 'low_signal';
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
