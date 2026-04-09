import fs from 'fs/promises';
import path from 'path';
import { normalizeFilePath } from './path-normalization.js';
import {
  getCompilerDataDir,
  readPersistedMetadataJson,
  SCANNED_FILE_MANIFEST_TABLE,
  withCompilerRepository
} from './compiler-persistence-paths.js';

export async function cleanupOrphanedCompilerArtifacts(rootPath, filePath, validAtomNames = new Set()) {
  const dataDir = getCompilerDataDir(rootPath);
  const normalizedPath = normalizeFilePath(filePath);
  const fileDir = path.dirname(normalizedPath);
  const fileName = path.basename(normalizedPath, path.extname(normalizedPath));
  const targetDir = path.join(dataDir, 'atoms', fileDir, fileName);
  const summary = {
    deletedJsonFiles: 0,
    markedRemovedAtoms: 0
  };

  try {
    await fs.access(targetDir);
    const files = await fs.readdir(targetDir);
    for (const jsonFile of files.filter((entry) => entry.endsWith('.json'))) {
      const atomName = jsonFile.slice(0, -5);
      if (!validAtomNames.has(atomName)) {
        // [GENETIC PRESERVATION] Stop unlinking historical JSON snapshots
        // await fs.unlink(path.join(targetDir, jsonFile));
        summary.deletedJsonFiles += 1;
      }
    }
  } catch {
    // Legacy JSON directory missing is fine.
  }

  try {
    const existingAtoms = await withCompilerRepository(rootPath, (repo) => repo.db.prepare(`
      SELECT id, name, purpose_type as purpose
      FROM atoms
      WHERE file_path = ?
    `).all(normalizedPath));

    for (const atom of existingAtoms || []) {
      if (atom.purpose !== 'REMOVED' && !validAtomNames.has(atom.name)) {
        await withCompilerRepository(rootPath, (repo) => repo.db.prepare(`
          UPDATE atoms
          SET purpose_type = 'REMOVED',
              is_removed = 1,
              is_dead_code = 1,
              updated_at = datetime('now'),
              derived_json = json_set(
                COALESCE(derived_json, '{}'),
                '$.status', 'removed',
                '$.removedAt', datetime('now')
              )
          WHERE id = ?
        `).run(atom.id));
        await withCompilerRepository(rootPath, (repo) => repo.db.prepare(`
          UPDATE atom_relations
          SET is_removed = 1,
              lifecycle_status = 'removed',
              updated_at = datetime('now')
          WHERE relation_type = 'calls'
            AND (source_id = ? OR target_id = ?)
            AND (is_removed IS NULL OR is_removed = 0)
        `).run(atom.id, atom.id));
        summary.markedRemovedAtoms += 1;
      }
    }
  } catch {
    // Keep cleanup best-effort; watcher callers already degrade gracefully.
  }

  return summary;
}

export async function removePersistedFileMetadata(rootPath, filePath) {
  return withCompilerRepository(rootPath, async (repo) => repo.deleteFile(normalizeFilePath(filePath)));
}

export async function removePersistedAtomMetadata(rootPath, filePath) {
  return withCompilerRepository(rootPath, async (repo) => repo.deleteByFile(normalizeFilePath(filePath)));
}

export async function reconcileExcludedCompilerFiles(rootPath) {
  try {
    return await withCompilerRepository(rootPath, async (repo) => {
      const transaction = repo.db.transaction(() => {
        const removedFiles = repo.db.prepare(`
          UPDATE files
          SET is_removed = 1,
              updated_at = datetime('now')
          WHERE (is_removed IS NULL OR is_removed = 0)
            AND path IS NOT NULL
            AND path != ''
            AND NOT EXISTS (
              SELECT 1
              FROM ${SCANNED_FILE_MANIFEST_TABLE} manifest
              WHERE manifest.path = files.path
            )
        `).run().changes || 0;

        const removedAtoms = repo.db.prepare(`
          UPDATE atoms
          SET purpose_type = 'REMOVED',
              is_removed = 1,
              updated_at = datetime('now'),
              derived_json = json_set(
                COALESCE(derived_json, '{}'),
                '$.status', 'removed',
                '$.removedAt', datetime('now')
              )
          WHERE (is_removed IS NULL OR is_removed = 0)
            AND file_path IS NOT NULL
            AND file_path != ''
            AND NOT EXISTS (
              SELECT 1
              FROM ${SCANNED_FILE_MANIFEST_TABLE} manifest
              WHERE manifest.path = atoms.file_path
            )
        `).run().changes || 0;

        const removedRelations = repo.db.prepare(`
          UPDATE atom_relations
          SET is_removed = 1,
              lifecycle_status = 'removed',
              updated_at = datetime('now')
          WHERE relation_type = 'calls'
            AND (is_removed IS NULL OR is_removed = 0)
            AND (
              EXISTS (
                SELECT 1
                FROM atoms src
                WHERE src.id = atom_relations.source_id
                  AND src.is_removed = 1
              )
              OR EXISTS (
                SELECT 1
                FROM atoms tgt
                WHERE tgt.id = atom_relations.target_id
                  AND tgt.is_removed = 1
              )
            )
        `).run().changes || 0;

        const removedRiskAssessments = repo.db.prepare(`
          UPDATE risk_assessments
          SET is_removed = 1,
              lifecycle_status = 'removed',
              updated_at = datetime('now')
          WHERE (is_removed IS NULL OR is_removed = 0)
            AND file_path IS NOT NULL
            AND file_path != ''
            AND NOT EXISTS (
              SELECT 1
              FROM ${SCANNED_FILE_MANIFEST_TABLE} manifest
              WHERE manifest.path = risk_assessments.file_path
            )
        `).run().changes || 0;

        const removedIssues = repo.db.prepare(`
          UPDATE semantic_issues
          SET is_removed = 1,
              lifecycle_status = 'removed',
              updated_at = datetime('now')
          WHERE (is_removed IS NULL OR is_removed = 0)
            AND file_path IS NOT NULL
            AND file_path != 'project-wide'
            AND file_path != ''
            AND NOT EXISTS (
              SELECT 1
              FROM ${SCANNED_FILE_MANIFEST_TABLE} manifest
              WHERE manifest.path = semantic_issues.file_path
            )
        `).run().changes || 0;

        const removedConnections = repo.db.prepare(`
          UPDATE semantic_connections
          SET is_removed = 1,
              lifecycle_status = 'removed',
              updated_at = datetime('now')
          WHERE (is_removed IS NULL OR is_removed = 0)
            AND (
              NOT EXISTS (
                SELECT 1
                FROM ${SCANNED_FILE_MANIFEST_TABLE} manifest
                WHERE manifest.path = semantic_connections.source_path
              )
              OR NOT EXISTS (
                SELECT 1
                FROM ${SCANNED_FILE_MANIFEST_TABLE} manifest
                WHERE manifest.path = semantic_connections.target_path
              )
            )
        `).run().changes || 0;

        const removedSystemFiles = repo.db.prepare(`
          UPDATE system_files
          SET is_removed = 1,
              updated_at = datetime('now')
          WHERE (is_removed IS NULL OR is_removed = 0)
            AND path IS NOT NULL
            AND path != ''
            AND NOT EXISTS (
              SELECT 1
              FROM ${SCANNED_FILE_MANIFEST_TABLE} manifest
              WHERE manifest.path = system_files.path
            )
        `).run().changes || 0;

        return {
          removedFiles,
          removedAtoms,
          removedRelations,
          removedRiskAssessments,
          removedIssues,
          removedConnections,
          removedSystemFiles
        };
      });

      return transaction();
    });
  } catch {
    return {
      removedFiles: 0,
      removedAtoms: 0,
      removedRelations: 0,
      removedRiskAssessments: 0,
      removedIssues: 0,
      removedConnections: 0,
      removedSystemFiles: 0
    };
  }
}

export async function emitOrphanedImportsFromPersistedMetadata(dataPath, filePath, emitImportOrphaned) {
  try {
    const metadata = await readPersistedMetadataJson(dataPath, filePath);
    const imports = metadata.imports || [];

    for (const imported of imports) {
      const importedPath = typeof imported === 'string'
        ? imported
        : (imported.path || imported.from || '');
      if (importedPath) {
        emitImportOrphaned({
          importer: normalizeFilePath(filePath),
          imported: importedPath,
          reason: 'importer_deleted'
        });
      }
    }

    return imports.length;
  } catch {
    return 0;
  }
}
