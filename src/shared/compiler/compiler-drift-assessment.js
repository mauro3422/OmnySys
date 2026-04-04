import { normalizeCount } from './contract-helpers.js';
import { summarizeAnalysisGeneration } from './counts-generation.js';
import { summarizeDataGatewayContract } from './contract.js';
import { summarizeMetadataExtractionCoverage } from './metadata-extraction-coverage/coverage.js';

const signal = (value) => value;

const countSignals = (signals = []) => {
  const summary = { total: signals.length, fresh: 0, partial: 0, stale: 0, missing: 0, blocked: 0 };
  for (const item of signals) summary[item.state] = (summary[item.state] || 0) + 1;
  summary.healthy = summary.blocked === 0 && summary.stale === 0 && summary.missing === 0;
  summary.trustworthy = summary.healthy;
  return summary;
};

const primaryIssue = (signals = []) =>
  signals.find((item) => item.state === 'blocked')
  || signals.find((item) => item.state === 'stale')
  || signals.find((item) => item.state === 'missing')
  || signals.find((item) => item.state === 'partial')
  || null;

function policySignal(policySummary = {}) {
  const total = normalizeCount(policySummary.total);
  const high = normalizeCount(policySummary.high);
  const medium = normalizeCount(policySummary.medium);
  const byPolicyArea = policySummary.byPolicyArea || {};
  const dataGateway = normalizeCount(byPolicyArea.data_gateway);
  const propagationExpansion = normalizeCount(byPolicyArea.propagation_expansion);
  const liveRowDrift = normalizeCount(byPolicyArea.live_row_drift);
  const watcherDiagnostics = normalizeCount(byPolicyArea.watcher_diagnostics);
  const semanticSurface = normalizeCount(byPolicyArea.semantic_surface_granularity);
  const fileUniverse = normalizeCount(byPolicyArea.file_universe_granularity);
  const base = { key: 'policy_drift', label: 'Policy drift', sourceOfTruth: 'policy conformance scan', evidence: policySummary, counts: { total, high, medium, byPolicyArea } };

  if (total === 0) return signal({ ...base, state: 'fresh', healthy: true, trustworthy: true, severity: 'low', reason: 'No compiler policy drift detected.', recommendation: 'Keep routing drift and watcher reconciliation through the canonical shared helpers.' });
  if (high > 0 || dataGateway > 0) return signal({ ...base, state: 'blocked', healthy: false, trustworthy: false, severity: 'high', reason: dataGateway > 0 ? `${dataGateway} data_gateway policy finding(s) detect raw DB access or freshness bypasses.` : `${high} high-severity policy finding(s) detected across the compiler surfaces.`, recommendation: dataGateway > 0 ? 'Route freshness, coverage and drift checks through the canonical data gateway contract before reading raw tables directly.' : 'Resolve high-severity policy drift before trusting downstream snapshot consumers.' });
  if (medium > 0 || liveRowDrift > 0 || watcherDiagnostics > 0 || semanticSurface > 0 || fileUniverse > 0) {
    const reason = liveRowDrift > 0 ? `${liveRowDrift} live_row_drift policy finding(s) still route drift checks through manual SQL or local heuristics.`
      : watcherDiagnostics > 0 ? `${watcherDiagnostics} watcher_diagnostics policy finding(s) still compose watcher reconciliation inline.`
      : propagationExpansion > 0 ? `${propagationExpansion} propagation_expansion policy finding(s) indicate watcher or tool surfaces are not surfacing propagation where expected.`
      : semanticSurface > 0 ? `${semanticSurface} semantic_surface_granularity policy finding(s) still mix file-level and atom-level semantic surfaces.`
      : fileUniverse > 0 ? `${fileUniverse} file_universe_granularity policy finding(s) still treat scanned, persisted and live file universes as interchangeable.`
      : `${medium} medium-severity policy finding(s) remain active.`;
    return signal({ ...base, state: 'stale', healthy: false, trustworthy: false, severity: 'medium', reason, recommendation: propagationExpansion > 0 ? 'Attach the canonical propagation plan or consume it from shared/compiler before emitting watcher, status or reporting payloads.' : 'Reduce policy drift in existing canonical families before adding more heuristics.' });
  }
  return signal({ ...base, state: 'partial', healthy: false, trustworthy: false, severity: 'low', reason: `${total} low-signal policy finding(s) remain active.`, recommendation: 'Prefer the canonical shared helpers before adding more ad hoc heuristics.' });
}

function propagationExpansionSignal(policySummary = {}, metadataExtractionCoverage = null, metadataSurfaceParity = null) {
  const total = normalizeCount(policySummary.total);
  const byPolicyArea = policySummary.byPolicyArea || {};
  const count = normalizeCount(byPolicyArea.propagation_expansion);
  const metadataCoveragePct = normalizeCount(metadataExtractionCoverage?.summary?.coveragePct || metadataExtractionCoverage?.coveragePct || 0);
  const parityHealthy = metadataSurfaceParity?.healthy === true;
  const base = {
    key: 'propagation_expansion',
    label: 'Propagation expansion',
    sourceOfTruth: 'watcher/tool propagation contract',
    evidence: policySummary,
    counts: { total, count, byPolicyArea, metadataCoveragePct, parityHealthy }
  };

  if (count === 0) {
    const reason = parityHealthy === false
      ? 'No propagation expansion drift detected, but metadata surface parity is still drifting.'
      : metadataCoveragePct > 0 && metadataCoveragePct < 80
        ? `No propagation expansion drift detected, but metadata extraction coverage is still ${metadataCoveragePct}%.`
        : 'No propagation expansion drift detected.';
    return signal({
      ...base,
      state: 'fresh',
      healthy: true,
      trustworthy: true,
      severity: 'low',
      reason,
      recommendation: 'Keep watcher and tool surfaces attached to the canonical propagation engine.'
    });
  }

  const metadataContext = [];
  if (metadataCoveragePct > 0) {
    metadataContext.push(`metadata coverage is ${metadataCoveragePct}%`);
  }
  if (parityHealthy === false) {
    metadataContext.push('metadata surface parity is drifting');
  }
  const contextSuffix = metadataContext.length > 0 ? `, and ${metadataContext.join(' while ')}` : '';

  return signal({
    ...base,
    state: 'stale',
    healthy: false,
    trustworthy: false,
    severity: 'medium',
    reason: `${count} propagation_expansion policy finding(s) indicate watcher or tool surfaces are not surfacing propagation where expected${contextSuffix}.`,
    recommendation: 'Attach the canonical propagation plan or consume it from shared/compiler before emitting watcher, status or reporting payloads.'
  });
}

function analysisGenerationSignal(analysisGeneration = null) {
  const summary = summarizeAnalysisGeneration(analysisGeneration);
  if (summary.status === 'missing') {
    return signal({ key: 'analysis_generation', label: 'Analysis generation', sourceOfTruth: 'analysis generation snapshot', state: 'missing', healthy: false, trustworthy: false, severity: 'high', reason: summary.recommendation, recommendation: summary.recommendation, evidence: summary });
  }
  return signal({ key: 'analysis_generation', label: 'Analysis generation', sourceOfTruth: 'analysis generation snapshot', state: summary.healthy === true ? 'fresh' : 'stale', healthy: summary.healthy === true, trustworthy: summary.healthy === true, severity: summary.healthy === true ? 'low' : 'medium', reason: summary.recommendation, recommendation: summary.recommendation, evidence: summary });
}

function paritySignal(metadataSurfaceParity = null) {
  if (!metadataSurfaceParity) {
    return signal({ key: 'metadata_surface_parity', label: 'Metadata surface parity', sourceOfTruth: 'files + system_files', state: 'missing', healthy: false, trustworthy: false, severity: 'medium', reason: 'No metadata surface parity report is available.', recommendation: 'Recompute metadata surface parity before trusting mirrored file metadata.', evidence: null });
  }
  return signal({ key: 'metadata_surface_parity', label: 'Metadata surface parity', sourceOfTruth: 'files + system_files', state: metadataSurfaceParity.healthy === true ? 'fresh' : 'stale', healthy: metadataSurfaceParity.healthy === true, trustworthy: metadataSurfaceParity.healthy === true || metadataSurfaceParity.trustworthy === true, severity: metadataSurfaceParity.healthy === true ? 'low' : 'medium', reason: metadataSurfaceParity.summary || 'Primary and mirrored file metadata surfaces are drifting.', recommendation: metadataSurfaceParity.healthy === true ? 'Keep mirrored file metadata surfaces in sync with the canonical files projection.' : 'Recompute the mirrored metadata surfaces before trusting runtime metadata reads.', evidence: metadataSurfaceParity });
}

function extractionSignal(metadataExtractionCoverage = null) {
  const summary = summarizeMetadataExtractionCoverage(metadataExtractionCoverage);
  if (summary.totalTables === 0 && summary.totalRows === 0 && summary.totalFields === 0) {
    return signal({ key: 'metadata_extraction_coverage', label: 'Metadata extraction coverage', sourceOfTruth: 'atoms + files + system_files', state: 'missing', healthy: false, trustworthy: false, severity: 'medium', reason: summary.nextAction, recommendation: summary.nextAction, evidence: summary });
  }
  const healthy = summary.healthy === true;
  return signal({ key: 'metadata_extraction_coverage', label: 'Metadata extraction coverage', sourceOfTruth: 'atoms + files + system_files', state: healthy ? 'fresh' : (summary.trustworthy === true ? 'partial' : 'stale'), healthy, trustworthy: summary.trustworthy === true, severity: healthy ? 'low' : (summary.trustworthy === true ? 'medium' : 'high'), reason: summary.nextAction, recommendation: summary.nextAction, evidence: summary });
}

function databaseHealthSignal(databaseHealth = null) {
  if (!databaseHealth) {
    return signal({ key: 'database_health', label: 'Database health', sourceOfTruth: 'atom_relations', state: 'missing', healthy: false, trustworthy: false, severity: 'high', reason: 'Database health summary is unavailable.', recommendation: 'Reconnect to the repository database before trusting downstream compiler surfaces.', evidence: null });
  }
  const criticalCount = Array.isArray(databaseHealth.criticalFindings) ? databaseHealth.criticalFindings.length : 0;
  const warningCount = Array.isArray(databaseHealth.warnings) ? databaseHealth.warnings.length : 0;
  const score = Number(databaseHealth.healthScore || 0);
  const healthy = databaseHealth.healthy === true;
  const state = healthy ? 'fresh' : (criticalCount > 0 ? 'blocked' : (score >= 70 ? 'partial' : 'stale'));
  return signal({ key: 'database_health', label: 'Database health', sourceOfTruth: 'atom_relations', state, healthy, trustworthy: healthy, severity: state === 'blocked' ? 'high' : (state === 'partial' ? 'medium' : 'low'), reason: databaseHealth.summary || databaseHealth.criticalFindings?.[0]?.message || databaseHealth.warnings?.[0]?.message || 'Database health is not trustworthy.', recommendation: Array.isArray(databaseHealth.recommendations) && databaseHealth.recommendations.length > 0 ? databaseHealth.recommendations[0] : 'Reconcile the canonical database projections before trusting runtime health metrics.', evidence: databaseHealth, counts: { score, criticalCount, warningCount } });
}

function gatewaySignal(dataGatewayContract = null) {
  const summary = summarizeDataGatewayContract(dataGatewayContract);
  if (summary.total === 0) {
    return signal({ key: 'data_gateway_contract', label: 'Data gateway contract', sourceOfTruth: 'canonical data gateway contract', state: 'missing', healthy: false, trustworthy: false, severity: 'medium', reason: summary.nextAction, recommendation: summary.nextAction, evidence: summary });
  }
  const state = summary.blocked > 0 ? 'blocked' : (summary.stale > 0 || summary.missing > 0) ? 'stale' : (summary.partial > 0 ? 'partial' : 'fresh');
  return signal({ key: 'data_gateway_contract', label: 'Data gateway contract', sourceOfTruth: 'canonical data gateway contract', state, healthy: summary.trustworthy === true, trustworthy: summary.trustworthy === true, severity: state === 'blocked' ? 'high' : (state === 'stale' ? 'medium' : 'low'), reason: summary.primaryIssue?.reason || summary.nextAction, recommendation: summary.nextAction, evidence: summary });
}

function liveRowSignal(liveRowSync = null) {
  if (!liveRowSync) {
    return signal({ key: 'live_row_sync', label: 'Live row sync', sourceOfTruth: 'live atom-backed support tables', state: 'missing', healthy: false, trustworthy: false, severity: 'medium', reason: 'No live-row synchronization result is available.', recommendation: 'Run live-row reconciliation before trusting support-table counts.', evidence: null });
  }
  if (liveRowSync.cleanupError) {
    return signal({ key: 'live_row_sync', label: 'Live row sync', sourceOfTruth: 'live atom-backed support tables', state: 'blocked', healthy: false, trustworthy: false, severity: 'high', reason: liveRowSync.cleanupError?.message || 'Live-row synchronization failed.', recommendation: 'Repair live-row synchronization before trusting support-table counts.', evidence: liveRowSync });
  }
  if (liveRowSync.skippedReason === 'phase2_settling') {
    return signal({ key: 'live_row_sync', label: 'Live row sync', sourceOfTruth: 'live atom-backed support tables', state: 'partial', healthy: true, trustworthy: true, severity: 'low', reason: 'Live-row cleanup is deferred while phase 2 is still settling.', recommendation: 'Wait for phase 2 to settle before forcing live-row cleanup.', evidence: liveRowSync });
  }
  const staleRows = normalizeCount(liveRowSync.summary?.staleAtomRows) + normalizeCount(liveRowSync.summary?.staleFileRows) + normalizeCount(liveRowSync.summary?.staleRiskRows) + normalizeCount(liveRowSync.summary?.staleRelationRows) + normalizeCount(liveRowSync.summary?.staleConnectionRows);
  return signal({ key: 'live_row_sync', label: 'Live row sync', sourceOfTruth: 'live atom-backed support tables', state: staleRows > 0 ? 'stale' : 'fresh', healthy: staleRows === 0, trustworthy: staleRows === 0, severity: staleRows > 0 ? 'medium' : 'low', reason: staleRows > 0 ? 'Live support tables are drifting from the atom graph.' : 'Live support tables are aligned with the atom graph.', recommendation: staleRows > 0 ? (liveRowSync.before?.recommendedActions?.[0] || 'Reconcile the live support tables before trusting counts and health summaries.') : 'Keep live-row reconciliation on the canonical path.', evidence: liveRowSync });
}

function systemMapSignal(systemMapPersistenceCoverage = null) {
  if (!systemMapPersistenceCoverage) {
    return signal({ key: 'system_map_persistence', label: 'System map persistence', sourceOfTruth: 'atom_relations', state: 'missing', healthy: false, trustworthy: false, severity: 'medium', reason: 'No system map persistence coverage is available.', recommendation: 'Recompute the system map persistence coverage before trusting support-table reads.', evidence: null });
  }
  const healthy = systemMapPersistenceCoverage.healthy === true;
  return signal({ key: 'system_map_persistence', label: 'System map persistence', sourceOfTruth: 'atom_relations', state: healthy ? 'fresh' : 'stale', healthy, trustworthy: healthy, severity: healthy ? 'low' : 'medium', reason: systemMapPersistenceCoverage.summary || 'System map persistence is drifting from the atom graph.', recommendation: healthy ? 'Keep system map persistence aligned with atom_relations.' : 'Repair the system map persistence bridge before trusting support-table reads.', evidence: systemMapPersistenceCoverage });
}

function semanticSurfaceSignal(semanticSurfaceGranularity = null) {
  if (!semanticSurfaceGranularity) {
    return signal({ key: 'semantic_surface_granularity', label: 'Semantic surface granularity', sourceOfTruth: 'atoms.semantic_metadata', state: 'missing', healthy: false, trustworthy: false, severity: 'medium', reason: 'No semantic surface granularity report is available.', recommendation: 'Rebuild semantic_connections from atoms.semantic_metadata before trusting semantic summary totals.', evidence: null });
  }
  const healthy = semanticSurfaceGranularity.healthy === true;
  return signal({ key: 'semantic_surface_granularity', label: 'Semantic surface granularity', sourceOfTruth: 'atoms.semantic_metadata', state: healthy ? 'fresh' : 'stale', healthy, trustworthy: healthy, severity: healthy ? 'low' : 'medium', reason: semanticSurfaceGranularity.summary || 'Semantic file-level summary is drifting from atom-level semantic metadata.', recommendation: healthy ? 'Keep the file-level semantic surface aligned with atom semantic metadata.' : 'Rebuild semantic_connections from atoms.semantic_metadata before trusting semantic summary totals.', evidence: semanticSurfaceGranularity });
}

function fileUniverseSignal(fileUniverseGranularity = null) {
  if (!fileUniverseGranularity) {
    return signal({ key: 'file_universe_granularity', label: 'File universe granularity', sourceOfTruth: 'compiler_scanned_files + live index', state: 'missing', healthy: false, trustworthy: false, severity: 'medium', reason: 'No file universe granularity report is available.', recommendation: 'Reconcile scanner, manifest and live indexed files before trusting file totals.', evidence: null });
  }
  const healthy = fileUniverseGranularity.healthy === true;
  return signal({ key: 'file_universe_granularity', label: 'File universe granularity', sourceOfTruth: 'compiler_scanned_files + live index', state: healthy ? 'fresh' : 'stale', healthy, trustworthy: healthy || fileUniverseGranularity.contract?.trustworthy === true, severity: healthy ? 'low' : 'medium', reason: healthy ? 'Scanner, manifest and live file universes are aligned.' : 'Scanner, manifest and live file universes are not aligned.', recommendation: healthy ? 'Keep scanner, manifest and live indexed files aligned.' : 'Reconcile the persisted manifest and live file universe before trusting downstream reads.', evidence: fileUniverseGranularity });
}

export function buildCompilerDriftAssessment({
  analysisGeneration = null,
  policySummary = null,
  metadataSurfaceParity = null,
  metadataExtractionCoverage = null,
  dataGatewayContract = null,
  databaseHealth = null,
  liveRowSync = null,
  systemMapPersistenceCoverage = null,
  semanticSurfaceGranularity = null,
  fileUniverseGranularity = null
} = {}) {
  const signals = [
    propagationExpansionSignal(policySummary || {}, metadataExtractionCoverage, metadataSurfaceParity),
    policySignal(policySummary || {}),
    paritySignal(metadataSurfaceParity),
    extractionSignal(metadataExtractionCoverage),
    databaseHealthSignal(databaseHealth),
    gatewaySignal(dataGatewayContract),
    liveRowSignal(liveRowSync || databaseHealth?.metrics?.liveRowSync || null),
    systemMapSignal(systemMapPersistenceCoverage),
    semanticSurfaceSignal(semanticSurfaceGranularity),
    fileUniverseSignal(fileUniverseGranularity),
    analysisGenerationSignal(analysisGeneration)
  ];
  const summary = countSignals(signals);
  const issue = primaryIssue(signals);
  const recommendations = [];
  for (const item of signals) if (item.state !== 'fresh' && item.recommendation && !recommendations.includes(item.recommendation)) recommendations.push(item.recommendation);
  const status = summary.blocked > 0 ? 'blocked' : (summary.stale > 0 || summary.missing > 0) ? 'drifting' : summary.partial > 0 ? 'updated' : 'stable';
  return {
    status,
    healthy: summary.healthy,
    trustworthy: summary.trustworthy,
    summary: { ...summary, nextAction: issue?.recommendation || 'All tracked drift surfaces are fresh enough to trust downstream reads.', primaryIssue: issue ? { key: issue.key, label: issue.label, state: issue.state, severity: issue.severity, reason: issue.reason, recommendation: issue.recommendation } : null },
    signals,
    issues: signals.filter((item) => item.state !== 'fresh').map((item) => ({ key: item.key, label: item.label, state: item.state, severity: item.severity, reason: item.reason, recommendation: item.recommendation, sourceOfTruth: item.sourceOfTruth })),
    recommendations
  };
}

export function summarizeCompilerDriftAssessment(assessment = null) {
  if (!assessment || typeof assessment !== 'object') {
    return { status: 'missing', healthy: false, trustworthy: false, total: 0, fresh: 0, partial: 0, stale: 0, missing: 0, blocked: 0, nextAction: 'No compiler drift assessment is available.', primaryIssue: null, recommendations: [], signals: [] };
  }
  return {
    status: assessment.status || 'unknown',
    healthy: assessment.healthy === true,
    trustworthy: assessment.trustworthy === true,
    total: normalizeCount(assessment.summary?.total),
    fresh: normalizeCount(assessment.summary?.fresh),
    partial: normalizeCount(assessment.summary?.partial),
    stale: normalizeCount(assessment.summary?.stale),
    missing: normalizeCount(assessment.summary?.missing),
    blocked: normalizeCount(assessment.summary?.blocked),
    nextAction: assessment.summary?.nextAction || 'No compiler drift assessment summary is available.',
    primaryIssue: assessment.summary?.primaryIssue || null,
    recommendations: Array.isArray(assessment.recommendations) ? assessment.recommendations.slice(0, 3) : [],
    signals: Array.isArray(assessment.signals) ? assessment.signals.slice(0, 4).map((item) => ({ key: item.key, label: item.label, state: item.state, severity: item.severity, reason: item.reason, sourceOfTruth: item.sourceOfTruth })) : []
  };
}
