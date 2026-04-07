import { buildPropagationPlan } from '../plan-builder.js';
import { buildConnectedSystems } from '../connected-systems.js';

function buildSemanticCoveragePropagationPlan(input = {}) {
  const severity = input.severity || 'medium';
  const decision = input.decision || 'review';
  const mode = input.mode || 'alert_and_review';
  const gapCount = Number(input.gapCount || (Array.isArray(input.gaps) ? input.gaps.length : 0));
  const sharesStateRelations = Number(input.sharesStateRelations || 0);
  const networkCandidateCount = Number(input.networkCandidateCount || (Array.isArray(input.networkCandidates) ? input.networkCandidates.length : 0));
  const connectedSystems = Array.isArray(input.connectedSystems) && input.connectedSystems.length > 0
    ? input.connectedSystems
    : buildConnectedSystems('semantic_coverage');

  return buildPropagationPlan({
    ...input,
    changeType: 'semantic_coverage',
    severity,
    decision,
    mode,
    guidance: input.guidance || 'Surface semantic coverage gaps to watcher persistence, semantic storage, and drift governance before trusting the extracted graph.',
    recommendationStrategy: input.recommendationStrategy || 'semantic_coverage',
    impactedFileCount: Number(input.impactedFileCount || 1),
    rewriteCount: Number(input.rewriteCount || gapCount),
    validationTargetCount: Number(input.validationTargetCount || gapCount + sharesStateRelations + networkCandidateCount),
    hasCrossFamilyPropagation: input.hasCrossFamilyPropagation ?? (gapCount > 0 || sharesStateRelations > 0 || networkCandidateCount > 0),
    topImpactedFiles: input.topImpactedFiles || [{ filePath: input.focusPath || null }],
    topCandidates: input.topCandidates || [],
    candidateCount: Number(input.candidateCount || gapCount + networkCandidateCount),
    flatFamilies: Number(input.flatFamilies || 0),
    mixedFamilies: Number(input.mixedFamilies || (gapCount > 0 ? 1 : 0)),
    alreadyFolderizedFamilies: Number(input.alreadyFolderizedFamilies || 0),
    drift: input.drift || {
      state: gapCount > 0 ? 'watch' : 'stable',
      reason: gapCount > 0 ? 'semantic coverage gap' : 'no semantic coverage gap'
    },
    connectedSystems
  });
}

export { buildSemanticCoveragePropagationPlan };
