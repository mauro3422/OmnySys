/**
 * Canonical builder for the high-level compiler metrics snapshot summary.
 */

import { asNumber } from '../core-utils.js';

export function buildCompilerMetricsSnapshotSummary(current = {}, trend = {}) {
  return [
    `Health ${Math.round(asNumber(current.globalHealthScore, current.healthScore || 0))}/${current.globalHealthGrade || current.healthGrade || 'F'}`,
    `db=${asNumber(current.healthScore, 0)}/${current.healthGrade || 'F'}`,
    `trust=${Math.round(asNumber(current.reliabilityScore, 0))}/${current.reliabilityGrade || 'F'}`,
    trend.summary || null,
    `progress=${trend.progressScore}`,
    `velocity/day=${trend.velocityPerDay}`,
    `success=${Math.round(asNumber(current.successScore, 0))}/${asNumber(current.successThreshold, 0)}${current.mvpReady ? ' ready' : ''}`,
    `behavior=${current.behaviorState}`,
    `dbsync=${current.activeAtomsDriftState || 'missing'}`,
    current.clientSyncState && current.clientSyncState !== 'fresh' ? `clientsync=${current.clientSyncState}` : null,
    current.transportProvenanceState && current.transportProvenanceState !== 'fresh' ? `transport=${current.transportProvenanceState}` : null,
    current.toolTelemetry?.totalRuns > 0 ? `tools=${current.toolTelemetry.successfulRuns}/${current.toolTelemetry.totalRuns} ok` : 'tools=0',
    current.toolTelemetry?.pressureRuns > 0 ? `repair=${current.toolTelemetry.repairedRuns}/${current.toolTelemetry.pressureRuns}` : null,
    `dups=${asNumber(current.structuralGroups, 0) + asNumber(current.conceptualGroups, 0)}`,
    `folder=${asNumber(current.alreadyFolderizedFamilies, 0)}/${asNumber(current.flatFamilies, 0) + asNumber(current.mixedFamilies, 0) + asNumber(current.alreadyFolderizedFamilies, 0)}`,
    `coverage=${Math.round(asNumber(current.liveCoverageRatio, 0) * 100)}%`
  ].filter(Boolean).join(' | ');
}

export default {
  buildCompilerMetricsSnapshotSummary
};
