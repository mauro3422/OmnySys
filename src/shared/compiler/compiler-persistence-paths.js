import fs from 'fs/promises';
import { existsSync, statSync } from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { normalizeFilePath } from './path-normalization.js';
import { asNumber } from './core-utils.js';

const DATA_DIR = '.omnysysdata';
const HEALTH_HISTORY_DB = 'health-history.db';
const ATOM_HISTORY_DB = 'atom-history.db';
const SCANNED_FILE_MANIFEST_TABLE = 'compiler_scanned_files';

export function getCompilerDataDir(rootPath) {
  return path.join(rootPath, DATA_DIR);
}

export function getCompilerHistoryDir(rootPath) {
  return getCompilerDataDir(rootPath);
}

export function getCompilerHistoryDbPath(rootPath) {
  return path.join(getCompilerHistoryDir(rootPath), HEALTH_HISTORY_DB);
}

export function getAtomHistoryDbPath(rootPath) {
  return path.join(getCompilerHistoryDir(rootPath), ATOM_HISTORY_DB);
}

function buildStorageFileSummary(filePath, label) {
  const exists = existsSync(filePath);
  let sizeBytes = 0;
  let modifiedAt = null;

  if (exists) {
    try {
      const stats = statSync(filePath);
      sizeBytes = stats.size || 0;
      modifiedAt = stats.mtime instanceof Date ? stats.mtime.toISOString() : null;
    } catch {
      sizeBytes = 0;
      modifiedAt = null;
    }
  }

  return {
    label,
    path: filePath,
    exists,
    state: exists ? 'ready' : 'missing',
    sizeBytes,
    modifiedAt
  };
}

function summarizeArchiveSnapshotHealth(archivePath) {
  if (!existsSync(archivePath)) {
    return {
      snapshotCount: 0,
      latestSnapshotAt: null,
      latestSnapshotKind: null,
      freshestSnapshotState: 'missing',
      summaryText: 'archive missing'
    };
  }

  try {
    const db = new Database(archivePath, { readonly: true });
    const latestSnapshot = db.prepare(`
      SELECT snapshot_kind, captured_at
      FROM compiler_metrics_daily_snapshots
      WHERE captured_at IS NOT NULL
      ORDER BY captured_at DESC
      LIMIT 1
    `).get() || db.prepare(`
      SELECT snapshot_kind, captured_at
      FROM compiler_health_daily_snapshots
      WHERE captured_at IS NOT NULL
      ORDER BY captured_at DESC
      LIMIT 1
    `).get() || null;
    const snapshotCount = db.prepare(`
      SELECT COUNT(*) AS count
      FROM compiler_metrics_daily_snapshots
    `).get()?.count || 0;
    db.close();

    return {
      snapshotCount,
      latestSnapshotAt: latestSnapshot?.captured_at || null,
      latestSnapshotKind: latestSnapshot?.snapshot_kind || null,
      freshestSnapshotState: latestSnapshot ? 'fresh' : 'watching',
      summaryText: latestSnapshot
        ? `${snapshotCount} snapshots | latest=${latestSnapshot.snapshot_kind || 'unknown'}@${latestSnapshot.captured_at || 'n/a'}`
        : 'archive ready but empty'
    };
  } catch {
    return {
      snapshotCount: 0,
      latestSnapshotAt: null,
      latestSnapshotKind: null,
      freshestSnapshotState: 'watching',
      summaryText: 'archive present but unreadable'
    };
  }
}

function summarizeAtomHistoryHealth(archivePath) {
  if (!existsSync(archivePath)) {
    return {
      versionCount: 0,
      latestSnapshotAt: null,
      freshestSnapshotState: 'missing',
      summaryText: 'atom history missing'
    };
  }

  try {
    const db = new Database(archivePath, { readonly: true });
    const latestSnapshot = db.prepare(`
      SELECT captured_at
      FROM atom_versions_archive
      WHERE captured_at IS NOT NULL
      ORDER BY captured_at DESC
      LIMIT 1
    `).get() || null;
    const versionCount = db.prepare(`
      SELECT COUNT(*) AS count
      FROM atom_versions_archive
    `).get()?.count || 0;
    db.close();

    return {
      versionCount,
      latestSnapshotAt: latestSnapshot?.captured_at || null,
      freshestSnapshotState: latestSnapshot ? 'fresh' : 'watching',
      summaryText: latestSnapshot
        ? `${versionCount} versions | latest=${latestSnapshot.captured_at || 'n/a'}`
        : 'atom history ready but empty'
    };
  } catch {
    return {
      versionCount: 0,
      latestSnapshotAt: null,
      freshestSnapshotState: 'watching',
      summaryText: 'atom history present but unreadable'
    };
  }
}

function summarizeLineageReconciliation(projectPath, healthHistorySummary = null, atomHistorySummary = null) {
  const healthReady = healthHistorySummary?.state === 'ready' || healthHistorySummary?.archiveHealth?.freshestSnapshotState === 'fresh';
  const atomReady = atomHistorySummary?.state === 'ready' || atomHistorySummary?.archiveHealth?.freshestSnapshotState === 'fresh';
  const healthSnapshotCount = asNumber(healthHistorySummary?.archiveHealth?.snapshotCount, 0);
  const atomSnapshotCount = asNumber(atomHistorySummary?.archiveHealth?.versionCount, 0);
  const latestSnapshotAt = [healthHistorySummary?.latestSnapshotAt, atomHistorySummary?.latestSnapshotAt]
    .filter(Boolean)
    .sort()
    .at(-1) || null;

  const state = healthReady && atomReady
    ? 'reconcilable'
    : (healthReady || atomReady)
      ? 'watching'
      : 'missing';

  return {
    projectPath,
    state,
    healthy: state === 'reconcilable',
    trustworthy: state === 'reconcilable',
    healthReady,
    atomReady,
    healthSnapshotCount,
    atomSnapshotCount,
    latestSnapshotAt,
    summaryText: state === 'reconcilable'
      ? `lineage=reconcilable | health=${healthSnapshotCount} | atom=${atomSnapshotCount} | latest=${latestSnapshotAt || 'n/a'}`
      : state === 'watching'
        ? `lineage=watching | health=${healthSnapshotCount} | atom=${atomSnapshotCount} | latest=${latestSnapshotAt || 'n/a'}`
        : 'lineage=missing'
  };
}

export function buildCompilerHistoricalStorageSummary(rootPath = process.cwd()) {
  const projectPath = path.resolve(rootPath || process.cwd());
  const archiveDir = getCompilerHistoryDir(projectPath);
  const healthHistoryPath = getCompilerHistoryDbPath(projectPath);
  const atomHistoryPath = getAtomHistoryDbPath(projectPath);
  const healthStore = {
    ...buildStorageFileSummary(healthHistoryPath, 'health-history.db'),
    archiveHealth: summarizeArchiveSnapshotHealth(healthHistoryPath)
  };
  const atomStore = {
    ...buildStorageFileSummary(atomHistoryPath, 'atom-history.db'),
    archiveHealth: summarizeAtomHistoryHealth(atomHistoryPath)
  };
  const stores = [healthStore, atomStore];

  const readyStoreCount = stores.filter((store) => store.exists).length;
  const missingStoreCount = stores.length - readyStoreCount;
  const state = missingStoreCount === 0 ? 'ready' : readyStoreCount > 0 ? 'watching' : 'missing';
  const latestSnapshotAt = healthStore.archiveHealth?.latestSnapshotAt || atomStore.archiveHealth?.latestSnapshotAt || null;
  const freshestSnapshotState = healthStore.archiveHealth?.freshestSnapshotState || atomStore.archiveHealth?.freshestSnapshotState || (stores[0]?.exists ? 'watching' : 'missing');
  const lineageReconciliation = summarizeLineageReconciliation(projectPath, healthStore, atomStore);

  return {
    projectPath,
    archiveDir,
    totalStores: stores.length,
    readyStoreCount,
    missingStoreCount,
    state,
    latestSnapshotAt,
    freshestSnapshotState,
    lineageReconciliation,
    summaryText: `health=${healthStore.state || 'missing'}:${healthStore.archiveHealth?.freshestSnapshotState || 'n/a'} | atom=${atomStore.state || 'missing'}:${atomStore.archiveHealth?.freshestSnapshotState || 'n/a'} | ready=${readyStoreCount}/${stores.length} | ${lineageReconciliation.summaryText}`,
    stores
  };
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
