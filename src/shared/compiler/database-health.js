/**
 * @fileoverview Canonical database health summary.
 *
 * This helper measures whether the persisted SQLite surfaces are aligned with
 * the live atom universe and the canonical projections that depend on it.
 *
 * @module shared/compiler/database-health
 */

import { getFileUniverseGranularity } from './file-universe-granularity.js';
import { ensureLiveRowSync } from './live-row-reconciliation.js';
import { getSemanticSurfaceGranularity } from './semantic-surface-granularity.js';
import { getSystemMapPersistenceCoverage } from './system-map-persistence.js';
import { buildDatabaseHealthAssessment } from './database-health-assessment.js';
import { toNumber } from './core-utils.js';

function parseCount(row, key) {
  return toNumber(row?.[key]);
}

export function getDatabaseHealthSummary(db, options = {}) {
  if (!db) {
    return {
      healthy: false,
      healthScore: 0,
      grade: 'F',
      summary: 'Database unavailable',
      metrics: {},
      criticalFindings: [{
        code: 'database_unavailable',
        severity: 'high',
        message: 'Repository database is not available',
        details: {}
      }],
      warnings: [],
      recommendations: ['Restart the runtime and ensure the repository can be initialized']
    };
  }

  const {
    autoSyncLiveRows = true,
    liveRowSyncSampleLimit = 5
  } = options || {};

  let liveRowSync = null;
  if (autoSyncLiveRows) {
    try {
      liveRowSync = ensureLiveRowSync(db, { autoSync: true, sampleLimit: liveRowSyncSampleLimit });
    } catch (error) {
      liveRowSync = {
        autoSync: true,
        hadDrift: false,
        synchronized: false,
        cleanupError: error,
        deleted: { atoms: 0, files: 0, riskAssessments: 0, relations: 0, connections: 0 },
        before: null,
        after: null,
        summary: {
          liveFileTotal: 0,
          staleAtomRows: 0,
          staleFileRows: 0,
          staleRiskRows: 0,
          staleRelationRows: 0,
          staleConnectionRows: 0
        }
      };
    }
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
      (SELECT COUNT(*) FROM atoms WHERE (is_removed IS NULL OR is_removed = 0) AND COALESCE(shared_state_json, '') NOT IN ('', 'null', '[]')) AS atoms_with_shared_state,
      (SELECT COUNT(*) FROM atoms WHERE (is_removed IS NULL OR is_removed = 0) AND COALESCE(event_emitters_json, '') NOT IN ('', 'null', '[]')) AS atoms_with_event_emitters,
      (SELECT COUNT(*) FROM atoms WHERE (is_removed IS NULL OR is_removed = 0) AND COALESCE(event_listeners_json, '') NOT IN ('', 'null', '[]')) AS atoms_with_event_listeners,
      (SELECT COUNT(*) FROM atoms WHERE (is_removed IS NULL OR is_removed = 0) AND (
          COALESCE(shared_state_json, '') NOT IN ('', 'null', '[]') OR
          COALESCE(event_emitters_json, '') NOT IN ('', 'null', '[]') OR
          COALESCE(event_listeners_json, '') NOT IN ('', 'null', '[]')
      )) AS atoms_with_semantic_signals,
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
  const atomsWithSharedState = parseCount(counts, 'atoms_with_shared_state');
  const atomsWithEventEmitters = parseCount(counts, 'atoms_with_event_emitters');
  const atomsWithEventListeners = parseCount(counts, 'atoms_with_event_listeners');
  const atomsWithSemanticSignals = parseCount(counts, 'atoms_with_semantic_signals');
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

  const assessment = buildDatabaseHealthAssessment({
    counts: {
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
      atomsWithSharedState,
      atomsWithEventEmitters,
      atomsWithEventListeners,
      atomsWithSemanticSignals,
      activeSystemFiles,
      systemFilesWithSemantics,
      activeSemanticConnections
    },
    fileUniverse,
    systemMapCoverage,
    semanticSurface
  });

  return {
    healthy: assessment.healthy,
    healthScore: assessment.healthScore,
    grade: assessment.grade,
    summary: assessment.summary,
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
      atomsWithSharedState,
      atomsWithEventEmitters,
      atomsWithEventListeners,
      atomsWithSemanticSignals,
      activeSystemFiles,
      systemFilesWithSemantics,
      activeSemanticConnections,
      liveRowSync,
      fileUniverse,
      systemMapCoverage,
      semanticSurface
    },
    criticalFindings: assessment.criticalFindings,
    warnings: assessment.warnings,
    recommendations: assessment.recommendations
  };
}

export default getDatabaseHealthSummary;
