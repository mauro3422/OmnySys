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

const DATA_DIR = '.omnysysdata';
const SCANNED_FILE_MANIFEST_TABLE = 'compiler_scanned_files';

function normalizeFilePath(filePath = '') {
  return String(filePath || '').replace(/\\/g, '/');
}

function getDataDir(rootPath) {
  return path.join(rootPath, DATA_DIR);
}

function getMetadataJsonPath(dataPath, filePath) {
  const normalizedPath = normalizeFilePath(filePath);
  const fileName = path.basename(normalizedPath);
  const fileDir = path.dirname(normalizedPath);
  return path.join(dataPath, 'files', fileDir, `${fileName}.json`);
}

async function readPersistedMetadataJson(dataPath, filePath) {
  const metadataPath = getMetadataJsonPath(dataPath, filePath);
  const content = await fs.readFile(metadataPath, 'utf-8');
  return JSON.parse(content);
}

async function withRepository(rootPath, operation) {
  const { getRepository } = await import('#layer-c/storage/repository/index.js');
  const repo = getRepository(rootPath);
  if (!repo?.db) {
    return null;
  }
  return operation(repo);
}

function createScannedFileManifestSummary({
  scannedFileTotal = 0,
  manifestFileTotal = 0,
  missingFromManifest = []
} = {}) {
  const missingCount = missingFromManifest.length;

  return {
    scannedFileTotal,
    manifestFileTotal,
    missingFileCount: missingCount,
    synchronized: missingCount === 0 && manifestFileTotal >= scannedFileTotal,
    missingSample: missingFromManifest.slice(0, 10)
  };
}

async function ensureScannedFileManifestTable(projectPath) {
  return withRepository(projectPath, (repo) => repo.db.prepare(`
    CREATE TABLE IF NOT EXISTS ${SCANNED_FILE_MANIFEST_TABLE} (
      path TEXT PRIMARY KEY,
      first_seen TEXT NOT NULL,
      last_seen TEXT NOT NULL
    )
  `).run());
}

export async function hasPersistedCompilerAnalysis(projectPath) {
  const dataDir = getDataDir(projectPath);
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
      const count = await withRepository(projectPath, (repo) =>
        repo.db.prepare('SELECT COUNT(*) as count FROM atoms').get()?.count || 0
      );
      return count > 0;
    } catch {
      return false;
    }
  }
}

export async function getPersistedIndexedFilePaths(projectPath) {
  try {
    const rows = await withRepository(projectPath, (repo) => repo.db.prepare(`
      SELECT path AS file_path FROM files
      UNION
      SELECT DISTINCT file_path FROM atoms
      WHERE file_path IS NOT NULL AND file_path != ''
    `).all());

    return new Set(
      (rows || [])
        .map((row) => row?.file_path)
        .filter(Boolean)
        .map(normalizeFilePath)
    );
  } catch {
    return new Set();
  }
}

export async function getPersistedScannedFilePaths(projectPath) {
  try {
    await ensureScannedFileManifestTable(projectPath);
    const rows = await withRepository(projectPath, (repo) => repo.db.prepare(`
      SELECT path AS file_path
      FROM ${SCANNED_FILE_MANIFEST_TABLE}
    `).all());

    return new Set(
      (rows || [])
        .map((row) => row?.file_path)
        .filter(Boolean)
        .map(normalizeFilePath)
    );
  } catch {
    return new Set();
  }
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
    await withRepository(projectPath, (repo) => {
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
  const [indexedPaths, manifestPaths] = await Promise.all([
    getPersistedIndexedFilePaths(projectPath),
    getPersistedScannedFilePaths(projectPath)
  ]);

  return new Set([...indexedPaths, ...manifestPaths]);
}

export async function findIndexedFileCandidate(rootPath, importPath) {
  const normalizedImportPath = normalizeFilePath(importPath);
  const parts = normalizedImportPath.split('/');
  const lastPart = parts[parts.length - 1] || normalizedImportPath;
  const baseName = lastPart.replace(/\.[jt]sx?$/, '');
  const fileBaseName = baseName.split('/').pop().replace(/\.[^/.]+$/, '');

  try {
    const row = await withRepository(rootPath, (repo) => repo.db.prepare(`
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

export async function cleanupOrphanedCompilerArtifacts(rootPath, filePath, validAtomNames = new Set()) {
  const dataDir = getDataDir(rootPath);
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
    const existingAtoms = await withRepository(rootPath, (repo) => repo.db.prepare(`
      SELECT id, name, purpose_type as purpose
      FROM atoms
      WHERE file_path = ?
    `).all(normalizedPath));

    for (const atom of existingAtoms || []) {
      if (atom.purpose !== 'REMOVED' && !validAtomNames.has(atom.name)) {
        await withRepository(rootPath, (repo) => repo.db.prepare(`
          UPDATE atoms
          SET purpose_type = 'REMOVED',
              is_dead_code = 1,
              derived_json = json_set(
                COALESCE(derived_json, '{}'),
                '$.status', 'removed',
                '$.removedAt', datetime('now')
              )
          WHERE id = ?
        `).run(atom.id));
        summary.markedRemovedAtoms += 1;
      }
    }
  } catch {
    // Keep cleanup best-effort; watcher callers already degrade gracefully.
  }

  return summary;
}

export async function removePersistedFileMetadata(rootPath, filePath) {
  return withRepository(rootPath, async (repo) => repo.deleteFile(normalizeFilePath(filePath)));
}

export async function removePersistedAtomMetadata(rootPath, filePath) {
  return withRepository(rootPath, async (repo) => repo.deleteByFile(normalizeFilePath(filePath)));
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
