import { buildPropagationPlan } from '../plan-builder.js';
import { buildConnectedSystems } from '../connected-systems.js';

function buildDuplicateRiskPropagationPlan(input = {}) {
  const severity = input.severity || 'medium';
  const decision = input.decision || 'review';
  const mode = input.mode || 'recommend_and_review';
  const duplicateCount = Number(input.duplicateCount || 0);
  const impactedFileCount = Number(input.impactedFileCount || duplicateCount || 1);
  const connectedSystems = Array.isArray(input.connectedSystems) && input.connectedSystems.length > 0
    ? input.connectedSystems
    : buildConnectedSystems('duplicate_risk_remediation');

  return buildPropagationPlan({
    ...input,
    changeType: 'duplicate_risk_remediation',
    severity,
    decision,
    mode,
    guidance: input.guidance || 'Route duplicate remediation through folderization, renaming, debt reporting, and cache policy before mutating families.',
    recommendationStrategy: input.recommendationStrategy || 'duplicate_risk',
    impactedFileCount,
    rewriteCount: Number(input.rewriteCount || duplicateCount),
    validationTargetCount: Number(input.validationTargetCount || duplicateCount + impactedFileCount),
    hasCrossFamilyPropagation: input.hasCrossFamilyPropagation ?? duplicateCount > 0,
    topImpactedFiles: input.topImpactedFiles || [{ filePath: input.focusPath || null }],
    topCandidates: input.topCandidates || [],
    candidateCount: Number(input.candidateCount || duplicateCount),
    flatFamilies: Number(input.flatFamilies || 0),
    mixedFamilies: Number(input.mixedFamilies || (duplicateCount > 0 ? 1 : 0)),
    alreadyFolderizedFamilies: Number(input.alreadyFolderizedFamilies || 0),
    drift: input.drift || {
      state: duplicateCount > 0 ? 'watch' : 'stable',
      reason: duplicateCount > 0 ? 'duplicate risk evidence present' : 'no duplicate risk evidence'
    },
    connectedSystems
  });
}

export { buildDuplicateRiskPropagationPlan };
