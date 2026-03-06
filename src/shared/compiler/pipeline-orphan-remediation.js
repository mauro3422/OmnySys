/**
 * @fileoverview Canonical remediation helpers for exported pipeline atoms that
 * look disconnected from the live graph.
 *
 * @module shared/compiler/pipeline-orphan-remediation
 */

function getRemediationActions(orphan = {}) {
  const actions = [
    'Verify whether the export is still referenced by a production entrypoint.'
  ];

  if ((orphan?.complexity || 0) >= 12) {
    actions.push('Review whether the atom was copied during a refactor and left behind.');
  }

  if ((orphan?.callees_count || 0) === 0) {
    actions.push('Check whether the atom should be inlined, deleted, or wired into the pipeline graph.');
  }

  if ((orphan?.file_importer_count || 0) === 0) {
    actions.push('Confirm whether the file itself is imported anywhere in production code.');
  }

  return actions;
}

export function buildPipelineOrphanRemediation(orphan = {}) {
  return {
    name: orphan.name,
    file: orphan.file_path,
    complexity: orphan.complexity,
    effectiveCallers: orphan.callers_count || 0,
    callees: orphan.callees_count || 0,
    fileImporters: orphan.file_importer_count || 0,
    diagnosis: 'Pipeline atom appears disconnected from both function-level and file-level reachability.',
    recommendedActions: getRemediationActions(orphan)
  };
}

export function buildPipelineOrphanRemediationPlan(orphans = []) {
  return {
    total: orphans.length,
    items: orphans.map(buildPipelineOrphanRemediation),
    recommendation: orphans.length > 0
      ? 'Review pipeline orphan candidates before deleting or rewiring them.'
      : 'No disconnected pipeline atoms detected.'
  };
}
