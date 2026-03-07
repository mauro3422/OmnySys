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

function toNumber(value) {
  return Number(value ?? 0) || 0;
}

function toRatio(numerator, denominator) {
  if (!denominator) return 0;
  return Number((numerator / denominator).toFixed(3));
}

function safeParseJson(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
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
  const semanticRows = db.prepare(`
    SELECT connection_type, source_path, target_path, connection_key, weight, context_json
    FROM semantic_connections
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
  if (semanticByType.sharedState || semanticByType.eventListeners) {
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
      sharedStateGranularityRatio
    },
    healthy: issues.length === 0,
    issues
  };
}
