/**
 * @fileoverview Content Hash Cache - Sistema de cache de hashes persistente
 * 
 * Almacena hashes de contenido de archivos en SQLite para detectar
 * cambios reales vs modificaciones de timestamp.
 */

import path from 'path';
import { createHash } from 'crypto';
import { readFile, stat } from 'fs/promises';
import { getRepository } from '../repository/index.js';
import { BaseSqlRepository } from '#layer-c/storage/repository/core/BaseSqlRepository.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:HashCache');

let _hashRepo = null;

function getHashRepo(projectPath) {
  if (_hashRepo && _hashRepo.db) return _hashRepo;
  const repo = getRepository(projectPath);
  _hashRepo = new BaseSqlRepository(repo.db, 'HashCache');
  _hashRepo.ensureTable('file_hashes', `
    file_path TEXT PRIMARY KEY,
    content_hash TEXT NOT NULL,
    last_updated INTEGER NOT NULL,
    mtime_ms INTEGER,
    file_size INTEGER
  `);

  // Migracion: agregar columnas si no existen (para tablas pre-existentes)
  try {
    _hashRepo.db.exec(`ALTER TABLE file_hashes ADD COLUMN mtime_ms INTEGER`);
  } catch { /* Column may already exist */ }
  try {
    _hashRepo.db.exec(`ALTER TABLE file_hashes ADD COLUMN file_size INTEGER`);
  } catch { /* Column may already exist */ }

  return _hashRepo;
}

/**
 * Normaliza rutas a formato canonico para el hash cache.
 * - Siempre con slash (/)
 * - Preferentemente relativa al proyecto
 */
export function normalizeHashCachePath(filePath, projectPath) {
  if (typeof filePath !== 'string' || filePath.length === 0) return '';

  const normalizedProject = String(projectPath || '')
    .replace(/\\/g, '/')
    .replace(/\/+$/, '');

  let normalizedPath = filePath
    .replace(/\\/g, '/')
    .replace(/^[.]\//, '')
    .replace(/\/{2,}/g, '/');

  if (normalizedProject && normalizedPath.toLowerCase().startsWith(`${normalizedProject.toLowerCase()}/`)) {
    normalizedPath = normalizedPath.slice(normalizedProject.length + 1);
  }

  return normalizedPath.replace(/^[.]\//, '');
}

function isAbsoluteLikePath(filePath) {
  return /^[a-zA-Z]:\//.test(filePath) || filePath.startsWith('/');
}

function resolveProjectFilePath(projectPath, filePath) {
  if (typeof filePath !== 'string' || filePath.length === 0) return '';

  const normalizedPath = filePath.replace(/\\/g, '/').replace(/\/{2,}/g, '/');
  if (isAbsoluteLikePath(normalizedPath)) {
    return normalizedPath;
  }

  const normalizedProject = String(projectPath || '')
    .replace(/\\/g, '/')
    .replace(/\/+$/, '');

  if (!normalizedProject) {
    return normalizedPath.replace(/^\.\//, '');
  }

  return path.posix.join(normalizedProject, normalizedPath.replace(/^\.\//, ''));
}

/**
 * Calcula el hash SHA-256 del contenido de un archivo
 */
export async function calculateFileContentHash(filePath) {
  try {
    const content = await readFile(filePath, 'utf8');
    return createHash('sha256').update(content).digest('hex');
  } catch (error) {
    logger.warn(`[HashCache] Failed to calculate hash for ${filePath}: ${error.message}`);
    return null;
  }
}

/**
 * Calcula hash de forma síncrona (para contenido en memoria)
 */
export function calculateContentHash(content) {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Obtiene los hashes de archivos almacenados en SQLite
 */
export function getStoredHashes(projectPath) {
  try {
    const hr = getHashRepo(projectPath);
    const rows = hr.db.prepare('SELECT file_path, content_hash, mtime_ms, file_size FROM file_hashes').all();
    const hashes = {};

    for (const row of rows) {
      hashes[row.file_path] = {
        hash: row.content_hash,
        mtime_ms: row.mtime_ms || null,
        file_size: row.file_size || null
      };
    }

    return hashes;
  } catch (error) {
    logger.warn(`[HashCache] Failed to get stored hashes: ${error.message}`);
    return {};
  }
}

/**
 * Guarda hashes de archivos en SQLite (bulk insert)
 * @param {string} projectPath 
 * @param {Array<{filePath: string, hash: string, mtime_ms?: number, file_size?: number}>} fileHashes - Array de objetos con filePath, hash, y opcionalmente mtime_ms y file_size
 */
export function saveHashes(projectPath, fileHashes) {
  try {
    const hr = getHashRepo(projectPath);
    const db = hr.db;

    const now = Date.now();
    const insert = db.prepare(`
      INSERT OR REPLACE INTO file_hashes (file_path, content_hash, last_updated, mtime_ms, file_size)
      VALUES (?, ?, ?, ?, ?)
    `);

    // Bulk insert en transacción
    const transaction = db.transaction((entries) => {
      for (const entry of entries) {
        const filePath = entry.filePath || entry[0];
        const hash = entry.hash || entry[1];
        const mtime = entry.mtime_ms ?? entry[2] ?? null;
        const size = entry.file_size ?? entry[3] ?? null;
        insert.run(filePath, hash, now, mtime, size);
      }
    });

    // Soporta tanto array de objetos como Map entries
    const entries = Array.isArray(fileHashes) 
      ? fileHashes 
      : Object.entries(fileHashes).map(([k, v]) => typeof v === 'object' ? { filePath: k, ...v } : { filePath: k, hash: v });
    
    transaction(entries);

    logger.debug(`[HashCache] Saved ${entries.length} hashes`);
  } catch (error) {
    logger.warn(`[HashCache] Failed to save hashes: ${error.message}`);
  }
}

/**
 * Siembra el baseline persistente de hashes al terminar un reindex completo.
 * Esto deja la siguiente corrida caliente con una baseline real aunque no haya
 * existido una tabla `file_hashes` previa.
 */
export async function seedHashBaseline(projectPath, currentFiles, verbose = false) {
  const timer = verbose ? Date.now() : 0;

  try {
    if (!Array.isArray(currentFiles) || currentFiles.length === 0) {
      return { seeded: 0, skipped: true };
    }

    const resolvedFiles = currentFiles
      .map((entry) => {
        if (typeof entry === 'string') {
          return resolveProjectFilePath(projectPath, entry);
        }

        if (entry && typeof entry === 'object') {
          return resolveProjectFilePath(projectPath, entry.fullPath || entry.path || entry.filePath || '');
        }

        return '';
      })
      .filter(Boolean);

    if (resolvedFiles.length === 0) {
      return { seeded: 0, skipped: true };
    }

    const newHashes = await collectCurrentHashes(
      projectPath,
      resolvedFiles,
      {},
      {
        newFiles: [],
        modifiedFiles: [],
        unchangedFiles: [],
        deletedFiles: []
      }
    );

    saveHashes(projectPath, newHashes);

    if (verbose) {
      logger.info(`[HashCache] Seeded baseline for ${Object.keys(newHashes).length} file(s) (${Date.now() - timer}ms)`);
    }

    return { seeded: Object.keys(newHashes).length, skipped: false };
  } catch (error) {
    logger.warn(`[HashCache] Failed to seed baseline: ${error.message}`);
    return { seeded: 0, skipped: true, error: error.message };
  }
}

/**
 * Elimina hashes de archivos del cache
 */
export function deleteHashes(projectPath, filePaths) {
  try {
    if (!Array.isArray(filePaths) || filePaths.length === 0) return;

    const hr = getHashRepo(projectPath);
    const db = hr.db;

    const transaction = db.transaction((paths) => {
      for (const filePath of paths) {
        hr.delete('file_hashes', 'file_path', filePath);
      }
    });

    transaction(filePaths);
    logger.debug(`[HashCache] Removed ${filePaths.length} stale hashes`);
  } catch (error) {
    logger.warn(`[HashCache] Failed to delete hashes: ${error.message}`);
  }
}

function collectStoredHashState(projectPath) {
  const storedHashesRaw = getStoredHashes(projectPath);
  const storedHashes = {};
  const storedMeta = {}; // mtime y size por archivo
  const staleStoredKeys = [];

  for (const [storedPath, entry] of Object.entries(storedHashesRaw)) {
    const normalizedStoredPath = normalizeHashCachePath(storedPath, projectPath);
    if (!normalizedStoredPath) {
      staleStoredKeys.push(storedPath);
      continue;
    }

    if (isAbsoluteLikePath(normalizedStoredPath)) {
      staleStoredKeys.push(storedPath);
      continue;
    }

    if (normalizedStoredPath !== storedPath) {
      staleStoredKeys.push(storedPath);
    }

    if (!storedHashes[normalizedStoredPath]) {
      storedHashes[normalizedStoredPath] = entry.hash || entry;
      storedMeta[normalizedStoredPath] = {
        mtime_ms: entry.mtime_ms || null,
        file_size: entry.file_size || null
      };
    }
  }

  return { storedHashes, storedMeta, staleStoredKeys };
}

function buildInitialChangeSet(storedHashes, currentFiles, projectPath) {
  const normalizedCurrentFiles = currentFiles
    .map((filePath) => normalizeHashCachePath(filePath, projectPath))
    .filter(Boolean);

  const currentFileSet = new Set(normalizedCurrentFiles);
  const deletedFiles = Object.keys(storedHashes).filter((filePath) => !currentFileSet.has(filePath));

  return {
    changes: createEmptyChangeSet(deletedFiles),
    deletedFiles
  };
}

function createEmptyChangeSet(deletedFiles = []) {
  return {
    newFiles: [],
    modifiedFiles: [],
    unchangedFiles: [],
    deletedFiles: Array.isArray(deletedFiles) ? [...deletedFiles] : []
  };
}

async function collectCurrentHashes(projectPath, currentFiles, storedHashes, storedMeta, changes = createEmptyChangeSet()) {
  const safeChanges = changes || createEmptyChangeSet();

  try {
    const newHashes = {};
    const batchSize = 50;

    for (let i = 0; i < currentFiles.length; i += batchSize) {
      const batch = currentFiles.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (filePath) => {
          const normalizedPath = normalizeHashCachePath(filePath, projectPath);
          if (!normalizedPath) return;

          // Fast path: check mtime+size first
          const meta = storedMeta[normalizedPath];
          if (meta && meta.mtime_ms !== null && meta.file_size !== null) {
            try {
              const fileStat = await stat(filePath);
              const currentMtime = fileStat.mtimeMs;
              const currentSize = fileStat.size;

              // If mtime and size unchanged, skip hash calculation
              if (Math.abs(currentMtime - meta.mtime_ms) < 1 && currentSize === meta.file_size) {
                safeChanges.unchangedFiles.push(normalizedPath);
                newHashes[normalizedPath] = {
                  hash: storedHashes[normalizedPath],
                  mtime_ms: Math.round(currentMtime),
                  file_size: currentSize
                };
                return;
              }
            } catch {
              // stat failed, fall through to hash calculation
            }
          }

          // Slow path: calculate hash
          const currentHash = await calculateFileContentHash(filePath);
          if (!currentHash) return;

          newHashes[normalizedPath] = {
            hash: currentHash,
            mtime_ms: null,
            file_size: null
          };

          if (!storedHashes[normalizedPath]) {
            safeChanges.newFiles.push(normalizedPath);
          } else if (storedHashes[normalizedPath] !== currentHash) {
            safeChanges.modifiedFiles.push(normalizedPath);
          } else {
            safeChanges.unchangedFiles.push(normalizedPath);
          }

          // Try to get stat for metadata if we haven't already
          if (!newHashes[normalizedPath].mtime_ms) {
            try {
              const fileStat = await stat(filePath);
              newHashes[normalizedPath].mtime_ms = Math.round(fileStat.mtimeMs);
              newHashes[normalizedPath].file_size = fileStat.size;
            } catch {
              // Ignore stat failures
            }
          }
        })
      );
    }

    return newHashes;
  } catch (error) {
    logger.warn(`[HashCache] Failed to collect current hashes: ${error.message}`);
    return {};
  }
}

function cleanupStaleHashEntries(projectPath, staleStoredKeys, deletedFiles) {
  const staleKeysToDelete = [
    ...staleStoredKeys,
    ...deletedFiles
  ];

  if (staleKeysToDelete.length > 0) {
    deleteHashes(projectPath, [...new Set(staleKeysToDelete)]);
  }
}

/**
 * Detecta cambios reales comparando hashes con fast path via mtime+size
 */
export async function detectRealChanges(projectPath, currentFiles, verbose = false) {
  const timer = verbose ? Date.now() : 0;

  try {
    const { storedHashes, storedMeta, staleStoredKeys } = collectStoredHashState(projectPath);
    const baselineMissing = Object.keys(storedHashes).length === 0 && Array.isArray(currentFiles) && currentFiles.length > 0;
    const { changes, deletedFiles } = buildInitialChangeSet(storedHashes, currentFiles, projectPath);
    const newHashes = await collectCurrentHashes(projectPath, currentFiles, storedHashes, storedMeta, changes);

    saveHashes(projectPath, newHashes);
    cleanupStaleHashEntries(projectPath, staleStoredKeys, deletedFiles);

    if (baselineMissing) {
      changes.newFiles = [];
      changes.modifiedFiles = [];
      changes.unchangedFiles = currentFiles
        .map((filePath) => normalizeHashCachePath(filePath, projectPath))
        .filter(Boolean);
      changes.deletedFiles = [];
    }

    if (verbose) {
      const duration = Date.now() - timer;
      logger.info(`[HashCache] Change detection: ${changes.newFiles.length} new, ${changes.modifiedFiles.length} modified, ${changes.unchangedFiles.length} unchanged, ${changes.deletedFiles.length} deleted (${duration}ms)`);
    }

    return changes;
  } catch (error) {
    logger.warn(`[HashCache] Failed during change detection: ${error.message}`);
    return {
      newFiles: [],
      modifiedFiles: [],
      unchangedFiles: [],
      deletedFiles: []
    };
  }
}
