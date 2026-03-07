/**
 * @fileoverview Canonical shared-state hotspot reporting helpers.
 *
 * Normalizes shared-state contention into one reusable surface for watcher
 * guards and MCP/query consumers so they stop rebuilding contention and hot-key
 * heuristics inline.
 *
 * @module shared/compiler/shared-state-reporting
 */

function toArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function normalizeTopContentionKeys(sharedState = {}) {
  return toArray(sharedState.topContentionKeys)
    .map((item) => ({
      key: item?.key || item?.name || null,
      count: Number(item?.count) || 0
    }))
    .filter((item) => item.key);
}

function normalizeReads(sharedState = {}) {
  return toArray(sharedState.reads).map((entry) => entry?.key || entry).filter(Boolean);
}

function normalizeWrites(sharedState = {}) {
  return toArray(sharedState.writes).map((entry) => entry?.key || entry).filter(Boolean);
}

function buildContentionStatus(maxContention, mediumThreshold, highThreshold) {
  if (maxContention >= highThreshold) return 'high';
  if (maxContention >= mediumThreshold) return 'medium';
  if (maxContention > 0) return 'low';
  return 'none';
}

function normalizeAtomIds(atomIds = []) {
  return Array.isArray(atomIds)
    ? atomIds.map((id) => String(id || '').trim()).filter(Boolean)
    : [];
}

function buildSharedStateQuery(atomIds = []) {
  if (atomIds.length === 0) {
    return {
      societiesSql: `
        SELECT COUNT(DISTINCT source_id) as actors, COUNT(*) as links
        FROM atom_relations
        WHERE relation_type = 'shares_state'
      `,
      topKeysSql: `
        SELECT json_extract(context_json, '$.key') as key, COUNT(*) as count
        FROM atom_relations
        WHERE relation_type = 'shares_state'
        GROUP BY key
        ORDER BY count DESC
        LIMIT 5
      `,
      params: []
    };
  }

  const placeholders = atomIds.map(() => '?').join(', ');
  return {
    societiesSql: `
      SELECT COUNT(DISTINCT source_id) as actors, COUNT(*) as links
      FROM atom_relations
      WHERE relation_type = 'shares_state'
        AND source_id IN (${placeholders})
    `,
    topKeysSql: `
      SELECT json_extract(context_json, '$.key') as key, COUNT(*) as count
      FROM atom_relations
      WHERE relation_type = 'shares_state'
        AND source_id IN (${placeholders})
      GROUP BY key
      ORDER BY count DESC
      LIMIT 5
    `,
    params: atomIds
  };
}

export function summarizeSharedStateHotspots(sharedState = {}, options = {}) {
  const {
    mediumThreshold = 5,
    highThreshold = 10
  } = options;

  const topContentionKeys = normalizeTopContentionKeys(sharedState);
  const reads = normalizeReads(sharedState);
  const writes = normalizeWrites(sharedState);
  const totalLinks = Number(sharedState.totalLinks) || reads.length + writes.length;
  const actorCount = Number(sharedState.actorCount) || 0;
  const hottestKey = topContentionKeys[0] || null;
  const maxContention = hottestKey?.count || 0;

  return {
    status: buildContentionStatus(maxContention, mediumThreshold, highThreshold),
    hasSharedState: reads.length > 0 || writes.length > 0 || totalLinks > 0 || topContentionKeys.length > 0,
    reads,
    writes,
    totalLinks,
    actorCount,
    maxContention,
    hottestKey,
    topContentionKeys
  };
}

export function getSharedStateContentionSummary(db, options = {}) {
  if (!db) {
    return summarizeSharedStateHotspots({}, options);
  }

  const atomIds = normalizeAtomIds(options.atomIds);
  const { societiesSql, topKeysSql, params } = buildSharedStateQuery(atomIds);
  const societies = db.prepare(societiesSql).get(...params) || {};
  const topContentionKeys = db.prepare(topKeysSql).all(...params);

  return summarizeSharedStateHotspots({
    actorCount: Number(societies.actors) || 0,
    totalLinks: Number(societies.links) || 0,
    topContentionKeys
  }, options);
}
