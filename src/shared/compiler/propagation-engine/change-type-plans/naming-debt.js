import { buildPropagationPlan } from '../plan-builder.js';
import { buildConnectedSystems } from '../connected-systems.js';

function buildNamingDebtPropagationPlan(input = {}) {
  const severity = input.severity || 'medium';
  const decision = input.decision || 'recommend_and_review';
  const mode = input.mode || 'recommend_and_review';
  const namingDebtCount = Number(input.namingDebtCount || 0);
  const impactedFileCount = Number(input.impactedFileCount || namingDebtCount || 1);
  const connectedSystems = Array.isArray(input.connectedSystems) && input.connectedSystems.length > 0
    ? input.connectedSystems
    : buildConnectedSystems('rename');

  return buildPropagationPlan({
    ...input,
    changeType: 'naming_debt',
    severity,
    decision,
    mode,
    guidance: input.guidance || 'Route naming debt remediation through rename_folderized_family, normalize_folderized_family_names, and technical debt reporting before mutating file structures.',
    recommendationStrategy: input.recommendationStrategy || 'naming_debt',
    impactedFileCount,
    rewriteCount: Number(input.rewriteCount || namingDebtCount),
    renameTargetCount: Number(input.renameTargetCount || namingDebtCount),
    validationTargetCount: Number(input.validationTargetCount || namingDebtCount + impactedFileCount),
    hasCrossFamilyPropagation: input.hasCrossFamilyPropagation ?? namingDebtCount > 0,
    topImpactedFiles: input.topImpactedFiles || [{ filePath: input.focusPath || null }],
    topCandidates: input.topCandidates || [],
    candidateCount: Number(input.candidateCount || namingDebtCount),
    flatFamilies: Number(input.flatFamilies || 0),
    mixedFamilies: Number(input.mixedFamilies || (namingDebtCount > 0 ? 1 : 0)),
    alreadyFolderizedFamilies: Number(input.alreadyFolderizedFamilies || 0),
    drift: input.drift || {
      state: namingDebtCount > 0 ? 'watch' : 'stable',
      reason: namingDebtCount > 0 ? 'naming debt evidence present' : 'no naming debt evidence'
    },
    connectedSystems
  });
}

export { buildNamingDebtPropagationPlan };
