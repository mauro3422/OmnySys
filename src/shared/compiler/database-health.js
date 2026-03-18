/**
 * @fileoverview Canonical database health summary.
 *
 * This helper measures whether the persisted SQLite surfaces are aligned with
 * the live atom universe and the canonical projections that depend on it.
 *
 * @module shared/compiler/database-health
 */

import { getFileUniverseGranularity } from './file-universe-granularity.js';
import { getSemanticSurfaceGranularity } from './semantic-surface-granularity.js';
import { getSystemMapPersistenceCoverage } from './system-map-persistence.js';
import { toNumber } from './core-utils.js';

function buildGrade(score) {
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 85) return 'B+';
  if (score >= 80) return 'B';
  if (score >= 75) return 'C+';
  if (score >= 70) return 'C';
  if (score >= 65) return 'D+';
  if (score >= 60) return 'D';
  return 'F';
}

function buildFinding(code, severity, message, details = {}) {
  return { code, severity, message, details };
}

function parseCount(row, key) {
  return toNumber(row?.[key]);
}

export function getDatabaseHealthSummary(db) {
  if (!db) {
    return {
      healthy: false,
      healthScore: 0,
      grade: 'F',
      summary: 'Database unavailable',
      metrics: {},
      criticalFindings: [buildFinding('database_unavailable', 'high', 'Repository database is not available')],
      warnings: [],
      recommendations: ['Restart the runtime and ensure the repository can be initialized']
    };
  }

  const counts = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM compiler_scanned_files) AS scanned_files,
      (SELECT COUNT(*) FROM files WHERE (is_removed IS NULL OR is_removed = 0)) AS active_files,
      (SELECT COUNT(*) FROM atoms WHERE (is_removed IS NULL OR is_removed = 0)) AS active_atoms,
      (SELECT COUNT(*) FROM atoms a
        WHERE (a.is_removed IS NULL OR a.is_removed = 0)
          AND a.file_path IS NOT NULL
          AND a.file_path != ''
          AND NOT EXISTS (
            SELECT 1
            FROM files f
            WHERE f.path = a.file_path
              AND (f.is_removed IS NULL OR f.is_removed = 0)
          )
      ) AS orphan_atoms,
      (SELECT COUNT(*) FROM atoms a
        WHERE (a.is_removed IS NULL OR a.is_removed = 0)
          AND a.file_path IS NOT NULL
          AND a.file_path != ''
          AND NOT EXISTS (
            SELECT 1
            FROM compiler_scanned_files c
            WHERE c.path = a.file_path
          )
      ) AS orphan_atoms_missing_scan,
      (SELECT COUNT(*) FROM atoms WHERE (is_removed IS NULL OR is_removed = 0) AND COALESCE(calls_json, '') NOT IN ('', 'null', '[]')) AS atoms_with_calls,
      (SELECT COUNT(*) FROM atoms WHERE (is_removed IS NULL OR is_removed = 0) AND COALESCE(called_by_json, '') NOT IN ('', 'null', '[]')) AS atoms_with_called_by,
      (SELECT COUNT(*) FROM atom_relations WHERE relation_type = 'calls' AND (is_removed IS NULL OR is_removed = 0)) AS active_call_relations,
      (SELECT COUNT(*) FROM atom_relations WHERE relation_type = 'shares_state' AND (is_removed IS NULL OR is_removed = 0)) AS active_shares_state_relations,
      (SELECT COUNT(*) FROM atom_relations WHERE relation_type = 'calls' AND (is_removed IS NULL OR is_removed = 0) AND (
          NOT EXISTS (SELECT 1 FROM atoms src WHERE src.id = source_id AND (src.is_removed IS NULL OR src.is_removed = 0)) OR
          NOT EXISTS (SELECT 1 FROM atoms tgt WHERE tgt.id = target_id AND (tgt.is_removed IS NULL OR tgt.is_removed = 0))
      )) AS orphan_call_relations,
      (SELECT COUNT(*) FROM call_graph) AS call_graph_rows,
      (SELECT COUNT(*) FROM risk_assessments WHERE (is_removed = 1 AND lifecycle_status = 'active')) AS contradictory_risk_rows,
      (SELECT COUNT(*) FROM risk_assessments WHERE (is_removed IS NULL OR is_removed = 0)) AS active_risk_rows,
      (SELECT COUNT(*) FROM system_files WHERE (is_removed IS NULL OR is_removed = 0)) AS active_system_files,
      (SELECT COUNT(*) FROM system_files WHERE (is_removed IS NULL OR is_removed = 0) AND semantic_connections_json IS NOT NULL AND semantic_connections_json NOT IN ('', 'null', '[]')) AS system_files_with_semantics,
      (SELECT COUNT(*) FROM semantic_connections WHERE (is_removed IS NULL OR is_removed = 0)) AS active_semantic_connections
  `).get() || {};

  const scannedFiles = parseCount(counts, 'scanned_files');
  const activeFiles = parseCount(counts, 'active_files');
  const activeAtoms = parseCount(counts, 'active_atoms');
  const orphanAtoms = parseCount(counts, 'orphan_atoms');
  const orphanAtomsMissingScan = parseCount(counts, 'orphan_atoms_missing_scan');
  const atomsWithCalls = parseCount(counts, 'atoms_with_calls');
  const atomsWithCalledBy = parseCount(counts, 'atoms_with_called_by');
  const activeCallRelations = parseCount(counts, 'active_call_relations');
  const activeSharesStateRelations = parseCount(counts, 'active_shares_state_relations');
  const orphanCallRelations = parseCount(counts, 'orphan_call_relations');
  const callGraphRows = parseCount(counts, 'call_graph_rows');
  const contradictoryRiskRows = parseCount(counts, 'contradictory_risk_rows');
  const activeRiskRows = parseCount(counts, 'active_risk_rows');
  const activeSystemFiles = parseCount(counts, 'active_system_files');
  const systemFilesWithSemantics = parseCount(counts, 'system_files_with_semantics');
  const activeSemanticConnections = parseCount(counts, 'active_semantic_connections');

  const fileUniverse = getFileUniverseGranularity({
    scannedFileTotal: scannedFiles,
    manifestFileTotal: scannedFiles,
    liveFileCount: activeFiles
  });
  const systemMapCoverage = getSystemMapPersistenceCoverage(db);
  const semanticSurface = getSemanticSurfaceGranularity(db);

  const criticalFindings = [];
  const warnings = [];
  let score = 100;

  if (fileUniverse.healthy === false) {
    const penalty = 12 * Math.max(1, fileUniverse.issues.length);
    score -= penalty;
    warnings.push(...fileUniverse.issues.map((issue) => buildFinding(issue.code, issue.severity, issue.message)));
  }

  if (systemMapCoverage.healthy === false) {
    const penalty = 10 * Math.max(1, systemMapCoverage.issues.length);
    score -= penalty;
    warnings.push(...systemMapCoverage.issues.map((issue) => buildFinding(issue, 'medium', issue)));
  }

  if (semanticSurface.materiallyDrifting === true) {
    const penalty = 15 + (semanticSurface.materialIssues?.length || 0) * 5;
    score -= penalty;
    warnings.push(...(semanticSurface.advisories || []).map((message) => buildFinding('semantic_surface_advisory', 'medium', message)));
    criticalFindings.push(...(semanticSurface.materialIssues || []).map((message) => buildFinding('semantic_surface_drift', 'medium', message)));
  }

  if (orphanAtoms > 0) {
    score -= Math.min(35, 12 + Math.floor(orphanAtoms / 25));
    criticalFindings.push(buildFinding(
      'orphaned_atoms',
      'high',
      'Active atoms still point to files that are missing from the canonical files table.',
      {
        orphanAtoms,
        orphanAtomsMissingScan
      }
    ));
  }

  if (atomsWithCalls > 0 && activeCallRelations === 0) {
    score -= 40;
    criticalFindings.push(buildFinding(
      'call_graph_not_hydrated',
      'high',
      'Atoms still contain calls_json, but the canonical atom_relations call projection has no active calls.'
    ));
  } else if (atomsWithCalls > 0 && callGraphRows === 0) {
    score -= 25;
    criticalFindings.push(buildFinding(
      'call_graph_view_empty',
      'high',
      'Atoms contain call telemetry, but the canonical call_graph view is empty.'
    ));
  } else if (atomsWithCalls > 0 && callGraphRows !== activeCallRelations) {
    score -= 10;
    warnings.push(buildFinding(
      'call_graph_projection_drift',
      'medium',
      'The call_graph view and atom_relations call rows are not aligned.'
    ));
  }

  if (orphanCallRelations > 0) {
    score -= Math.min(15, 5 + Math.floor(orphanCallRelations / 50));
    warnings.push(buildFinding(
      'orphan_call_relations',
      'medium',
      'Some call relations point to inactive or missing atoms.',
      { orphanCallRelations }
    ));
  }

  if (contradictoryRiskRows > 0) {
    score -= Math.min(25, 10 + contradictoryRiskRows);
    criticalFindings.push(buildFinding(
      'risk_lifecycle_contradiction',
      'high',
      'risk_assessments contains rows marked removed while still claiming lifecycle_status = active.',
      { contradictoryRiskRows }
    ));
  }

  if (activeSharesStateRelations > 0 && activeSemanticConnections === 0) {
    score -= 8;
    warnings.push(buildFinding(
      'semantic_projection_lag',
      'medium',
      'Atom-level semantic relations exist, but the semantic_connections table is empty.'
    ));
  }

  if (activeSystemFiles > 0 && systemFilesWithSemantics === 0 && activeSharesStateRelations > 0) {
    score -= 6;
    warnings.push(buildFinding(
      'system_files_semantic_lag',
      'medium',
      'system_files has no semantic_connections_json rows while atom-level semantic relations exist.'
    ));
  }

  const healthScore = Math.max(0, Math.round(score));
  const healthy = healthScore >= 85 && criticalFindings.length === 0;

  const recommendations = [];
  if (atomsWithCalls > 0 && activeCallRelations === 0) {
    recommendations.push('Reindex the project so call relations are persisted into atom_relations and exposed through call_graph.');
  }
  if (orphanAtoms > 0) {
    recommendations.push('Reconcile active atoms against the files and compiler_scanned_files tables before trusting database health.');
  }
  if (contradictoryRiskRows > 0) {
    recommendations.push('Reconcile risk_assessments lifecycle fields and soft-delete flags before trusting risk telemetry.');
  }
  if (semanticSurface.materiallyDrifting === true) {
    recommendations.push('Rebuild semantic_connections from the canonical atom_relations surface.');
  }

  return {
    healthy,
    healthScore,
    grade: buildGrade(healthScore),
    summary: healthy
      ? 'Database projections are aligned'
      : 'Database projections are drifting from the canonical atom graph',
    metrics: {
      scannedFiles,
      activeFiles,
      activeAtoms,
      orphanAtoms,
      orphanAtomsMissingScan,
      atomsWithCalls,
      atomsWithCalledBy,
      activeCallRelations,
      activeSharesStateRelations,
      callGraphRows,
      orphanCallRelations,
      contradictoryRiskRows,
      activeRiskRows,
      activeSystemFiles,
      systemFilesWithSemantics,
      activeSemanticConnections,
      fileUniverse,
      systemMapCoverage,
      semanticSurface
    },
    criticalFindings,
    warnings,
    recommendations
  };
}

export default getDatabaseHealthSummary;
