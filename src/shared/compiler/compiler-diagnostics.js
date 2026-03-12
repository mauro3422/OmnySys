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

const CANONICAL_COMPILER_POLICY_SURFACES = new Set([
  'src/shared/compiler/duplicate-signal-policy.js',
  'src/shared/compiler/duplicate-utils.js',
  'src/shared/compiler/compiler-contract-layer.js',
  'src/shared/compiler/compiler-diagnostics-snapshot.js'
]);

function isCanonicalCompilerPolicySurface(filePath = '') {
  return CANONICAL_COMPILER_POLICY_SURFACES.has(String(filePath || ''));
}

function toCount(value) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function normalizeBreakageCount(sample = [], explicitCount = 0) {
  const count = toCount(explicitCount);
  if (count > 0) return count;
  return Array.isArray(sample) ? sample.length : 0;
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
  const issueType = String(alert?.issueType || '');
  const filePath = String(alert?.filePath || '');

  if (isLowSignalDataFlowAlert(alert)) {
    return true;
  }

  if (isCanonicalCompilerPolicySurface(filePath) && issueType.startsWith('code_duplicate')) {
    return true;
  }

  return false;
}

export function getWatcherAlertBreakageSummary(alert = {}) {
  const context = alert?.context || {};
  const sample = context?.sample || {};
  const brokenImports = normalizeBreakageCount(sample?.brokenImports, context?.brokenImports);
  const brokenCallers = normalizeBreakageCount(sample?.brokenCallers, context?.brokenCallers);

  return {
    brokenImports,
    brokenCallers,
    hasBreakage: brokenImports > 0 || brokenCallers > 0
  };
}

export function isBreakingWatcherAlert(alert = {}) {
  return getWatcherAlertBreakageSummary(alert).hasBreakage;
}

export function compareWatcherAlertPriority(a = {}, b = {}) {
  const breakageDelta = Number(isBreakingWatcherAlert(b)) - Number(isBreakingWatcherAlert(a));
  if (breakageDelta !== 0) return breakageDelta;

  const severityRank = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
  const severityDelta =
    (severityRank[String(b?.severity || 'low').toLowerCase()] || 0) -
    (severityRank[String(a?.severity || 'low').toLowerCase()] || 0);
  if (severityDelta !== 0) return severityDelta;

  const timeA = Date.parse(a?.detectedAt || a?.time || 0) || 0;
  const timeB = Date.parse(b?.detectedAt || b?.time || 0) || 0;
  return timeB - timeA;
}

export function classifyCompilerDiagnosticSignal(alert = {}) {
  const issueType = String(alert?.issueType || '');
  const severity = String(alert?.severity || 'low');
  const filePath = String(alert?.filePath || '');

  if (severity === 'high') {
    return 'high_signal';
  }

  if (isBreakingWatcherAlert(alert)) {
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
