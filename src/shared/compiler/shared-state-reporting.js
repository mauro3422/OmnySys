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
