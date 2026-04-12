/**
 * @fileoverview surface-obligations-propagator.js
 * Bridges missing-surface-audit findings with the propagation engine.
 *
 * When the audit guard detects a table with data but no surface,
 * this module generates a "propagation obligation" that flows to:
 *  - Canonical Promotion Engine (as emergent candidate)
 *  - Inventory (as system gap)
 *  - Control Plane Dashboard (as actionable item)
 *
 * Pattern: detect → propagate → track → resolve
 */

import { CANONICAL_SURFACE_REGISTRY } from './canonical-surface-registry.js';

/**
 * Builds propagation obligations for all surfaces missing canonical APIs.
 * @param {object} db - SQLite database connection
 * @returns {object} Propagation plan
 */
export function buildSurfaceObligationsPropagationPlan(db) {
  const obligations = [];

  for (const [key, surface] of Object.entries(CANONICAL_SURFACE_REGISTRY)) {
    // Only surfaces that are missing or partial need propagation
    if (surface.state === 'canonical' || surface.state === 'internal') continue;

    // Get actual row count from DB if available
    let rowCount = surface.rowCount || 0;
    if (rowCount === 0 && db) {
      try {
        const result = db.prepare(`SELECT COUNT(*) as cnt FROM ${surface.table}`).get();
        rowCount = result?.cnt || 0;
      } catch {
        // Table might not exist yet
      }
    }

    if (rowCount === 0 && surface.state !== 'missing_surface') continue;

    obligations.push({
      id: `surface_obligation:${key}`,
      type: 'missing_canonical_surface',
      sourceTable: surface.table,
      rowCount,
      controlPlaneField: surface.controlPlaneField,
      requiredSurfaceFile: surface.suggestedFile,
      requiredLoadFn: surface.loadFn ? null : `load${capitalize(key)}`,
      description: surface.description,
      severity: getObligationSeverity(key, rowCount),
      propagationTarget: 'canonical_surface',
      actionRequired: `Create ${surface.suggestedFile} with canonical read API`,
      estimatedImpact: estimateImpact(key, rowCount),
      createdAt: new Date().toISOString(),
      state: 'pending'
    });
  }

  return {
    state: obligations.length > 0 ? 'obligations_pending' : 'all_surfaces_complete',
    totalObligations: obligations.length,
    criticalObligations: obligations.filter(o => o.severity === 'critical').length,
    highObligations: obligations.filter(o => o.severity === 'high').length,
    obligations,
    summary: buildObligationsSummary(obligations),
    nextAction: obligations.length > 0
      ? `Create ${obligations[0].requiredSurfaceFile} to resolve ${obligations[0].controlPlaneField} gap`
      : 'All canonical surfaces are implemented.'
  };
}

/**
 * Gets the current surface obligations for the control plane.
 * @param {object} db - SQLite database connection
 * @returns {object} Control plane obligations status
 */
export function getSurfaceObligationsControlPlaneStatus(db) {
  const plan = buildSurfaceObligationsPropagationPlan(db);

  if (plan.totalObligations === 0) {
    return {
      state: 'complete',
      reason: 'All canonical surfaces are implemented',
      recommendation: 'Monitor for new tables that may need surfaces.'
    };
  }

  const criticalFields = plan.obligations
    .filter(o => o.severity === 'critical' || o.severity === 'high')
    .map(o => o.controlPlaneField)
    .join(', ');

  return {
    state: plan.criticalObligations > 0 ? 'blocked' : 'watching',
    pendingObligations: plan.totalObligations,
    criticalObligations: plan.criticalObligations,
    highObligations: plan.highObligations,
    affectedControlPlaneFields: criticalFields,
    summary: plan.summary,
    nextAction: plan.nextAction
  };
}

/**
 * Registers surface obligations into the semantic issues table for persistence.
 * @param {object} db - SQLite database connection
 * @param {number} now - Timestamp
 * @returns {object} Registration result
 */
export function registerSurfaceObligations(db, now = Date.now()) {
  const plan = buildSurfaceObligationsPropagationPlan(db);
  let registered = 0;

  try {
    for (const obligation of plan.obligations) {
      // Check if already registered
      const existing = db.prepare(`
        SELECT id FROM semantic_issues
        WHERE issue_type = 'missing_surface'
          AND file_path = ?
      `).get(obligation.requiredSurfaceFile);

      if (existing) continue; // Already registered

      db.prepare(`
        INSERT INTO semantic_issues (file_path, issue_type, severity, message, context_json, detected_at)
        VALUES (?, 'missing_surface', ?, ?, ?, ?)
      `).run(
        obligation.requiredSurfaceFile,
        obligation.severity,
        obligation.description,
        JSON.stringify({
          sourceTable: obligation.sourceTable,
          rowCount: obligation.rowCount,
          controlPlaneField: obligation.controlPlaneField,
          obligationId: obligation.id
        }),
        now
      );
      registered++;
    }
  } catch {
    // Issues table might not be available
  }

  return {
    totalObligations: plan.totalObligations,
    newlyRegistered: registered,
    alreadyRegistered: plan.totalObligations - registered
  };
}

function getObligationSeverity(key, rowCount) {
  // Critical: runtime telemetry that affects control plane visibility
  if (['topology', 'bridge_telemetry', 'tool_telemetry'].includes(key)) return 'critical';
  // High: analysis surfaces with significant data
  if (rowCount > 1000) return 'high';
  // Medium: smaller tables
  return 'medium';
}

function estimateImpact(key, rowCount) {
  const impacts = {
    topology: 'Enables MCP client lifecycle tracking in control plane',
    bridge_telemetry: 'Enables bridge latency and error visibility',
    tool_telemetry: 'Enables tool success rate and repair tracking',
    session_lifecycle: 'Enables session state and client sync monitoring',
    atom_events: `Unlocks ${rowCount} semantic events for analysis`,
    societies: `Enables ${rowCount} cohesion clusters visibility`,
    file_dependencies: `Enables file-level dependency graph (${rowCount} edges)`
  };
  return impacts[key] || `Enables ${key} surface for control plane visibility`;
}

function buildObligationsSummary(obligations) {
  if (obligations.length === 0) return 'obligations=complete';
  const bySeverity = {};
  for (const o of obligations) {
    bySeverity[o.severity] = (bySeverity[o.severity] || 0) + 1;
  }
  const parts = Object.entries(bySeverity).map(([sev, count]) => `${count}${sev}`);
  return `obligations=${obligations.length}pending (${parts.join(', ')})`;
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

export default {
  buildSurfaceObligationsPropagationPlan,
  getSurfaceObligationsControlPlaneStatus,
  registerSurfaceObligations
};
