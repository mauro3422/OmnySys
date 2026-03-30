/**
 * @fileoverview Canonical counts loader for database health scoring.
 *
 * Pulls the raw SQLite projections into a single normalized payload so the
 * public database-health summary can stay small and focused.
 *
 * @module shared/compiler/database-health-counts
 */

import { toNumber } from './core-utils.js';

function parseCount(row, key) {
  return toNumber(row?.[key]);
}

export function loadDatabaseHealthCounts(db) {
  if (!db) {
    return {};
  }

  const row = db.prepare(`
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

  return {
    scannedFiles: parseCount(row, 'scanned_files'),
    activeFiles: parseCount(row, 'active_files'),
    activeAtoms: parseCount(row, 'active_atoms'),
    orphanAtoms: parseCount(row, 'orphan_atoms'),
    orphanAtomsMissingScan: parseCount(row, 'orphan_atoms_missing_scan'),
    atomsWithCalls: parseCount(row, 'atoms_with_calls'),
    atomsWithCalledBy: parseCount(row, 'atoms_with_called_by'),
    activeCallRelations: parseCount(row, 'active_call_relations'),
    activeSharesStateRelations: parseCount(row, 'active_shares_state_relations'),
    orphanCallRelations: parseCount(row, 'orphan_call_relations'),
    callGraphRows: parseCount(row, 'call_graph_rows'),
    contradictoryRiskRows: parseCount(row, 'contradictory_risk_rows'),
    activeRiskRows: parseCount(row, 'active_risk_rows'),
    atomsWithSharedState: parseCount(row, 'atoms_with_shared_state'),
    atomsWithEventEmitters: parseCount(row, 'atoms_with_event_emitters'),
    atomsWithEventListeners: parseCount(row, 'atoms_with_event_listeners'),
    atomsWithSemanticSignals: parseCount(row, 'atoms_with_semantic_signals'),
    activeSystemFiles: parseCount(row, 'active_system_files'),
    systemFilesWithSemantics: parseCount(row, 'system_files_with_semantics'),
    activeSemanticConnections: parseCount(row, 'active_semantic_connections')
  };
}
