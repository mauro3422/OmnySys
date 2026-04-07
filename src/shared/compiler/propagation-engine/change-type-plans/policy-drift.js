import { buildPropagationPlan } from '../plan-builder.js';
import { buildConnectedSystems } from '../connected-systems.js';

function buildPolicyDriftPropagationPlan(input = {}) {
  const severity = input.severity || 'medium';
  const decision = input.decision || 'review';
  const mode = input.mode || 'alert_and_review';
  const findingCount = Number(input.findingCount || (Array.isArray(input.findings) ? input.findings.length : 0));
  const ruleCount = Number(input.ruleCount || (input.summary?.byRule ? Object.keys(input.summary.byRule).length : 0));
  const policyAreaCount = Number(input.policyAreaCount || (input.summary?.byPolicyArea ? Object.keys(input.summary.byPolicyArea).length : 0));
  const connectedSystems = Array.isArray(input.connectedSystems) && input.connectedSystems.length > 0
    ? input.connectedSystems
    : buildConnectedSystems('policy_drift');

  return buildPropagationPlan({
    ...input,
    changeType: 'policy_drift',
    severity,
    decision,
    mode,
    guidance: input.guidance || 'Surface policy drift to watcher persistence, technical debt, and governance consumers before trusting the canonical compiler APIs.',
    recommendationStrategy: input.recommendationStrategy || 'policy_drift',
    impactedFileCount: Number(input.impactedFileCount || 1),
    rewriteCount: Number(input.rewriteCount || findingCount),
    validationTargetCount: Number(input.validationTargetCount || findingCount + ruleCount + policyAreaCount),
    hasCrossFamilyPropagation: input.hasCrossFamilyPropagation ?? (findingCount > 0 || ruleCount > 0 || policyAreaCount > 0),
    topImpactedFiles: input.topImpactedFiles || [{ filePath: input.focusPath || null }],
    topCandidates: input.topCandidates || [],
    candidateCount: Number(input.candidateCount || findingCount),
    flatFamilies: Number(input.flatFamilies || 0),
    mixedFamilies: Number(input.mixedFamilies || (findingCount > 0 ? 1 : 0)),
    alreadyFolderizedFamilies: Number(input.alreadyFolderizedFamilies || 0),
    drift: input.drift || {
      state: findingCount > 0 ? 'watch' : 'stable',
      reason: findingCount > 0 ? 'policy drift findings present' : 'no policy drift findings'
    },
    connectedSystems
  });
}

export { buildPolicyDriftPropagationPlan };
