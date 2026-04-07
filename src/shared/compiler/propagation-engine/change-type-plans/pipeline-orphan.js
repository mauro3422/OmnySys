import { buildPropagationPlan } from '../plan-builder.js';
import { buildConnectedSystems } from '../connected-systems.js';

function buildPipelineOrphanPropagationPlan(input = {}) {
  const severity = input.severity || 'medium';
  const decision = input.decision || 'review';
  const mode = input.mode || 'alert_and_review';
  const orphanCount = Number(input.orphanCount || 0);
  const impactedFileCount = Number(input.impactedFileCount || 1);
  const connectedSystems = Array.isArray(input.connectedSystems) && input.connectedSystems.length > 0
    ? input.connectedSystems
    : buildConnectedSystems('pipeline_orphan');

  return buildPropagationPlan({
    ...input,
    changeType: 'pipeline_orphan',
    severity,
    decision,
    mode,
    guidance: input.guidance || 'Route orphan findings to watcher persistence, semantic storage, and debt consumers before trusting pipeline connectivity.',
    recommendationStrategy: input.recommendationStrategy || 'pipeline_orphan',
    impactedFileCount,
    rewriteCount: Number(input.rewriteCount || orphanCount),
    validationTargetCount: Number(input.validationTargetCount || orphanCount + impactedFileCount),
    hasCrossFamilyPropagation: input.hasCrossFamilyPropagation ?? orphanCount > 0,
    topImpactedFiles: input.topImpactedFiles || [{ filePath: input.focusPath || null }],
    topCandidates: input.topCandidates || [],
    candidateCount: Number(input.candidateCount || orphanCount),
    flatFamilies: Number(input.flatFamilies || 0),
    mixedFamilies: Number(input.mixedFamilies || (orphanCount > 0 ? 1 : 0)),
    alreadyFolderizedFamilies: Number(input.alreadyFolderizedFamilies || 0),
    drift: input.drift || {
      state: orphanCount > 0 ? 'watch' : 'stable',
      reason: orphanCount > 0 ? 'pipeline orphan evidence present' : 'no pipeline orphan evidence'
    },
    connectedSystems
  });
}

export { buildPipelineOrphanPropagationPlan };
