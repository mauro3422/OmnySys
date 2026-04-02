/**
 * @fileoverview Canonical entrypoints for compiler contracts used by query and MCP layers.
 *
 * This module provides a narrow, cycle-safe surface for common compiler helpers
 * that should not import the full compiler barrel.
 *
 * @module shared/compiler/canonical-contracts
 */

export { buildDuplicateRemediationPlan } from './duplicate-remediation.js';
export { ensureLiveRowSync } from './live-row-reconciliation.js';
export { getLiveFileSetSql } from './live-row-utils.js';
export { normalizeDerivedRiskLevel } from './risk-level.js';
export { parseSemanticFingerprint } from './conceptual-noise-policy.js';
export { getSemanticSurfaceGranularity } from './semantic-surface-granularity.js';
