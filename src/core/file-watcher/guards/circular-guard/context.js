import { createStandardContext } from '../guard-standards.js';
import {
  buildPropagationPlan,
  summarizePropagationPlan
} from '../../../../shared/compiler/index.js';

export function buildCircularPropagation({
  scopePath = null,
  focusPath = null,
  severity = 'medium',
  cycleType = 'circular',
  candidateNames = [],
  cycleLength = 0,
  reason = 'circular dependency detected'
}) {
  return summarizePropagationPlan(buildPropagationPlan({
    changeType: 'topology_regression',
    scopePath,
    focusPath,
    severity,
    impactedFileCount: 1,
    rewriteCount: 1,
    candidateCount: Math.max(candidateNames.length, 1),
    validationTargetCount: 1,
    topCandidates: candidateNames.slice(0, 5).map((name) => ({
      name,
      filePath: focusPath
    })),
    topImpactedFiles: focusPath ? [{ filePath: focusPath }] : [],
    guidance: 'Surface circular dependency findings to watcher persistence, health snapshots, and topology governance before trusting the graph.',
    recommendationStrategy: 'topology_regression',
    drift: {
      state: 'watch',
      reason: `${cycleType}: ${reason}${cycleLength > 0 ? ` (length=${cycleLength})` : ''}`
    }
  }));
}

export function buildCircularContext({
  severity,
  atomId,
  atomName,
  suggestedAction,
  suggestedAlternatives,
  extraData
}) {
  return createStandardContext({
    guardName: 'circular-guard',
    atomId,
    atomName,
    severity,
    suggestedAction,
    suggestedAlternatives,
    extraData
  });
}
