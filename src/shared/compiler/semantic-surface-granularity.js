/**
 * @fileoverview Canonical semantic surface granularity helpers.
 *
 * `semantic_connections` is a file-level semantic summary surface.
 * `atom_relations` keeps fine-grained atom-to-atom semantic relations such as
 * `shares_state`, `emits`, and `listens`. They are related but not equivalent.
 *
 * This helper makes that contract explicit so runtime code stops comparing the
 * totals directly or treating the file-level surface as a 1:1 mirror.
 *
 * @module shared/compiler/semantic-surface-granularity
 */

import { toNumber, toRatio, safeParseJson } from './core-utils.js';


function mapRelationTypeToLegacyType(relationType = '') {
  if (relationType === 'shares_state') return 'sharedState';
  if (relationType === 'emits' || relationType === 'listens') return 'eventListeners';
  return 'unknown';
}

function loadDerivedLegacyConnections(db) {
  return db.prepare(`
    SELECT
      a1.file_path as source_path,
      a2.file_path as target_path,
      ar.relation_type,
      json_extract(ar.context_json, '$.key') as connection_key,
      COUNT(*) as weight
    FROM atom_relations ar
    JOIN atoms a1 ON a1.id = ar.source_id
    JOIN atoms a2 ON a2.id = ar.target_id
    WHERE ar.relation_type IN ('shares_state', 'emits', 'listens')
      AND (ar.is_removed IS NULL OR ar.is_removed = 0)
      AND (a1.is_removed IS NULL OR a1.is_removed = 0)
      AND (a2.is_removed IS NULL OR a2.is_removed = 0)
      AND a1.file_path IS NOT NULL
      AND a2.file_path IS NOT NULL
    GROUP BY a1.file_path, a2.file_path, ar.relation_type, json_extract(ar.context_json, '$.key')
  `).all().map((row) => ({
    connection_type: mapRelationTypeToLegacyType(row.relation_type),
    source_path: row.source_path,
    target_path: row.target_path,
    connection_key: row.connection_key,
    weight: Number(row.weight) || 0,
    context_json: JSON.stringify({
      derivedFrom: 'atom_relations',
      relationType: row.relation_type,
      key: row.connection_key || null
    })
  }));
}


function classifyLegacyBucket(connectionType = '') {
  if (/^eventListener|^eventListeners$/i.test(connectionType)) {
    return 'eventListeners';
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

function summarizeConnectionTypes(rows = []) {
  return rows.reduce((acc, row) => {
    const key = row.connection_type || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

export function getSemanticSurfaceGranularity(db) {
  const persistedSemanticRows = db.prepare(`
    SELECT connection_type, source_path, target_path, connection_key, weight, context_json
    FROM semantic_connections
    WHERE is_removed IS NULL OR is_removed = 0
  `).all();

  const relationCounts = db.prepare(`
    SELECT relation_type, COUNT(*) as count
    FROM atom_relations
    WHERE relation_type IN ('shares_state', 'emits', 'listens')
    GROUP BY relation_type
  `).all();

  const relationByType = relationCounts.reduce((acc, row) => {
    acc[row.relation_type] = toNumber(row.count);
    return acc;
  }, {});

  const semanticRows = persistedSemanticRows.length > 0
    ? persistedSemanticRows
    : loadDerivedLegacyConnections(db);

  const semanticByType = summarizeConnectionTypes(semanticRows);
  const legacyConnections = semanticRows.map(normalizeSemanticConnectionRow);
  const sharedState = legacyConnections.filter((row) => row.type === 'sharedState');
  const eventListeners = legacyConnections.filter((row) => row.type === 'eventListeners');

  const fileLevelTotal = semanticRows.length;
  const atomLevelSharedStateTotal = toNumber(relationByType.shares_state);
  const atomLevelEventTotal = toNumber(relationByType.emits) + toNumber(relationByType.listens);
  const atomLevelTotal = atomLevelSharedStateTotal + atomLevelEventTotal;
  const sharedStateGranularityRatio = toRatio(fileLevelTotal, atomLevelSharedStateTotal);

  const issues = [];
  if (fileLevelTotal === 0 && atomLevelTotal > 0) {
    issues.push('file-level semantic summary is empty while atom-level semantic relations exist');
  }
  if (persistedSemanticRows.length > 0 && (semanticByType.sharedState || semanticByType.eventListeners)) {
    issues.push('semantic_connections still exposes legacy connection_type buckets that should be normalized through the canonical adapter');
  }

  return {
    fileLevel: {
      total: fileLevelTotal,
      byType: semanticByType
    },
    atomLevel: {
      total: atomLevelTotal,
      sharesState: atomLevelSharedStateTotal,
      emits: toNumber(relationByType.emits),
      listens: toNumber(relationByType.listens)
    },
    legacyView: {
      sharedState,
      eventListeners,
      total: legacyConnections.length
    },
    contract: {
      fileLevelSurface: 'semantic_connections',
      atomLevelSurface: 'atom_relations',
      summaryVsDetail: true,
      equivalentTotals: false,
      trustworthy: issues.length === 0,
      sharedStateGranularityRatio,
      status: issues.length === 0 ? 'stable' : 'advisory_only',
      recommendedSourceOfTruth: 'atom_relations',
      summarySurfaceAdvisory: true,
      unsafeForTotalsComparison: issues.length > 0 || fileLevelTotal !== atomLevelTotal,
      requiresCanonicalAdapter: issues.length > 0
    },
    healthy: issues.length === 0,
    issues
  };
}
