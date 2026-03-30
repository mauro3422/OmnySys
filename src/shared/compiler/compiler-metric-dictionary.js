/**
 * @fileoverview Canonical metric dictionary and reliability helpers.
 *
 * This layer explains what each visible compiler/status metric actually means,
 * which tables or graph surfaces feed it, and how trustworthy the main layers
 * are right now. It does not replace the raw surfaces; it makes them legible.
 *
 * @module shared/compiler/compiler-metric-dictionary
 */

function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampScore(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function gradeFromScore(score = 0) {
  if (score >= 97) return 'A+';
  if (score >= 93) return 'A';
  if (score >= 90) return 'A-';
  if (score >= 87) return 'B+';
  if (score >= 83) return 'B';
  if (score >= 80) return 'B-';
  if (score >= 77) return 'C+';
  if (score >= 73) return 'C';
  if (score >= 70) return 'C-';
  if (score >= 67) return 'D+';
  if (score >= 63) return 'D';
  if (score >= 60) return 'D-';
  return 'F';
}

function trustStateFromScore(score = 0) {
  if (score >= 90) return 'trustworthy';
  if (score >= 75) return 'watchful';
  if (score >= 60) return 'limited';
  return 'blocked';
}

function buildLayerSummary(score, layerKey) {
  const state = trustStateFromScore(score);
  const label = layerKey.charAt(0).toUpperCase() + layerKey.slice(1);
  return state === 'trustworthy'
    ? `${label} layer is trustworthy.`
    : state === 'watchful'
      ? `${label} layer is mostly reliable but should still be cross-checked.`
      : state === 'limited'
        ? `${label} layer is usable, but the trust gap is still material.`
        : `${label} layer is not reliable enough to trust without corroboration.`;
}

function buildReliabilityLayer(key, score, options = {}) {
  const roundedScore = Number(clampScore(score).toFixed(2));
  const state = trustStateFromScore(roundedScore);

  return {
    key,
    label: options.label || key,
    score: roundedScore,
    grade: gradeFromScore(roundedScore),
    state,
    trustworthy: state === 'trustworthy',
    sourceOfTruth: options.sourceOfTruth || [],
    sourceTables: options.sourceTables || [],
    summary: options.summary || buildLayerSummary(roundedScore, key),
    caveat: options.caveat || null,
    evidence: options.evidence || {}
  };
}

function buildRuntimeReliability(current = {}) {
  const score = clampScore(
    100
      - (asNumber(current.recentErrorCount, 0) * 25)
      - (asNumber(current.recentWarningCount, 0) * 2)
      - (asNumber(current.watcherAlertCount, 0) * 4)
      - (current.clientSyncState === 'blocked' ? 25 : current.clientSyncState === 'stale' ? 12 : current.clientSyncState === 'watchful' ? 4 : 0)
      - Math.min(10, asNumber(current.phase2PendingFiles, 0) * 0.5)
  );

  return buildReliabilityLayer('runtime', score, {
    label: 'Runtime',
    sourceOfTruth: ['get_server_status', 'get_recent_errors'],
    sourceTables: ['mcp_sessions'],
    summary: current.clientSyncState === 'blocked'
      ? 'Runtime reliability is reduced by blocked client/session sync.'
      : 'Runtime reliability is driven by active errors, watcher pressure, and session sync.',
    caveat: 'Watcher noise and connector drift can lower runtime trust even when the daemon is alive.',
    evidence: {
      recentErrorCount: asNumber(current.recentErrorCount, 0),
      recentWarningCount: asNumber(current.recentWarningCount, 0),
      watcherAlertCount: asNumber(current.watcherAlertCount, 0),
      clientSyncState: current.clientSyncState || 'fresh',
      phase2PendingFiles: asNumber(current.phase2PendingFiles, 0)
    }
  });
}

function buildDatabaseReliability(current = {}, compilerExplainability = {}) {
  const databaseHealth = compilerExplainability?.databaseHealth || {};
  const score = clampScore(
    asNumber(databaseHealth.healthScore, asNumber(current.healthScore, 0))
      - (current.activeAtomsDriftState === 'blocked' ? 20 : current.activeAtomsDriftState === 'stale' ? 8 : 0)
      - (current.databaseTrustworthy ? 0 : 20)
  );

  return buildReliabilityLayer('database', score, {
    label: 'Database',
    sourceOfTruth: ['get_schema(type:"database")', 'execute_sql', 'get_server_status.databaseHealth'],
    sourceTables: ['atoms', 'files', 'atom_relations', 'system_files', 'semantic_connections', 'risk_assessments'],
    summary: databaseHealth?.healthy
      ? 'Database reliability is anchored by the canonical health report and live-row alignment.'
      : 'Database reliability is currently degraded.',
    caveat: 'Database health is about projection integrity, not architectural cleanliness.',
    evidence: {
      healthScore: asNumber(databaseHealth.healthScore, asNumber(current.healthScore, 0)),
      activeAtomsDriftState: current.activeAtomsDriftState || 'missing',
      databaseTrustworthy: current.databaseTrustworthy === true
    }
  });
}

function buildGraphReliability(current = {}, compilerExplainability = {}) {
  const dataGatewaySummary = compilerExplainability?.dataGatewayContract?.summary || {};
  const semanticCanonicality = compilerExplainability?.semanticCanonicality || {};
  const score = clampScore(
    35
      + (asNumber(current.callLinks, 0) > 0 ? 30 : 0)
      + (asNumber(current.semanticLinks, 0) > 0 ? 15 : 0)
      + (dataGatewaySummary.trustworthy === true ? 15 : -10)
      + (semanticCanonicality.healthy === true ? 5 : 0)
  );

  return buildReliabilityLayer('graph', score, {
    label: 'Graph',
    sourceOfTruth: ['get_server_status.metricsSnapshot', 'traverse_graph', 'query_graph'],
    sourceTables: ['atom_relations', 'semantic_connections'],
    summary: dataGatewaySummary.trustworthy === true
      ? 'Graph reliability is backed by canonical data-gateway and semantic-granularity checks.'
      : 'Graph reliability is useful but still partially policy-gated.',
    caveat: 'Call and semantic link counts are strong signals, but they still depend on gateway and granularity contracts.',
    evidence: {
      callLinks: asNumber(current.callLinks, 0),
      semanticLinks: asNumber(current.semanticLinks, 0),
      dataGatewayTrustworthy: dataGatewaySummary.trustworthy === true,
      semanticCanonicalityHealthy: semanticCanonicality.healthy === true
    }
  });
}

function buildMetadataReliability(current = {}, compilerExplainability = {}) {
  const metadata = compilerExplainability?.metadataExtractionCoverage || {};
  const coveragePct = asNumber(metadata.summary?.coveragePct, asNumber(current.metadataCoveragePct, 0));
  const fieldCoveragePct = asNumber(metadata.summary?.fieldCoveragePct, asNumber(current.metadataFieldCoveragePct, 0));
  const score = clampScore(
    (coveragePct * 0.45)
      + (fieldCoveragePct * 0.55)
      + (metadata.healthy === true ? 5 : 0)
      + (metadata.trustworthy === true ? 5 : -10)
  );

  return buildReliabilityLayer('metadata', score, {
    label: 'Metadata',
    sourceOfTruth: ['get_schema(type:"atoms")', 'get_health_snapshot.compilerExplainability.metadataExtractionCoverage'],
    sourceTables: ['atoms', 'files', 'system_files'],
    summary: 'Metadata reliability tracks field coverage and whether the extraction contract is considered trustworthy.',
    caveat: 'Empty fields such as data flow, DNA, or error flow can keep metadata useful but incomplete.',
    evidence: {
      coveragePct,
      fieldCoveragePct,
      trustworthy: metadata.trustworthy === true,
      primaryIssue: metadata.primaryIssue || null
    }
  });
}

function buildGovernanceReliability(current = {}, compilerExplainability = {}) {
  const contractLayer = compilerExplainability?.compilerContractLayer?.summary || {};
  const dataGatewaySummary = compilerExplainability?.dataGatewayContract?.summary || {};
  const surfaceAudit = compilerExplainability?.surfaceAudit?.summary || {};
  const score = clampScore(
    45
      + (contractLayer.healthy === true ? 20 : -15)
      + (dataGatewaySummary.trustworthy === true ? 20 : -10)
      + (surfaceAudit.trustworthy === true ? 15 : -10)
      - Math.min(15, asNumber(current.namingDebt, 0) * 0.02)
  );

  return buildReliabilityLayer('governance', score, {
    label: 'Governance',
    sourceOfTruth: ['get_health_snapshot.compilerExplainability', 'get_metrics_snapshot'],
    sourceTables: ['compiler_metrics_snapshots'],
    summary: 'Governance reliability reflects whether contracts, freshness ledgers, and summary surfaces agree on trust.',
    caveat: 'This layer is intentionally stricter than runtime truth; it can be the reason health is high while readiness is blocked.',
    evidence: {
      contractHealthy: contractLayer.healthy === true,
      dataGatewayTrustworthy: dataGatewaySummary.trustworthy === true,
      surfaceAuditTrustworthy: surfaceAudit.trustworthy === true,
      namingDebt: asNumber(current.namingDebt, 0)
    }
  });
}

export function buildCompilerLayerReliability({ current = {}, compilerExplainability = {} } = {}) {
  const layers = {
    runtime: buildRuntimeReliability(current, compilerExplainability),
    database: buildDatabaseReliability(current, compilerExplainability),
    graph: buildGraphReliability(current, compilerExplainability),
    metadata: buildMetadataReliability(current, compilerExplainability),
    governance: buildGovernanceReliability(current, compilerExplainability)
  };

  const weightedScore = clampScore(
    (layers.runtime.score * 0.22)
      + (layers.database.score * 0.28)
      + (layers.graph.score * 0.18)
      + (layers.metadata.score * 0.16)
      + (layers.governance.score * 0.16)
  );

  const weakestLayer = Object.values(layers).slice().sort((left, right) => left.score - right.score)[0] || null;
  const strongestLayer = Object.values(layers).slice().sort((left, right) => right.score - left.score)[0] || null;

  return {
    global: {
      score: Number(weightedScore.toFixed(2)),
      grade: gradeFromScore(weightedScore),
      state: trustStateFromScore(weightedScore),
      trustworthy: trustStateFromScore(weightedScore) === 'trustworthy',
      summary: `Reliability blends runtime, database, graph, metadata and governance trust into ${Math.round(weightedScore)}/100.`,
      strongestLayer: strongestLayer ? { key: strongestLayer.key, score: strongestLayer.score, grade: strongestLayer.grade } : null,
      weakestLayer: weakestLayer ? { key: weakestLayer.key, score: weakestLayer.score, grade: weakestLayer.grade } : null
    },
    layers
  };
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
