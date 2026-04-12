/**
 * Dashboard section builders for compiler health snapshots.
 *
 * Keep these leaf builders separate so the main dashboard coordinator stays
 * below the watcher size threshold and remains easy to edit safely.
 */

import { asNumber } from './helpers.js';

export function buildArchiveDaily(current, folderizationPropagation, policyCoverage, trend, capturedAt = null) {
  return {
    capturedAt: capturedAt || current.capturedAt || null,
    globalHealthScore: asNumber(current.globalHealthScore, asNumber(current.healthScore, 0)),
    globalHealthGrade: current.globalHealthGrade || current.healthGrade || 'F',
    healthScore: asNumber(current.healthScore, 0),
    healthGrade: current.healthGrade || 'F',
    behaviorState: current.behaviorState || null,
    driftState: current.driftState || null,
    startupTelemetry: current.startupTelemetry ? { ...current.startupTelemetry } : null,
    folderizationPropagation: folderizationPropagation ? { ...folderizationPropagation } : null,
    canonicalPromotion: current.canonicalPromotion ? { ...current.canonicalPromotion } : null,
    policyCoverage: policyCoverage ? { ...policyCoverage } : null,
    successScore: asNumber(current.successScore, 0),
    issueCount: asNumber(current.issueCount, 0),
    summary: current.summaryText || trend.summary || null
  };
}

export function buildArchiveLifetime(ha) {
  return {
    daysObserved: ha.daysObserved || 0,
    snapshotsRecorded: ha.snapshotsRecorded || 0,
    firstCapturedAt: ha.firstCapturedAt || null,
    lastCapturedAt: ha.lastCapturedAt || null,
    averageHealthScore: ha.averageHealthScore || 0,
    averageDriftScore: ha.averageDriftScore || 0,
    averageStabilityScore: ha.averageStabilityScore || 0,
    averageSuccessScore: ha.averageSuccessScore || 0,
    totalIssueCount: ha.totalIssueCount || 0,
    totalWarningCount: ha.totalWarningCount || 0,
    totalErrorCount: ha.totalErrorCount || 0,
    totalWatcherAlertCount: ha.totalWatcherAlertCount || 0,
    latestHealthScore: ha.latestHealthScore || 0,
    latestHealthGrade: ha.latestHealthGrade || null,
    latestBehaviorState: ha.latestBehaviorState || null,
    latestClientSyncState: ha.latestClientSyncState || null,
    summary: ha.summary || null
  };
}

export function buildLifetime(ha) {
  if (!ha) return null;
  return buildArchiveLifetime(ha);
}

export function buildHealthSection(current, cpContracts, folderizationPropagation, policyCoverage, propagationExpansion) {
  return {
    globalHealthScore: asNumber(current.globalHealthScore, asNumber(current.healthScore, 0)),
    globalHealthGrade: current.globalHealthGrade || current.healthGrade || 'F',
    healthScore: asNumber(current.healthScore, 0),
    healthGrade: current.healthGrade || 'F',
    reliabilityScore: asNumber(current.reliabilityScore, 0),
    reliabilityGrade: current.reliabilityGrade || 'F',
    reliabilityState: current.reliabilityState || null,
    successScore: asNumber(current.successScore, 0),
    successThreshold: asNumber(current.successThreshold, 0),
    mvpReady: current.mvpReady === true,
    behaviorState: current.behaviorState || null,
    readinessReason: current.readinessReason || null,
    driftState: current.driftState || null,
    driftScore: asNumber(current.driftScore, 0),
    stabilityScore: asNumber(current.stabilityScore, 0),
    startupTelemetry: current.startupTelemetry ? { ...current.startupTelemetry } : null,
    folderizationPropagation: folderizationPropagation ? { ...folderizationPropagation } : null,
    canonicalPromotion: current.canonicalPromotion ? { ...current.canonicalPromotion } : null,
    policyCoverage: policyCoverage ? { ...policyCoverage } : null,
    metadataCoveragePct: asNumber(current.metadataCoveragePct, 0),
    integrationCoveragePct: asNumber(cpContracts.integrationCoveragePct, 0),
    activeAtomsDriftState: current.activeAtomsDriftState || null,
    activeAtomsDriftReason: current.activeAtomsDriftReason || null,
    clientSyncState: current.clientSyncState || null,
    clientSyncSeverity: current.clientSyncSeverity || null,
    clientSyncRecommendation: current.clientSyncRecommendation || null,
    propagationExpansionState: propagationExpansion?.state || null,
    propagationExpansionReason: propagationExpansion?.reason || null,
    propagationExpansionRecommendation: propagationExpansion?.recommendation || null,
    activeAtomsDelta: asNumber(current.activeAtomsDelta, 0),
    activeAtomsDeltaPct: asNumber(current.activeAtomsDeltaPct, 0)
  };
}

export function buildTrendSection(trend) {
  return {
    status: trend.status || 'missing',
    summary: trend.summary || null,
    progressScore: asNumber(trend.progressScore, 0),
    velocityPerDay: asNumber(trend.velocityPerDay, 0),
    improvingStreak: trend.improvingStreak === true,
    behaviorTrend: asNumber(trend.behaviorTrend, 0),
    daysSincePrevious: asNumber(trend.daysSincePrevious, 0),
    daysSinceBaseline: asNumber(trend.daysSinceBaseline, 0)
  };
}

export function buildMetricsSection(current, cpContracts, pipelineTimingTelemetry) {
  return {
    issueCount: asNumber(current.issueCount, 0),
    structuralGroups: asNumber(current.structuralGroups, 0),
    conceptualGroups: asNumber(current.conceptualGroups, 0),
    pipelineOrphans: asNumber(current.pipelineOrphans, 0),
    folderizationCandidateCount: asNumber(current.folderizationCandidateCount, 0),
    flatFamilies: asNumber(current.flatFamilies, 0),
    mixedFamilies: asNumber(current.mixedFamilies, 0),
    alreadyFolderizedFamilies: asNumber(current.alreadyFolderizedFamilies, 0),
    namingFamilies: asNumber(current.namingFamilies, 0),
    namingTargets: asNumber(current.namingTargets, 0),
    namingDebt: asNumber(current.namingDebt, 0),
    liveCoverageRatio: asNumber(current.liveCoverageRatio, 0),
    activeAtoms: asNumber(current.activeAtoms, 0),
    zeroAtomFileCount: asNumber(current.zeroAtomFileCount, 0),
    callLinks: asNumber(current.callLinks, 0),
    semanticLinks: asNumber(current.semanticLinks, 0),
    watcherAlertCount: asNumber(current.watcherAlertCount, 0),
    recentWarningCount: asNumber(current.recentWarningCount, 0),
    recentErrorCount: asNumber(current.recentErrorCount, 0),
    phase2PendingFiles: asNumber(current.phase2PendingFiles, 0),
    metadataCoveragePct: asNumber(current.metadataCoveragePct, 0),
    integrationCoveragePct: asNumber(cpContracts.integrationCoveragePct, 0),
    metadataFieldCoveragePct: asNumber(current.metadataFieldCoveragePct, 0),
    dataGatewayTrustworthy: current.dataGatewayTrustworthy === true,
    pipelineTimingTelemetry
  };
}

export function buildSessionsSection(summary) {
  if (!summary) return null;
  return {
    summary: summary.summary || null,
    clientSyncState: summary.clientSyncState || null,
    clientSyncReason: summary.clientSyncReason || null,
    clientSyncRecommendation: summary.clientSyncRecommendation || null,
    clientSyncSummary: summary.clientSyncSummary || null,
    transportOriginCounts: summary.transportOriginCounts || null,
    transportOriginTotal: summary.transportOriginTotal || 0,
    transportOriginDistinctCount: summary.transportOriginDistinctCount || 0,
    transportOriginKnownCount: summary.transportOriginKnownCount || 0,
    dominantTransportOrigin: summary.dominantTransportOrigin || null,
    dominantTransportOriginCount: summary.dominantTransportOriginCount || 0,
    transportOriginMix: Array.isArray(summary.transportOriginMix) ? summary.transportOriginMix.slice(0, 8) : [],
    transportProvenanceState: summary.transportProvenanceState || null,
    transportProvenanceHealthy: summary.transportProvenanceHealthy === true,
    transportProvenanceTrustworthy: summary.transportProvenanceTrustworthy !== false,
    transportProvenanceReason: summary.transportProvenanceReason || null,
    transportProvenanceRecommendation: summary.transportProvenanceRecommendation || null,
    transportProvenanceSummary: summary.transportProvenanceSummary || null,
    transportSessionStateCounts: summary.transportSessionStateCounts || null,
    transportRequestPhaseCounts: summary.transportRequestPhaseCounts || null,
    transportClientRouteIdCounts: summary.transportClientRouteIdCounts || null,
    transportHandshakeSignatureCounts: summary.transportHandshakeSignatureCounts || null,
    transportSessionHeaderPresentCount: summary.transportSessionHeaderPresentCount || 0,
    transportSessionHeaderMissingCount: summary.transportSessionHeaderMissingCount || 0,
    transportAlertState: summary.transportAlertState || null,
    transportAlertCount: summary.transportAlertCount || 0,
    transportAlertHealthy: summary.transportAlertHealthy === true,
    transportAlertTrustworthy: summary.transportAlertTrustworthy !== false,
    transportAlertReason: summary.transportAlertReason || null,
    transportAlertRecommendation: summary.transportAlertRecommendation || null,
    transportAlertSummary: summary.transportAlertSummary || null,
    transportAlerts: Array.isArray(summary.transportAlerts) ? summary.transportAlerts.slice(0, 8) : []
  };
}

export function buildHistorySection(history) {
  return {
    total: Array.isArray(history?.entries) ? history.entries.length : 0,
    latestCapturedAt: history?.latest?.capturedAt || null,
    previousCapturedAt: history?.previous?.capturedAt || null,
    baselineCapturedAt: history?.baseline?.capturedAt || null
  };
}
