import fs from 'fs/promises';
import path from 'path';
import { normalizeFilePath } from './path-normalization.js';

const DATA_DIR = '.omnysysdata';
const SCANNED_FILE_MANIFEST_TABLE = 'compiler_scanned_files';

export function getCompilerDataDir(rootPath) {
  return path.join(rootPath, DATA_DIR);
}

export function getMetadataJsonPath(dataPath, filePath) {
  const normalizedPath = normalizeFilePath(filePath);
  const fileName = path.basename(normalizedPath);
  const fileDir = path.dirname(normalizedPath);
  return path.join(dataPath, 'files', fileDir, `${fileName}.json`);
}

export async function readPersistedMetadataJson(dataPath, filePath) {
  const metadataPath = getMetadataJsonPath(dataPath, filePath);
  const content = await fs.readFile(metadataPath, 'utf-8');
  return JSON.parse(content);
}

export async function withCompilerRepository(rootPath, operation) {
  const { getRepository } = await import('#layer-c/storage/repository/index.js');
  const repo = getRepository(rootPath);
  if (!repo?.db) {
    return null;
  }
  return operation(repo);
}

export function createScannedFileManifestSummary({
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

export async function ensureScannedFileManifestTable(projectPath) {
  return withCompilerRepository(projectPath, (repo) => repo.db.prepare(`
    CREATE TABLE IF NOT EXISTS ${SCANNED_FILE_MANIFEST_TABLE} (
      path TEXT PRIMARY KEY,
      first_seen TEXT NOT NULL,
      last_seen TEXT NOT NULL
    )
  `).run());
}

export async function loadPersistedIndexedFilePaths(projectPath) {
  try {
    const rows = await withCompilerRepository(projectPath, (repo) => repo.db.prepare(`
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

export async function loadPersistedScannedFilePaths(projectPath) {
  try {
    await ensureScannedFileManifestTable(projectPath);
    const rows = await withCompilerRepository(projectPath, (repo) => repo.db.prepare(`
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

export async function loadPersistedCompilerPathSets(projectPath) {
  try {
    const [indexedPaths, manifestPaths] = await Promise.all([
      loadPersistedIndexedFilePaths(projectPath),
      loadPersistedScannedFilePaths(projectPath)
    ]);

    return { indexedPaths, manifestPaths };
  } catch {
    return {
      indexedPaths: new Set(),
      manifestPaths: new Set()
    };
  }
}

export { SCANNED_FILE_MANIFEST_TABLE };
