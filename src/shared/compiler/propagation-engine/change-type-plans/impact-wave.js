import { buildPropagationPlan } from '../plan-builder.js';
import { buildConnectedSystems } from '../connected-systems.js';

function buildImpactWavePropagationPlan(input = {}) {
  const severity = input.severity || 'low';
  const decision = input.decision || (severity === 'low' ? 'approve' : 'review');
  const mode = input.mode || (severity === 'low' ? 'alert_and_recommend' : 'alert_and_review');
  const guidance = input.guidance || 'Surface the impact wave plan to watcher alerts, export validation, cache policy, and drift governance.';
  const recommendationStrategy = input.recommendationStrategy || 'impact_wave';
  const connectedSystems = Array.isArray(input.connectedSystems) && input.connectedSystems.length > 0
    ? input.connectedSystems
    : buildConnectedSystems('impact_wave');

  return buildPropagationPlan({
    ...input,
    changeType: 'impact_wave',
    decision,
    mode,
    guidance,
    recommendationStrategy,
    hasCrossFamilyPropagation: input.hasCrossFamilyPropagation ?? (Number(input.impactedFileCount || 0) > 0 || Number(input.rewriteCount || 0) > 0),
    connectedSystems
  });
}

export { buildImpactWavePropagationPlan };
