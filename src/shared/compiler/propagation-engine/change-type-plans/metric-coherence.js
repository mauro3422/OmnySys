/**
 * Metric coherence propagation plan.
 *
 * When metric incoherence is detected (e.g., activeAtoms differs between
 * databaseHealth and raw SQL, or reporting endpoints show different values),
 * this plan propagates the alert to all connected systems so they can
 * reconcile or warn users.
 */

import { buildPropagationPlan } from '../plan-builder.js';
import { buildConnectedSystems } from '../connected-systems.js';

function buildMetricCoherencePropagationPlan(input = {}) {
  const severity = input.severity || 'medium';
  const decision = input.decision || 'review';
  const mode = input.mode || 'alert_and_review';
  const findingCount = Number(
    input.findingCount
    || (input.coherenceReport?.totalFindings || 0)
    || (Array.isArray(input.findings) ? input.findings.length : 0)
  );

  const criticalCount = Number(
    input.criticalCount
    || (input.coherenceReport?.database?.criticalFindings?.length || 0)
    || (Array.isArray(input.findings) ? input.findings.filter(f => f.severity === 'critical').length : 0)
  );

  const highCount = Number(
    input.highCount
    || (input.coherenceReport?.database?.highFindings?.length || 0)
    || (Array.isArray(input.findings) ? input.findings.filter(f => f.severity === 'high').length : 0)
  );

  const connectedSystems = Array.isArray(input.connectedSystems) && input.connectedSystems.length > 0
    ? input.connectedSystems
    : buildConnectedSystems('metric_coherence');

  const affectedMetrics = Array.isArray(input.findings)
    ? [...new Set(input.findings.map(f => f.metric).filter(Boolean))]
    : [];

  return buildPropagationPlan({
    ...input,
    changeType: 'metric_coherence',
    severity,
    decision,
    mode,
    guidance: input.guidance
      || 'Surface metric incoherence to watcher persistence, technical debt, and governance consumers. Ensure all reporting surfaces consume from the same compilerExplainability instance.',
    recommendationStrategy: input.recommendationStrategy || 'metric_coherence',
    impactedFileCount: Number(input.impactedFileCount || 1),
    rewriteCount: Number(input.rewriteCount || 0),
    validationTargetCount: Number(input.validationTargetCount || findingCount),
    hasCrossFamilyPropagation: input.hasCrossFamilyPropagation ?? (findingCount > 0),
    topImpactedFiles: input.topImpactedFiles || [{
      filePath: input.focusPath || 'src/shared/compiler/compiler-metrics-current.js',
      reason: 'Metrics assembly layer may be using stale or inconsistent data sources'
    }],
    topCandidates: input.topCandidates || [],
    candidateCount: Number(input.candidateCount || findingCount),
    flatFamilies: Number(input.flatFamilies || 0),
    mixedFamilies: Number(input.mixedFamilies || (findingCount > 0 ? 1 : 0)),
    alreadyFolderizedFamilies: Number(input.alreadyFolderizedFamilies || 0),
    drift: input.drift || {
      state: findingCount > 0 ? 'watch' : 'stable',
      reason: findingCount > 0
        ? `metric coherence violations detected: ${criticalCount} critical, ${highCount} high, ${findingCount} total`
        : 'no metric coherence violations detected',
      affectedMetrics
    },
    coherenceReport: input.coherenceReport || null,
    affectedMetrics,
    criticalCount,
    highCount,
    findingCount,
    connectedSystems
  });
}

export { buildMetricCoherencePropagationPlan };
