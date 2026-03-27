/**
 * @fileoverview Legacy and canonical view helpers for semantic granularity.
 *
 * @module shared/compiler/semantic-surface-granularity-view
 */

import { normalizeSemanticConnectionRow } from './semantic-surface-granularity-legacy.js';

export function summarizeConnectionTypes(rows = []) {
  return rows.reduce((acc, row) => {
    const key = row.connection_type || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

export function buildLegacyView(rows = []) {
  const legacyConnections = rows.map(normalizeSemanticConnectionRow);
  return {
    rows: legacyConnections,
    sharedState: legacyConnections.filter((row) => row.type === 'sharedState'),
    eventListeners: legacyConnections.filter((row) => row.type === 'eventListeners'),
    envVars: legacyConnections.filter((row) => row.type === 'envVar'),
    total: legacyConnections.length
  };
}
