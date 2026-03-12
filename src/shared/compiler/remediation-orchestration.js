/**
 * @fileoverview Canonical orchestration helpers for compiler remediation plans.
 *
 * Turns multiple remediation families into a single backlog so MCP metrics and
 * future tools can present one prioritized compiler action queue.
 *
 * @module shared/compiler/remediation-orchestration
 */

const DEFAULT_SEVERITY_PRIORITY = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1
};

export function normalizeRemediationSection(section = {}) {
  const items = Array.isArray(section.items) ? section.items : [];

  return {
    id: section.id || 'unknown',
    label: section.label || section.id || 'Unknown remediation',
    severity: section.severity || 'low',
    priority: Number.isFinite(section.priority)
      ? section.priority
      : (DEFAULT_SEVERITY_PRIORITY[section.severity] || 0),
    totalItems: Number.isFinite(section.totalItems) ? section.totalItems : items.length,
    recommendation: section.recommendation || 'Review remediation items.',
    items
  };
}

export function buildCompilerRemediationBacklog(sections = []) {
  const normalized = (Array.isArray(sections) ? sections : [])
    .map(normalizeRemediationSection)
    .filter((section) => section.totalItems > 0 || section.recommendation);

  const prioritized = [...normalized].sort((a, b) => {
    const severityDelta = (b.priority || 0) - (a.priority || 0);
    if (severityDelta !== 0) return severityDelta;
    return (b.totalItems || 0) - (a.totalItems || 0);
  });

  return {
    totalSections: prioritized.length,
    totalItems: prioritized.reduce((sum, section) => sum + (section.totalItems || 0), 0),
    highestSeverity: prioritized[0]?.severity || null,
    sections: prioritized,
    nextAction: prioritized[0]?.recommendation || 'No compiler remediation backlog pending.'
  };
}

export function buildPipelineHealthCompilerRemediationItems({
  liveRowRemediation,
  staleFileRows = 0,
  staleRiskRows = 0,
  pipelineOrphanRemediation,
  orphanFunctions = [],
  deadCodeRemediation,
  suspiciousDeadCandidates = 0,
  duplicateRemediation
} = {}) {
  return [
    {
      id: 'live_rows',
      label: 'Live/stale row cleanup',
      severity: staleFileRows > 0 || staleRiskRows > 0 ? 'high' : 'low',
      totalItems: staleFileRows + staleRiskRows,
      recommendation: liveRowRemediation?.recommendation,
      items: liveRowRemediation?.items || []
    },
    {
      id: 'pipeline_orphans',
      label: 'Pipeline orphan remediation',
      severity: orphanFunctions.length > 0 ? 'high' : 'low',
      totalItems: pipelineOrphanRemediation?.totalCandidates || orphanFunctions.length,
      recommendation: pipelineOrphanRemediation?.recommendation,
      items: pipelineOrphanRemediation?.items || []
    },
    {
      id: 'dead_code',
      label: 'Dead code remediation',
      severity: suspiciousDeadCandidates > 0 ? 'medium' : 'low',
      totalItems: deadCodeRemediation?.totalCandidates || suspiciousDeadCandidates,
      recommendation: deadCodeRemediation?.recommendation,
      items: deadCodeRemediation?.items || []
    },
    {
      id: 'duplicates',
      label: 'Duplicate remediation',
      severity: duplicateRemediation?.totalGroups > 0 ? 'medium' : 'low',
      totalItems: duplicateRemediation?.totalGroups || 0,
      recommendation: duplicateRemediation?.recommendation,
      items: duplicateRemediation?.items || []
    }
  ];
}
