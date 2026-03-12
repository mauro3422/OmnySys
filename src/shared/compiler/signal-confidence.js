/**
 * @fileoverview Canonical signal-confidence helpers.
 *
 * Allows MCP/runtime consumers to understand whether a diagnostic is
 * high-confidence, heuristic, stale-prone or role-biased instead of treating
 * every watcher alert as equally trustworthy.
 *
 * @module shared/compiler/signal-confidence
 */

import { classifyCompilerDiagnosticSignal } from './compiler-diagnostics.js';
import { classifyWatcherAlertLifecycle, WATCHER_ALERT_LIFECYCLE } from './watcher-issue-lifecycle.js';
import { classifyFileOperationalRole } from './atom-role-classification.js';

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function pushReason(reasons, code, message) {
  reasons.push({ code, message });
}

function isCoordinatorBiasRole(role) {
  return (
    role.role === 'orchestrator' ||
    role.role === 'resolver' ||
    role.role === 'builder' ||
    role.role === 'analyzer' ||
    role.role === 'bridge' ||
    role.role === 'policy'
  );
}

export function classifySignalConfidence(alert = {}) {
  const reasons = [];
  let score = 75;

  const signal = classifyCompilerDiagnosticSignal(alert);
  const lifecycle = alert.lifecycle || classifyWatcherAlertLifecycle(alert);
  const role = classifyFileOperationalRole(alert.filePath);
  const issueType = String(alert.issueType || '');

  if (signal === 'high_signal') {
    score += 15;
    pushReason(reasons, 'high_signal', 'High-severity diagnostics are treated as stronger compiler evidence.');
  }

  if (signal === 'low_signal') {
    score -= 30;
    pushReason(reasons, 'low_signal', 'This diagnostic matches known low-signal compiler noise patterns.');
  }

  if (lifecycle.status === WATCHER_ALERT_LIFECYCLE.STALE) {
    score -= 20;
    pushReason(reasons, 'stale_prone', 'The alert is older than its primary TTL and may lag behind the current runtime.');
  }

  if (lifecycle.status === WATCHER_ALERT_LIFECYCLE.EXPIRED) {
    score -= 35;
    pushReason(reasons, 'expired', 'The alert has exceeded its expiry window and should be treated as historical noise.');
  }

  if (issueType.startsWith('sem_data_flow_') && isCoordinatorBiasRole(role)) {
    score -= 18;
    pushReason(reasons, 'class_orchestrator_bias', 'Coordinator-heavy classes often under-report data flow coherence despite valid orchestration logic.');
  }

  if (issueType.startsWith('arch_impact_')) {
    score -= 10;
    pushReason(reasons, 'impact_churn', 'Impact-wave diagnostics are useful but naturally noisy during active refactors.');
  }

  const finalScore = clampScore(score);
  const level = finalScore >= 80 ? 'high_confidence' : finalScore >= 50 ? 'medium_confidence' : 'low_confidence';

  return {
    level,
    score: finalScore,
    signal,
    role,
    lifecycle,
    reasons
  };
}

export function summarizeSignalConfidence(alerts = []) {
  return (Array.isArray(alerts) ? alerts : []).reduce((summary, alert) => {
    const confidence = classifySignalConfidence(alert);
    summary.total += 1;
    summary.byLevel[confidence.level] = (summary.byLevel[confidence.level] || 0) + 1;
    summary.bySignal[confidence.signal] = (summary.bySignal[confidence.signal] || 0) + 1;
    summary.byRole[confidence.role.role] = (summary.byRole[confidence.role.role] || 0) + 1;
    return summary;
  }, {
    total: 0,
    byLevel: {},
    bySignal: {},
    byRole: {}
  });
}
