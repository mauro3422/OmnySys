/**
 * @fileoverview Canonical semantic surface granularity helpers.
 *
 * `semantic_connections` is a file-level semantic summary surface.
 * The canonical detail surface lives in atom semantic metadata columns such as
 * `shared_state_json`, `event_emitters_json`, and `event_listeners_json`.
 * They are related but not equivalent.
 *
 * This helper makes that contract explicit so runtime code stops comparing the
 * totals directly or treating the file-level surface as a 1:1 mirror.
 *
 * @module shared/compiler/semantic-surface-granularity
 */

import { toRatio, safeParseJson } from './core-utils.js';
import {
  deriveSemanticConnectionsFromAtomSurface,
  loadAtomSemanticSurface,
  summarizeAtomSemanticSurface
} from './semantic-surface-derivation.js';


function classifyLegacyBucket(connectionType = '') {
  if (/^envVar$/i.test(connectionType)) {
    return 'envVar';
  }

  if (/^eventListener|^eventListeners$/i.test(connectionType)) {
    return 'eventListeners';
  }

  if (/^route$/i.test(connectionType)) {
    return 'route';
  }

  if (/^colocation$/i.test(connectionType)) {
    return 'colocation';
  }

  return 'sharedState';
}

function normalizeSemanticConnectionRow(row = {}) {
  const context = safeParseJson(row.context_json, {});
  return {
    source: row.source_path,
    target: row.target_path,
    sourceFile: row.source_path,
    targetFile: row.target_path,
    type: classifyLegacyBucket(row.connection_type),
    semanticType: row.connection_type,
    key: row.connection_key,
    globalProperty: row.connection_key,
    weight: Number(row.weight) || 0,
    reason: `semantic:${row.connection_type}`,
    severity: (Number(row.weight) || 0) >= 3 ? 'high' : 'medium',
    context
  };
}

function usesLegacySemanticBucket(connectionType = '') {
  if (!connectionType) {
    return true;
  }

  return !/^(sharedState|eventListeners|envVar|route|colocation)$/i.test(connectionType);
}

function requiresCanonicalSemanticNormalization(row = {}) {
  const context = safeParseJson(row.context_json, {});
  const derivedFrom = context?.derivedFrom || null;
  return usesLegacySemanticBucket(row.connection_type) || derivedFrom === 'legacy_semantic_connections';
}

function summarizeConnectionTypes(rows = []) {
  return rows.reduce((acc, row) => {
    const key = row.connection_type || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function buildLegacyView(rows = []) {
  const legacyConnections = rows.map(normalizeSemanticConnectionRow);
  return {
    rows: legacyConnections,
    sharedState: legacyConnections.filter((row) => row.type === 'sharedState'),
    eventListeners: legacyConnections.filter((row) => row.type === 'eventListeners'),
    envVars: legacyConnections.filter((row) => row.type === 'envVar'),
    total: legacyConnections.length
  };
}

export function summarizeSemanticCanonicality(semanticSurfaceGranularity = null) {
  if (!semanticSurfaceGranularity) {
    return null;
  }

  const contract = semanticSurfaceGranularity.contract || {};
  return {
    status: contract.status || 'unknown',
    trustworthy: contract.trustworthy !== false,
    recommendedSourceOfTruth: contract.recommendedSourceOfTruth || 'atoms',
    summarySurfaceAdvisory: contract.summarySurfaceAdvisory !== false,
    requiresCanonicalAdapter: contract.requiresCanonicalAdapter !== false,
    unsafeForTotalsComparison: contract.unsafeForTotalsComparison !== false,
    materialIssueCount: semanticSurfaceGranularity.materialIssues?.length || 0,
    advisoryCount: semanticSurfaceGranularity.advisories?.length || 0,
    materialIssues: semanticSurfaceGranularity.materialIssues || [],
    advisories: semanticSurfaceGranularity.advisories || [],
    summary: semanticSurfaceGranularity.materiallyDrifting
      ? 'Semantic file-level summary is materially drifting; use atoms until repaired.'
      : contract.status === 'advisory_only'
        ? 'Semantic file-level summary is healthy as an advisory surface, but atoms remain the source of truth.'
        : 'Semantic summary and canonical adapter are aligned.'
  };
}

export function getSemanticSurfaceGranularity(db) {
  const persistedSemanticRows = db.prepare(`
    SELECT connection_type, source_path, target_path, connection_key, weight, context_json
    FROM semantic_connections
    WHERE is_removed IS NULL OR is_removed = 0
  `).all();

  const atomSurface = loadAtomSemanticSurface(db);
  const atomSurfaceSummary = summarizeAtomSemanticSurface(atomSurface);
  const canonicalSemanticRows = deriveSemanticConnectionsFromAtomSurface(atomSurface);
  const persistedLegacyView = buildLegacyView(persistedSemanticRows);
  const canonicalLegacyView = buildLegacyView(canonicalSemanticRows.rows);
  const semanticByType = summarizeConnectionTypes(persistedSemanticRows);

  const fileLevelTotal = persistedSemanticRows.length;
  const atomLevelTotal = atomSurfaceSummary.totalSignals;
  const sharedStateGranularityRatio = toRatio(fileLevelTotal, atomSurfaceSummary.sharedStateSignals);

  const materialIssues = [];
  const advisories = [];
  if (fileLevelTotal === 0 && atomLevelTotal > 0) {
    materialIssues.push('file-level semantic summary is empty while atom-level semantic signals exist');
  }
  if (persistedSemanticRows.some(requiresCanonicalSemanticNormalization)) {
    advisories.push('semantic_connections still exposes legacy connection_type buckets that should be normalized through the canonical adapter');
  }
  if (persistedLegacyView.total !== canonicalLegacyView.total) {
    materialIssues.push('semantic_connections summary count is drifting from the canonical adapter derived from atoms');
  }

  const issues = [...materialIssues, ...advisories];
  const materiallyDrifting = materialIssues.length > 0;
  const requiresCanonicalAdapter = advisories.length > 0 || materiallyDrifting;

  return {
    fileLevel: {
      total: fileLevelTotal,
      byType: semanticByType
    },
    atomLevel: {
      total: atomLevelTotal,
      sharedStateSignals: atomSurfaceSummary.sharedStateSignals,
      eventEmitterSignals: atomSurfaceSummary.eventEmitterSignals,
      eventListenerSignals: atomSurfaceSummary.eventListenerSignals,
      envVarSignals: atomSurfaceSummary.envVarSignals,
      atomsWithSharedState: atomSurfaceSummary.atomsWithSharedState,
      atomsWithEmitters: atomSurfaceSummary.atomsWithEmitters,
      atomsWithListeners: atomSurfaceSummary.atomsWithListeners
    },
    legacyView: canonicalLegacyView,
    persistedLegacyView,
    canonicalAdapterView: {
      ...canonicalLegacyView,
      derivedFrom: 'atoms.semantic_surface'
    },
    contract: {
      fileLevelSurface: 'semantic_connections',
      atomLevelSurface: 'atoms.semantic_metadata',
      summaryVsDetail: true,
      equivalentTotals: false,
      trustworthy: !materiallyDrifting,
      sharedStateGranularityRatio,
      status: materiallyDrifting ? 'drift' : (requiresCanonicalAdapter ? 'advisory_only' : 'stable'),
      recommendedSourceOfTruth: 'atoms',
      summarySurfaceAdvisory: true,
      unsafeForTotalsComparison: fileLevelTotal !== atomLevelTotal,
      requiresCanonicalAdapter
    },
    healthy: !materiallyDrifting,
    materiallyDrifting,
    materialIssues,
    advisories,
    issues
  };
}
