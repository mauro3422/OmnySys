import { buildPropagationPlan } from '../plan-builder.js';
import { buildConnectedSystems } from '../connected-systems.js';

function buildPipelineHealthPropagationPlan(input = {}) {
  const severity = input.severity || 'medium';
  const decision = input.decision || 'review';
  const mode = input.mode || 'alert_and_review';
  const warningCount = Number(input.warningCount || 0);
  const impactedFileCount = Number(input.impactedFileCount || 1);
  const connectedSystems = Array.isArray(input.connectedSystems) && input.connectedSystems.length > 0
    ? input.connectedSystems
    : buildConnectedSystems('pipeline_health');

  return buildPropagationPlan({
    ...input,
    changeType: 'pipeline_health',
    severity,
    decision,
    mode,
    guidance: input.guidance || 'Surface pipeline health issues to watcher persistence, technical debt, and health snapshots before trusting the indexed graph.',
    recommendationStrategy: input.recommendationStrategy || 'pipeline_health',
    impactedFileCount,
    rewriteCount: Number(input.rewriteCount || warningCount),
    validationTargetCount: Number(input.validationTargetCount || warningCount + impactedFileCount),
    hasCrossFamilyPropagation: input.hasCrossFamilyPropagation ?? warningCount > 0,
    topImpactedFiles: input.topImpactedFiles || [{ filePath: input.focusPath || null }],
    topCandidates: input.topCandidates || [],
    candidateCount: Number(input.candidateCount || warningCount),
    flatFamilies: Number(input.flatFamilies || 0),
    mixedFamilies: Number(input.mixedFamilies || (warningCount > 0 ? 1 : 0)),
    alreadyFolderizedFamilies: Number(input.alreadyFolderizedFamilies || 0),
    drift: input.drift || {
      state: warningCount > 0 ? 'watch' : 'stable',
      reason: warningCount > 0 ? 'pipeline health warnings present' : 'no pipeline health warnings'
    },
    connectedSystems
  });
}

export { buildPipelineHealthPropagationPlan };
