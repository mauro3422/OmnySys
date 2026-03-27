import { normalizeFilePath } from './path-normalization.js';
import {
  SCANNED_FILE_MANIFEST_TABLE,
  createScannedFileManifestSummary,
  ensureScannedFileManifestTable,
  loadPersistedScannedFilePaths as loadPersistedScannedFilePathsFromStore,
  withCompilerRepository
} from './compiler-persistence-paths.js';

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
