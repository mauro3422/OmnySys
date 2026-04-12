/**
 * @fileoverview Canonical entrypoints for compiler contracts used by query and MCP layers.
 *
 * This module provides a narrow, cycle-safe surface for common compiler helpers
 * that should not import the full compiler barrel.
 *
 * @module shared/compiler/canonical-contracts
 */

export { buildDuplicateRemediationPlan } from './duplicate-remediation.js';
export { buildCompilerControlPlaneFoundations } from './control-plane-foundations.js';
export { buildDataGatewayContract, summarizeDataGatewayContract } from './contract.js';
export { ensureLiveRowSync } from './live-row-reconciliation.js';
export { getFileUniverseGranularity } from './file-universe-granularity.js';
export { getLiveFileSetSql } from './live-row-utils/index.js';
export { normalizeDerivedRiskLevel } from './risk-level.js';
export { parseSemanticFingerprint } from './conceptual-noise-policy.js';
export { getSemanticSurfaceGranularity } from './semantic-surface-granularity.js';
