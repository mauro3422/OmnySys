/**
 * @fileoverview Canonical compiler persistence helpers.
 *
 * Bridges filesystem-backed metadata and SQLite-backed compiler state so
 * runtime consumers stop open-coding fs + repository logic inline.
 *
 * @module shared/compiler/compiler-persistence
 */

import fs from 'fs/promises';
import path from 'path';
import { normalizeFilePath } from './path-normalization.js';
import {
  SCANNED_FILE_MANIFEST_TABLE,
  createScannedFileManifestSummary,
  ensureScannedFileManifestTable,
  getCompilerDataDir,
  loadPersistedCompilerPathSets,
  loadPersistedIndexedFilePaths,
  loadPersistedScannedFilePaths as loadPersistedScannedFilePathsFromStore,
  readPersistedMetadataJson,
  withCompilerRepository
} from './compiler-persistence-paths.js';
export {
  cleanupOrphanedCompilerArtifacts,
  emitOrphanedImportsFromPersistedMetadata,
  removePersistedAtomMetadata,
  removePersistedFileMetadata
} from './compiler-persistence-cleanup.js';

export async function hasPersistedCompilerAnalysis(projectPath) {
  const dataDir = getCompilerDataDir(projectPath);
  const dbPath = path.join(dataDir, 'omnysys.db');
  const indexPath = path.join(dataDir, 'index.json');

  try {
    try {
      await fs.unlink(`${indexPath}.tmp`);
    } catch {
      // Ignore stale temp files.
    }

    await fs.access(indexPath);
    return true;
  } catch {
    try {
      await fs.access(dbPath);
      const count = await withCompilerRepository(projectPath, (repo) =>
        repo.db.prepare('SELECT COUNT(*) as count FROM atoms').get()?.count || 0
      );
      return count > 0;
    } catch {
      return false;
    }
  }
}

export async function getPersistedIndexedFilePaths(projectPath) {
  return loadPersistedIndexedFilePaths(projectPath);
}

export async function getPersistedScannedFilePaths(projectPath) {
  return loadPersistedScannedFilePathsFromStore(projectPath);
}

export async function loadPersistedScannedFilePaths(projectPath) {
  return getPersistedScannedFilePaths(projectPath);
}

export async function syncPersistedScannedFileManifest(projectPath, scannedFilePaths = [], options = {}) {
  const normalizedPaths = [...new Set(
    (Array.isArray(scannedFilePaths) ? scannedFilePaths : [])
      .filter(Boolean)
      .map(normalizeFilePath)
  )];

  const pruneMissing = options.pruneMissing !== false;
  const now = new Date().toISOString();

  try {
    await ensureScannedFileManifestTable(projectPath);
    await withCompilerRepository(projectPath, (repo) => {
      const insertStmt = repo.db.prepare(`
        INSERT INTO ${SCANNED_FILE_MANIFEST_TABLE} (path, first_seen, last_seen)
        VALUES (?, ?, ?)
        ON CONFLICT(path) DO UPDATE SET
          last_seen = excluded.last_seen
      `);

      const deleteStmt = repo.db.prepare(`
        DELETE FROM ${SCANNED_FILE_MANIFEST_TABLE}
        WHERE path = ?
      `);

      const existingRows = repo.db.prepare(`
        SELECT path
        FROM ${SCANNED_FILE_MANIFEST_TABLE}
      `).all();

      const existingPaths = new Set((existingRows || []).map((row) => normalizeFilePath(row?.path)).filter(Boolean));
      const currentPaths = new Set(normalizedPaths);

      const transaction = repo.db.transaction(() => {
        for (const filePath of normalizedPaths) {
          insertStmt.run(filePath, now, now);
        }

        if (pruneMissing) {
          for (const filePath of existingPaths) {
            if (!currentPaths.has(filePath)) {
              deleteStmt.run(filePath);
            }
          }
        }
      });

      transaction();
    });
  } catch {
    // Best effort only; callers can still compare against the pre-existing index.
  }

  return summarizePersistedScannedFileCoverage(projectPath, normalizedPaths);
}

export async function summarizePersistedScannedFileCoverage(projectPath, scannedFilePaths = []) {
  const normalizedPaths = [...new Set(
    (Array.isArray(scannedFilePaths) ? scannedFilePaths : [])
      .filter(Boolean)
      .map(normalizeFilePath)
  )];

  const manifestPaths = await getPersistedScannedFilePaths(projectPath);
  const missingFromManifest = normalizedPaths.filter((filePath) => !manifestPaths.has(filePath));

  return createScannedFileManifestSummary({
    scannedFileTotal: normalizedPaths.length,
    manifestFileTotal: manifestPaths.size,
    missingFromManifest
  });
}

export async function getPersistedKnownFilePaths(projectPath) {
  try {
    const { indexedPaths, manifestPaths } = await loadPersistedCompilerPathSets(projectPath);
    return new Set([...indexedPaths, ...manifestPaths]);
  } catch {
    return new Set();
  }
}

export async function findIndexedFileCandidate(rootPath, importPath) {
  const normalizedImportPath = normalizeFilePath(importPath);
  const parts = normalizedImportPath.split('/');
  const lastPart = parts[parts.length - 1] || normalizedImportPath;
  const baseName = lastPart.replace(/\.[jt]sx?$/, '');
  const fileBaseName = baseName.split('/').pop().replace(/\.[^/.]+$/, '');

  try {
    const row = await withCompilerRepository(rootPath, (repo) => repo.db.prepare(`
      SELECT file_path as path FROM atoms WHERE name = ? OR name LIKE ?
      UNION ALL
      SELECT path FROM files WHERE path LIKE ?
      LIMIT 1
    `).get(baseName, `%${baseName}%`, `%/${fileBaseName}.%`));

    return row?.path ? normalizeFilePath(row.path) : null;
  } catch {
    return null;
  }
}
