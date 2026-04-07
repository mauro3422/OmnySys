import { buildPropagationPlan } from '../plan-builder.js';
import { buildConnectedSystems } from '../connected-systems.js';

function buildIntegrityGuardPropagationPlan(input = {}) {
  const severity = input.severity || 'medium';
  const decision = input.decision || 'review';
  const mode = input.mode || 'alert_and_review';
  const violationCount = Number(input.violationCount || 0);
  const impactedFileCount = Number(input.impactedFileCount || 1);
  const connectedSystems = Array.isArray(input.connectedSystems) && input.connectedSystems.length > 0
    ? input.connectedSystems
    : buildConnectedSystems('integrity_guard');

  return buildPropagationPlan({
    ...input,
    changeType: 'integrity_guard',
    severity,
    decision,
    mode,
    guidance: input.guidance || 'Surface integrity violations to watcher persistence, semantic storage, and drift governance before trusting data-flow coherence.',
    recommendationStrategy: input.recommendationStrategy || 'integrity_guard',
    impactedFileCount,
    rewriteCount: Number(input.rewriteCount || violationCount),
    validationTargetCount: Number(input.validationTargetCount || violationCount + impactedFileCount),
    hasCrossFamilyPropagation: input.hasCrossFamilyPropagation ?? violationCount > 0,
    topImpactedFiles: input.topImpactedFiles || [{ filePath: input.focusPath || null }],
    topCandidates: input.topCandidates || [],
    candidateCount: Number(input.candidateCount || violationCount),
    flatFamilies: Number(input.flatFamilies || 0),
    mixedFamilies: Number(input.mixedFamilies || (violationCount > 0 ? 1 : 0)),
    alreadyFolderizedFamilies: Number(input.alreadyFolderizedFamilies || 0),
    drift: input.drift || {
      state: violationCount > 0 ? 'watch' : 'stable',
      reason: violationCount > 0 ? 'integrity violation evidence present' : 'no integrity violation evidence'
    },
    connectedSystems
  });
}

export { buildIntegrityGuardPropagationPlan };
