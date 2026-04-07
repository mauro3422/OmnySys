import { buildPropagationPlan } from '../plan-builder.js';
import { buildConnectedSystems } from '../connected-systems.js';

function buildTopologyRegressionPropagationPlan(input = {}) {
  const severity = input.severity || 'medium';
  const decision = input.decision || 'review';
  const mode = input.mode || 'alert_and_review';
  const impactedFileCount = Number(input.impactedFileCount || 1);
  const regressedAtomCount = Number(input.regressedAtomCount || 0);
  const connectedSystems = Array.isArray(input.connectedSystems) && input.connectedSystems.length > 0
    ? input.connectedSystems
    : buildConnectedSystems('topology_regression');

  return buildPropagationPlan({
    ...input,
    changeType: 'topology_regression',
    severity,
    decision,
    mode,
    guidance: input.guidance || 'Surface the topology regression plan to watcher persistence, semantic coverage, and drift governance before trusting the recalculated graph.',
    recommendationStrategy: input.recommendationStrategy || 'topology_regression',
    impactedFileCount,
    rewriteCount: Number(input.rewriteCount || regressedAtomCount || 0),
    validationTargetCount: Number(input.validationTargetCount || impactedFileCount + regressedAtomCount),
    hasCrossFamilyPropagation: input.hasCrossFamilyPropagation ?? (impactedFileCount > 1 || regressedAtomCount > 0),
    topImpactedFiles: input.topImpactedFiles || [{ filePath: input.focusPath || null }],
    topCandidates: input.topCandidates || [],
    candidateCount: Number(input.candidateCount || regressedAtomCount),
    flatFamilies: Number(input.flatFamilies || 0),
    mixedFamilies: Number(input.mixedFamilies || (impactedFileCount > 1 ? 1 : 0)),
    alreadyFolderizedFamilies: Number(input.alreadyFolderizedFamilies || 0),
    drift: input.drift || {
      state: regressedAtomCount > 0 ? 'watch' : 'stable',
      reason: regressedAtomCount > 0 ? 'regressed topology signal' : 'no regressed topology signal'
    },
    connectedSystems
  });
}

export { buildTopologyRegressionPropagationPlan };
