import { buildStandardItem, buildStandardPlan } from './remediation-plan-builder.js';
import { getRecommendation } from './recommendations/RecommendationEngine.js';

function getRemediationActions(orphan = {}) {
  const importerCount = Math.max(
    Number(orphan?.dependency_importer_count) || 0,
    Number(orphan?.file_importer_count) || 0
  );
  const actions = ['Verify whether the export is still referenced by a production entrypoint.'];

  if ((orphan?.complexity || 0) >= 12) {
    actions.push('Review whether the atom was copied during a refactor and left behind.');
  }

  if ((orphan?.callees_count || 0) === 0) {
    actions.push('Check whether the atom should be inlined, deleted, or wired into the pipeline graph.');
  }

  if (importerCount === 0) {
    actions.push('Confirm whether the file itself is imported anywhere in production code.');
  }

  return actions;
}

export function buildPipelineOrphanRemediation(orphan = {}) {
  const importerCount = Math.max(
    Number(orphan?.dependency_importer_count) || 0,
    Number(orphan?.file_importer_count) || 0,
    Number(orphan?.barrel_exporter_count) || 0
  );
  return buildStandardItem({
    name: orphan.name,
    file: orphan.file_path,
    diagnosis: 'Pipeline atom appears disconnected from both function-level and file-level reachability.',
    actions: getRemediationActions(orphan),
    complexity: orphan.complexity,
    effectiveCallers: orphan.callers_count || 0,
    callees: orphan.callees_count || 0,
    fileImporters: importerCount
  });
}

export function buildPipelineOrphanRemediationPlan(orphans = []) {
  return buildStandardPlan({
    total: orphans.length,
    items: orphans.map(buildPipelineOrphanRemediation),
    recommendation: getRecommendation({ type: 'pipeline_orphan' }).message,
    emptyRecommendation: 'No disconnected pipeline atoms detected.'
  });
}
