/**
 * @fileoverview Canonical metric dictionary and reliability helpers.
 *
 * This layer explains what each visible compiler/status metric actually means,
 * which tables or graph surfaces feed it, and how trustworthy the main layers
 * are right now. It does not replace the raw surfaces; it makes them legible.
 *
 * @module shared/compiler/compiler-metric-dictionary
 */

import { buildCompilerLayerReliability } from './compiler-metric-reliability.js';

function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildMetricEntry(key, value, options = {}) {
  return {
    key,
    value,
    layer: options.layer || 'global',
    kind: options.kind || 'derived',
    sourceOfTruth: options.sourceOfTruth || [],
    sourceTables: options.sourceTables || [],
    graphSurface: options.graphSurface || null,
    summary: options.summary || null,
    caveat: options.caveat || null
  };
}

export function buildCompilerMetricDictionary({ current = {}, compilerExplainability = {}, reliability = null } = {}) {
  const resolvedReliability = reliability || buildCompilerLayerReliability({ current, compilerExplainability });
  const metadata = compilerExplainability?.metadataExtractionCoverage || {};
  const dataGatewaySummary = compilerExplainability?.dataGatewayContract?.summary || {};

  return {
    sourceOfTruthOrder: [
      'get_server_status',
      'check_pipeline_integrity',
      'get_schema(type:"database")',
      'execute_sql',
      'get_metrics_snapshot',
      'get_health_snapshot'
    ],
    global: resolvedReliability.global,
    layers: resolvedReliability.layers,
    metrics: {
      globalHealthScore: buildMetricEntry('globalHealthScore', asNumber(current.globalHealthScore, 0), {
        layer: 'global',
        kind: 'composite',
        sourceOfTruth: ['compiler metrics snapshot', 'compiler health dashboard'],
        sourceTables: ['atoms', 'files', 'atom_relations', 'semantic_connections', 'risk_assessments', 'mcp_sessions'],
        summary: 'Executive health score that blends canonical database health with cross-layer reliability.',
        caveat: 'Use for summary views. Debug with the database and reliability layers beneath it.'
      }),
      reliabilityScore: buildMetricEntry('reliabilityScore', resolvedReliability.global.score, {
        layer: 'global',
        kind: 'cross-layer trust score',
        sourceOfTruth: ['compiler metric dictionary'],
        sourceTables: ['atoms', 'files', 'atom_relations', 'semantic_connections', 'risk_assessments', 'mcp_sessions', 'semantic_issues'],
        summary: 'Cross-layer reliability score used to prevent a single optimistic health surface from dominating the global summary.',
        caveat: 'Reliability is stricter than liveness; it can stay below health even when tools work.'
      }),
      healthScore: buildMetricEntry('healthScore', asNumber(current.healthScore, 0), {
        layer: 'database',
        kind: 'database health report',
        sourceOfTruth: ['get_server_status.databaseHealth', 'get_schema(type:"database")'],
        sourceTables: ['atoms', 'files', 'atom_relations', 'system_files', 'semantic_connections', 'risk_assessments'],
        summary: 'Canonical database/projection health score.',
        caveat: 'This is not the same as runtime readiness or architectural debt.'
      }),
      successScore: buildMetricEntry('successScore', asNumber(current.successScore, 0), {
        layer: 'governance',
        kind: 'policy score',
        sourceOfTruth: ['get_metrics_snapshot', 'get_health_snapshot'],
        sourceTables: ['compiler_metrics_snapshots'],
        summary: 'Readiness-oriented score derived from health, drift, stability and coverage.',
        caveat: 'This score is intentionally stricter than database health.'
      }),
      driftScore: buildMetricEntry('driftScore', asNumber(current.driftScore, 0), {
        layer: 'governance',
        kind: 'policy score',
        sourceOfTruth: ['data gateway contract', 'surface audit', 'drift assessment'],
        sourceTables: ['compiler_metrics_snapshots'],
        summary: 'Measures how much important surfaces are drifting from canonical expectations.'
      }),
      stabilityScore: buildMetricEntry('stabilityScore', asNumber(current.stabilityScore, 0), {
        layer: 'runtime',
        kind: 'derived stability score',
        sourceOfTruth: ['compiler metrics snapshot'],
        sourceTables: ['semantic_issues', 'mcp_sessions'],
        summary: 'Pressure score derived from errors, watcher alerts, duplicates, debt and sync states.'
      }),
      issueCount: buildMetricEntry('issueCount', asNumber(current.issueCount, 0), {
        layer: 'governance',
        kind: 'raw summary',
        sourceOfTruth: ['semantic issue summary'],
        sourceTables: ['semantic_issues'],
        summary: 'Count of active semantic issues.'
      }),
      pipelineOrphans: buildMetricEntry('pipelineOrphans', asNumber(current.pipelineOrphans, 0), {
        layer: 'database',
        kind: 'orphan summary',
        sourceOfTruth: ['pipeline orphan summary'],
        sourceTables: ['atoms', 'files', 'atom_relations', 'risk_assessments'],
        summary: 'Count of canonical rows no longer aligned with their owning graph/file surfaces.'
      }),
      activeAtoms: buildMetricEntry('activeAtoms', asNumber(current.activeAtoms, 0), {
        layer: 'database',
        kind: 'raw sql count',
        sourceOfTruth: ['execute_sql', 'database health report'],
        sourceTables: ['atoms'],
        summary: 'Count of active atoms (`is_removed = 0`).'
      }),
      callLinks: buildMetricEntry('callLinks', asNumber(current.callLinks, 0), {
        layer: 'graph',
        kind: 'graph coverage',
        sourceOfTruth: ['graph coverage summary', 'execute_sql'],
        sourceTables: ['atom_relations'],
        graphSurface: 'calls',
        summary: 'Count of active call-graph edges.'
      }),
      semanticLinks: buildMetricEntry('semanticLinks', asNumber(current.semanticLinks, 0), {
        layer: 'graph',
        kind: 'graph coverage',
        sourceOfTruth: ['graph coverage summary', 'execute_sql'],
        sourceTables: ['semantic_connections'],
        graphSurface: 'semantic',
        summary: 'Count of active semantic connection rows.'
      }),
      clientSyncState: buildMetricEntry('clientSyncState', current.clientSyncState || 'fresh', {
        layer: 'runtime',
        kind: 'session contract',
        sourceOfTruth: ['get_server_status.mcpSessions', 'mcp session summary'],
        sourceTables: ['mcp_sessions'],
        summary: 'Tracks whether client/session state is aligned across runtime and persistence.',
        caveat: 'Useful for connector drift, not for judging DB integrity.'
      }),
      namingDebt: buildMetricEntry('namingDebt', asNumber(current.namingDebt, 0), {
        layer: 'governance',
        kind: 'folderization debt',
        sourceOfTruth: ['folderization summary', 'technical debt report'],
        sourceTables: ['compiler_metrics_snapshots'],
        summary: 'Count of rename targets still owed by folderization/naming normalization.'
      }),
      liveCoverageRatio: buildMetricEntry('liveCoverageRatio', asNumber(current.liveCoverageRatio, 0), {
        layer: 'database',
        kind: 'coverage ratio',
        sourceOfTruth: ['file universe granularity', 'database health report'],
        sourceTables: ['compiler_scanned_files', 'files', 'atoms'],
        summary: 'How much of the scanned file universe is represented by live atom-backed rows.'
      }),
      metadataCoveragePct: buildMetricEntry('metadataCoveragePct', asNumber(metadata.summary?.coveragePct, asNumber(current.metadataCoveragePct, 0)), {
        layer: 'metadata',
        kind: 'coverage ratio',
        sourceOfTruth: ['metadata extraction coverage'],
        sourceTables: ['atoms', 'files', 'system_files'],
        summary: 'Coverage percentage across metadata tables/rows.'
      }),
      metadataFieldCoveragePct: buildMetricEntry('metadataFieldCoveragePct', asNumber(metadata.summary?.fieldCoveragePct, asNumber(current.metadataFieldCoveragePct, 0)), {
        layer: 'metadata',
        kind: 'coverage ratio',
        sourceOfTruth: ['metadata extraction coverage'],
        sourceTables: ['atoms', 'files', 'system_files'],
        summary: 'Coverage percentage across metadata fields.'
      }),
      toolRuns: buildMetricEntry('toolRuns', asNumber(current.toolTelemetry?.totalRuns, 0), {
        layer: 'runtime',
        kind: 'tool telemetry',
        sourceOfTruth: ['mcp tool run telemetry', 'get_metrics_snapshot'],
        sourceTables: ['mcp_tool_runs'],
        summary: 'Total MCP tool executions captured in the current telemetry window.',
        caveat: 'A zero here means the capture path is empty, not necessarily that no human used tools.'
      }),
      toolObservationRate: buildMetricEntry('toolObservationRate', asNumber(current.toolTelemetry?.observationRate, 0), {
        layer: 'runtime',
        kind: 'tool telemetry',
        sourceOfTruth: ['mcp tool run telemetry'],
        sourceTables: ['mcp_tool_runs'],
        summary: 'Share of tool runs that captured before/after observation state.',
        caveat: 'This measures observability coverage, not repair effectiveness.'
      }),
      toolRepairRateOnPressure: buildMetricEntry('toolRepairRateOnPressure', asNumber(current.toolTelemetry?.repairRateOnPressure, 0), {
        layer: 'runtime',
        kind: 'tool telemetry',
        sourceOfTruth: ['mcp tool run telemetry'],
        sourceTables: ['mcp_tool_runs'],
        summary: 'Share of pressured runs that ended in a real repair outcome.',
        caveat: 'This is stricter than repairYield because it only scores runs that started with active pressure.'
      }),
      dataGatewayTrustworthy: buildMetricEntry('dataGatewayTrustworthy', dataGatewaySummary.trustworthy === true, {
        layer: 'governance',
        kind: 'contract state',
        sourceOfTruth: ['data gateway contract', 'surface audit'],
        sourceTables: ['compiler_metrics_snapshots'],
        summary: 'Whether the canonical freshness/contract layer currently trusts downstream reads.'
      })
    }
  };
}

export function summarizeCompilerMetricDictionary(dictionary = null) {
  if (!dictionary || typeof dictionary !== 'object') {
    return null;
  }

  return {
    sourceOfTruthOrder: Array.isArray(dictionary.sourceOfTruthOrder) ? dictionary.sourceOfTruthOrder : [],
    global: dictionary.global || null,
    layers: dictionary.layers || {},
    metrics: dictionary.metrics || {}
  };
}

export default {
  buildCompilerLayerReliability,
  buildCompilerMetricDictionary,
  summarizeCompilerMetricDictionary
};
