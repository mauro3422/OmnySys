import { normalizeRecentNotifications } from './recent-notifications.js';

function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function createAlert({
  id,
  level,
  severity,
  issueType,
  message,
  recommendation,
  source,
  evidence = null
}) {
  return {
    id,
    source,
    level,
    severity,
    issueType,
    filePath: null,
    message,
    detectedAt: new Date().toISOString(),
    lifecycle: {
      status: 'active',
      stale: false
    },
    confidence: {
      level: severity === 'high' ? 'high' : 'medium',
      score: severity === 'high' ? 1 : 0.75,
      signal: issueType,
      role: {
        role: 'governance'
      }
    },
    context: {
      recommendation,
      source,
      evidence
    }
  };
}

function extractMetadataSignal(compilerExplainability = null) {
  const driftSignals = compilerExplainability?.driftAssessment?.signals || [];
  const driftMetadataSignal = driftSignals.find((signal) => signal?.key === 'metadata_extraction_coverage');
  if (driftMetadataSignal) {
    return driftMetadataSignal;
  }

  const coverage = compilerExplainability?.metadataExtractionCoverage;
  const primaryIssue = coverage?.primaryIssue;
  if (!primaryIssue) {
    return null;
  }

  const state = primaryIssue.state || primaryIssue.status || null;
  if (!state || state === 'fresh' || state === 'covered') {
    return null;
  }

  const reason = `Review ${primaryIssue.table}.${primaryIssue.field} before trusting downstream metadata consumers.`;
  return {
    key: 'metadata_extraction_coverage',
    state: state === 'missing' ? 'missing' : 'stale',
    reason,
    recommendation: reason,
    evidence: primaryIssue
  };
}

export function buildGovernanceAlerts({
  compilerExplainability = null,
  source = 'status'
} = {}) {
  const watcherAlerts = [];
  const logs = [];

  const driftAssessment = compilerExplainability?.driftAssessment || null;
  const policySignal = driftAssessment?.signals?.find((signal) => signal?.key === 'policy_drift') || null;
  if (driftAssessment?.status === 'blocked' || policySignal?.state === 'blocked') {
    const reason = policySignal?.reason
      || driftAssessment?.primaryIssue?.reason
      || driftAssessment?.nextAction
      || 'Compiler policy drift is blocked.';
    const recommendation = policySignal?.recommendation
      || driftAssessment?.recommendations?.[0]
      || driftAssessment?.nextAction
      || 'Route drift checks through the canonical data gateway contract.';
    watcherAlerts.push(createAlert({
      id: `${source}:governance:policy_drift`,
      level: 'error',
      severity: 'high',
      issueType: 'policy_drift',
      message: reason,
      recommendation,
      source,
      evidence: driftAssessment
    }));
    logs.push({
      level: 'error',
      message: `[governance] policy_drift blocked: ${reason}`,
      time: new Date().toISOString()
    });
  }

  const metadataSignal = extractMetadataSignal(compilerExplainability);
  if (metadataSignal && metadataSignal.state && metadataSignal.state !== 'fresh') {
    const reason = metadataSignal.reason || metadataSignal.recommendation || 'Metadata extraction coverage is partial.';
    watcherAlerts.push(createAlert({
      id: `${source}:governance:metadata_extraction_coverage`,
      level: metadataSignal.state === 'missing' ? 'error' : 'warn',
      severity: metadataSignal.state === 'missing' ? 'high' : 'medium',
      issueType: 'metadata_extraction_coverage',
      message: reason,
      recommendation: metadataSignal.recommendation || reason,
      source,
      evidence: metadataSignal.evidence || compilerExplainability?.metadataExtractionCoverage || null
    }));
    logs.push({
      level: metadataSignal.state === 'missing' ? 'error' : 'warn',
      message: `[governance] metadata_extraction_coverage ${metadataSignal.state}: ${reason}`,
      time: new Date().toISOString()
    });
  }

  return {
    logs,
    watcherAlerts,
    summary: {
      total: logs.length + watcherAlerts.length,
      warnings: logs.filter((entry) => entry.level === 'warn').length,
      errors: logs.filter((entry) => entry.level === 'error').length
        + watcherAlerts.filter((entry) => entry.level === 'error' || entry.severity === 'high').length
    }
  };
}

export function mergeRecentNotificationsWithGovernanceAlerts(notifications = {}, governanceAlerts = null) {
  if (!governanceAlerts || (!Array.isArray(governanceAlerts.logs) && !Array.isArray(governanceAlerts.watcherAlerts))) {
    return normalizeRecentNotifications(notifications || {});
  }

  const logs = [
    ...(Array.isArray(notifications.logs) ? notifications.logs : []),
    ...(Array.isArray(governanceAlerts.logs) ? governanceAlerts.logs : [])
  ];
  const watcherAlerts = [
    ...(Array.isArray(notifications.watcherAlerts) ? notifications.watcherAlerts : []),
    ...(Array.isArray(governanceAlerts.watcherAlerts) ? governanceAlerts.watcherAlerts : [])
  ];
  const warnings = asNumber(notifications.warnings, 0) + asNumber(governanceAlerts.summary?.warnings, 0);
  const errors = asNumber(notifications.errors, 0) + asNumber(governanceAlerts.summary?.errors, 0);

  return normalizeRecentNotifications({
    ...notifications,
    count: logs.length + watcherAlerts.length,
    warnings,
    errors,
    logs,
    watcherAlerts
  });
}

export default {
  buildGovernanceAlerts,
  mergeRecentNotificationsWithGovernanceAlerts
};
