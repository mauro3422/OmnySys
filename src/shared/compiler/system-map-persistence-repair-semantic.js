import { safeParseJson } from './core-utils.js';
import {
  deriveSemanticConnectionsFromAtomSurface,
  loadAtomSemanticSurface
} from './semantic-surface-derivation.js';
import { normalizeDbPath, toJsonText } from './system-map-persistence-repair-paths.js';

function sameRepairPath(candidatePath, targetPath) {
  const candidate = normalizeDbPath(candidatePath);
  const target = normalizeDbPath(targetPath);

  if (!candidate || !target) {
    return false;
  }

  return candidate === target || candidate.endsWith(`/${target}`) || target.endsWith(`/${candidate}`);
}

function buildSemanticSurfaceFromAtoms(db, fileRows, now) {
  const atomSurface = loadAtomSemanticSurface(db);
  const derived = deriveSemanticConnectionsFromAtomSurface(atomSurface, now);
  const semanticConnectionsByFile = new Map();

  for (const fileRow of fileRows || []) {
    const sourcePath = normalizeDbPath(fileRow?.path || '');
    if (sourcePath) {
      semanticConnectionsByFile.set(sourcePath, []);
    }
  }

  for (const row of derived.rows || []) {
    const connection = {
      from: row.source_path,
      to: row.target_path,
      type: row.connection_type,
      key: row.connection_key || null,
      weight: Number(row.weight) || 0,
      metadata: safeParseJson(row.context_json, {})
    };

    for (const fileRow of fileRows || []) {
      const sourcePath = normalizeDbPath(fileRow?.path || '');
      if (!sourcePath) {
        continue;
      }

      if (sameRepairPath(row.source_path, sourcePath) || sameRepairPath(row.target_path, sourcePath)) {
        semanticConnectionsByFile.get(sourcePath).push(connection);
      }
    }
  }

  return {
    semanticRows: derived.rows || [],
    semanticConnectionsByFile,
    semanticSummary: derived.summary || { totalRows: 0, sharedStateGroupCount: 0, eventGroupCount: 0 }
  };
}

function repairSemanticConnectionsFromAtoms(db, now) {
  const fileRows = db.prepare(`
    SELECT path
    FROM system_files
    WHERE (is_removed IS NULL OR is_removed = 0)
  `).all();

  const semanticSurface = buildSemanticSurfaceFromAtoms(db, fileRows, now);
  const isoNow = new Date(now).toISOString();
  const columns = db.prepare('PRAGMA table_info("system_files")').all();
  const hasUpdatedAt = Array.isArray(columns) && columns.some((column) => column?.name === 'updated_at');
  const hasLifecycleStatus = Array.isArray(columns) && columns.some((column) => column?.name === 'lifecycle_status');
  const updateAssignments = ['semantic_connections_json = ?'];
  if (hasUpdatedAt) {
    updateAssignments.push('updated_at = ?');
  }
  if (hasLifecycleStatus) {
    updateAssignments.push("lifecycle_status = 'active'");
  }

  const updateStmt = db.prepare(`
    UPDATE system_files
    SET ${updateAssignments.join(', ')}
    WHERE path = ?
  `);

  const insertSemanticConnection = db.prepare(`
    INSERT INTO semantic_connections (
      source_path,
      target_path,
      connection_type,
      connection_key,
      weight,
      context_json,
      created_at,
      is_removed,
      updated_at,
      lifecycle_status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
  `);

  db.transaction(() => {
    db.prepare('DELETE FROM semantic_connections').run();

    for (const fileRow of fileRows) {
      const sourcePath = normalizeDbPath(fileRow?.path || '');
      const serializedConnections = toJsonText(semanticSurface.semanticConnectionsByFile.get(sourcePath) || [], '[]');
      if (hasUpdatedAt) {
        updateStmt.run(serializedConnections, isoNow, sourcePath);
      } else {
        updateStmt.run(serializedConnections, sourcePath);
      }
    }

    for (const row of semanticSurface.semanticRows || []) {
      insertSemanticConnection.run(
        row.source_path,
        row.target_path,
        row.connection_type,
        row.connection_key,
        row.weight,
        row.context_json,
        row.created_at,
        row.updated_at,
        row.lifecycle_status
      );
    }
  })();

  return {
    repaired: true,
    inserted: semanticSurface.semanticRows.length,
    sources: fileRows.length,
    dependencies: 0,
    semanticConnections: semanticSurface.semanticRows.length,
    rebuiltFrom: 'atoms.semantic_surface'
  };
}

export {
  buildSemanticSurfaceFromAtoms,
  repairSemanticConnectionsFromAtoms
};
