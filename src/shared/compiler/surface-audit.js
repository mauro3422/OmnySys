/**
 * @fileoverview Canonical surface audit for compiler/runtime status surfaces.
 *
 * Centralizes the high-signal view over the DB-backed derived surfaces so the
 * MCP summary can present one audit block instead of a scatter of individual
 * coverage fragments.
 *
 * @module shared/compiler/surface-audit
 */

export {
  buildSurfaceAudit
} from './surface-audit-core.js';

export {
  summarizeSurfaceAudit,
  summarizeSurfaceAuditForStatus
} from './surface-audit-summary.js';
