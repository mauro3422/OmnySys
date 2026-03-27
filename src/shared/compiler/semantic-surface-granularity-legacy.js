/**
 * @fileoverview Legacy semantic bucket helpers.
 *
 * @module shared/compiler/semantic-surface-granularity-legacy
 */

import { safeParseJson } from './core-utils.js';

export function classifyLegacyBucket(connectionType = '') {
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

export function normalizeSemanticConnectionRow(row = {}) {
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

export function usesLegacySemanticBucket(connectionType = '') {
  if (!connectionType) {
    return true;
  }

  return !/^(sharedState|eventListeners|envVar|route|colocation)$/i.test(connectionType);
}

export function requiresCanonicalSemanticNormalization(row = {}) {
  const context = safeParseJson(row.context_json, {});
  const derivedFrom = context?.derivedFrom || null;
  return usesLegacySemanticBucket(row.connection_type) || derivedFrom === 'legacy_semantic_connections';
}
